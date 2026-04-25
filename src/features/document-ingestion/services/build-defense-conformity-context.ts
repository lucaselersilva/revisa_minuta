import { normalizePreAnalysisReportPayload } from "@/features/ai/types/pre-analysis-report";
import { extractStructuredDocumentAnalysis } from "@/features/document-ingestion/lib/document-analysis-helpers";
import {
  defenseConformityDefenseDocumentTypes,
  defenseConformityInitialDocumentTypes
} from "@/features/document-ingestion/lib/eligible-documents";
import { getCaseById } from "@/features/cases/queries/get-cases";
import { getPreAnalysisSnapshot } from "@/features/document-ingestion/queries/get-pre-analysis-snapshot";
import { createClient } from "@/lib/supabase/server";
import type { DocumentIngestion } from "@/types/database";

const MAX_CONTEXT_CHARS = 70000;
const MAX_CHARS_PER_DOCUMENT = 18000;

function truncateText(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, maxChars)}\n\n[texto truncado para caber no contexto]`;
}

export type DefenseConformityContext = {
  caseId: string;
  inputSummary: Record<string, unknown>;
  promptContext: string;
  metrics: {
    initialProcessedCount: number;
    defenseProcessedCount: number;
    totalCharacters: number;
  };
};

export async function buildDefenseConformityContext(caseId: string): Promise<DefenseConformityContext | null> {
  const supabase = await createClient();
  const [caseItem, ingestionsResult, preAnalysisSnapshot] = await Promise.all([
    getCaseById(caseId),
    supabase.from("AA_document_ingestions").select("*").returns<DocumentIngestion[]>(),
    getPreAnalysisSnapshot(caseId)
  ]);

  if (!caseItem) {
    return null;
  }

  const ingestions = (ingestionsResult.data ?? []).filter((item) =>
    caseItem.documents.some((document) => document.id === item.case_document_id)
  );
  const initialDocuments = caseItem.documents.filter((document) =>
    defenseConformityInitialDocumentTypes.includes(document.document_type)
  );
  const defenseDocuments = caseItem.documents.filter((document) =>
    defenseConformityDefenseDocumentTypes.includes(document.document_type)
  );

  const initialProcessed = initialDocuments
    .map((document) => ({
      document,
      ingestion: ingestions.find((ingestion) => ingestion.case_document_id === document.id) ?? null
    }))
    .filter((item) => item.ingestion?.status === "processed" && item.ingestion.extracted_text);

  const defenseProcessed = defenseDocuments
    .map((document) => ({
      document,
      ingestion: ingestions.find((ingestion) => ingestion.case_document_id === document.id) ?? null
    }))
    .filter((item) => item.ingestion?.status === "processed" && item.ingestion.extracted_text);

  let totalCharacters = 0;

  function buildDocumentInventory(items: typeof initialDocuments) {
    return items.map((document) => {
      const ingestion = ingestions.find((item) => item.case_document_id === document.id) ?? null;
      const analysis = ingestion ? extractStructuredDocumentAnalysis(ingestion.metadata) : null;

      return [
        `- ID: ${document.id}`,
        `- Nome: ${document.file_name ?? document.document_type}`,
        `  Tipo: ${document.document_type}`,
        `  Etapa documental: ${document.stage}`,
        `  Mime: ${document.mime_type ?? "nao informado"}`,
        `  Status da ingestao: ${ingestion?.status ?? "pending"}`,
        `  Parser aplicado: ${ingestion?.parser_type ?? "nao processado"}`,
        `  Texto extraido: ${ingestion?.extracted_text_length ?? 0} caracteres`,
        `  Analise estruturada: ${analysis ? analysis.inferred_document_kind : "nao disponivel"}`
      ].join("\n");
    });
  }

  function buildDocumentBlocks(
    items: Array<{
      document: (typeof initialProcessed)[number]["document"];
      ingestion: NonNullable<(typeof initialProcessed)[number]["ingestion"]>;
    }>
  ) {
    const blocks: string[] = [];

    for (const item of items) {
      const remainingChars = MAX_CONTEXT_CHARS - totalCharacters;
      if (remainingChars <= 0) {
        break;
      }

      const truncatedText = truncateText(item.ingestion.extracted_text ?? "", Math.min(MAX_CHARS_PER_DOCUMENT, remainingChars));
      totalCharacters += truncatedText.length;

      blocks.push(
        [
          `Documento ID: ${item.document.id}`,
          `Documento: ${item.document.file_name ?? item.document.document_type}`,
          `Tipo: ${item.document.document_type}`,
          `Etapa documental: ${item.document.stage}`,
          `Mime: ${item.document.mime_type ?? "nao informado"}`,
          "Conteudo:",
          truncatedText
        ].join("\n")
      );
    }

    return blocks;
  }

  const latestCompletedReport = preAnalysisSnapshot?.latestCompletedReport?.report_json
    ? normalizePreAnalysisReportPayload(preAnalysisSnapshot.latestCompletedReport.report_json)
    : null;
  const entity = caseItem.entity_links[0]?.entity;
  const inputSummary = {
    case_id: caseItem.id,
    case_number: caseItem.case_number,
    title: caseItem.title,
    represented_entity: entity?.name ?? null,
    initial_documents: initialDocuments.length,
    defense_documents: defenseDocuments.length,
    initial_processed_documents: initialProcessed.length,
    defense_processed_documents: defenseProcessed.length,
    total_characters: totalCharacters,
    has_pre_analysis_report: Boolean(latestCompletedReport)
  };

  return {
    caseId,
    inputSummary,
    promptContext: [
      "[Escopo da etapa]",
      "Trata-se de relatorio de conformidade da defesa, apos a juntada da contestacao.",
      "O objetivo e confrontar peticao inicial, eventual emenda, documentos do autor, laudo previo e contestacao.",
      "",
      "[Metadados do processo]",
      `Titulo: ${caseItem.title ?? "nao informado"}`,
      `Numero: ${caseItem.case_number ?? "nao informado"}`,
      `Descricao: ${caseItem.description ?? "nao informada"}`,
      `Empresa representada: ${entity?.name ?? "nao vinculada"}`,
      `Responsavel: ${caseItem.responsible_lawyer?.full_name ?? "nao definido"}`,
      "",
      "[Partes]",
      ...caseItem.parties.map((party) => `- ${party.role}: ${party.name}${party.document ? ` (${party.document})` : ""}`),
      "",
      "[Inventario documental do autor]",
      ...buildDocumentInventory(initialDocuments),
      "",
      "[Inventario documental da defesa]",
      ...buildDocumentInventory(defenseDocuments),
      "",
      "[Laudo previo da fase inicial]",
      latestCompletedReport ? JSON.stringify(latestCompletedReport, null, 2) : "Nenhum laudo previo concluido disponivel.",
      "",
      "[Documentos da fase inicial e emenda]",
      ...buildDocumentBlocks(initialProcessed as Array<{ document: (typeof initialProcessed)[number]["document"]; ingestion: NonNullable<(typeof initialProcessed)[number]["ingestion"]> }>),
      "",
      "[Documentos da defesa]",
      ...buildDocumentBlocks(defenseProcessed as Array<{ document: (typeof defenseProcessed)[number]["document"]; ingestion: NonNullable<(typeof defenseProcessed)[number]["ingestion"]> }>),
      "",
      "[Orientacao de rastreabilidade]",
      "Ao citar um documento, prefira o nome do arquivo e, quando disponivel, o Documento ID.",
      "Se houver emenda inicial, trate fatos novos e pedidos novos como itens autonomos de confronto."
    ].join("\n"),
    metrics: {
      initialProcessedCount: initialProcessed.length,
      defenseProcessedCount: defenseProcessed.length,
      totalCharacters
    }
  };
}
