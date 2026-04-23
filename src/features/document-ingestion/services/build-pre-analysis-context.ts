import { getCaseById } from "@/features/cases/queries/get-cases";
import { isPreAnalysisEligibleDocumentType } from "@/features/document-ingestion/lib/eligible-documents";
import type { PreAnalysisContext } from "@/features/document-ingestion/types";
import { createClient } from "@/lib/supabase/server";
import type { DocumentIngestion } from "@/types/database";

const MAX_CONTEXT_CHARS = 60000;
const MAX_CHARS_PER_DOCUMENT = 18000;

function truncateText(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, maxChars)}\n\n[texto truncado para caber no contexto]`;
}

export async function buildPreAnalysisContext(caseId: string): Promise<PreAnalysisContext | null> {
  const supabase = await createClient();
  const [caseItem, ingestionsResult] = await Promise.all([
    getCaseById(caseId),
    supabase
      .from("AA_document_ingestions")
      .select("*")
      .returns<DocumentIngestion[]>()
  ]);

  if (!caseItem) {
    return null;
  }

  const ingestions = (ingestionsResult.data ?? []).filter((item) =>
    caseItem.documents.some((document) => document.id === item.case_document_id)
  );

  const eligibleDocuments = caseItem.documents.filter((document) =>
    isPreAnalysisEligibleDocumentType(document.document_type)
  );
  const processedDocuments = eligibleDocuments
    .map((document) => ({
      document,
      ingestion: ingestions.find((ingestion) => ingestion.case_document_id === document.id) ?? null
    }))
    .filter((item) => item.ingestion?.status === "processed" && item.ingestion.extracted_text);

  let totalCharacters = 0;
  const documentBlocks: string[] = [];

  for (const item of processedDocuments) {
    if (!item.ingestion?.extracted_text) {
      continue;
    }

    const remainingChars = MAX_CONTEXT_CHARS - totalCharacters;
    if (remainingChars <= 0) {
      break;
    }

    const truncatedText = truncateText(item.ingestion.extracted_text, Math.min(MAX_CHARS_PER_DOCUMENT, remainingChars));
    totalCharacters += truncatedText.length;
    documentBlocks.push(
      [
        `Documento: ${item.document.file_name ?? item.document.document_type}`,
        `Tipo: ${item.document.document_type}`,
        `Mime: ${item.document.mime_type ?? "nao informado"}`,
        "Conteudo:",
        truncatedText
      ].join("\n")
    );
  }

  const entity = caseItem.entity_links[0]?.entity;
  const inputSummary = {
    case_id: caseItem.id,
    case_number: caseItem.case_number,
    title: caseItem.title,
    taxonomy: caseItem.taxonomy ? `${caseItem.taxonomy.code} - ${caseItem.taxonomy.name}` : null,
    responsible_lawyer: caseItem.responsible_lawyer?.full_name ?? null,
    represented_entity: entity?.name ?? null,
    eligible_documents: eligibleDocuments.length,
    processed_documents: processedDocuments.length,
    unsupported_documents: ingestions.filter((item) => item.status === "unsupported").length,
    empty_text_documents: ingestions.filter((item) => item.status === "empty_text").length,
    total_characters: totalCharacters
  };

  return {
    caseId,
    inputSummary,
    promptContext: [
      "[Metadados do processo]",
      `Titulo: ${caseItem.title ?? "nao informado"}`,
      `Numero: ${caseItem.case_number ?? "nao informado"}`,
      `Descricao: ${caseItem.description ?? "nao informada"}`,
      `Taxonomia: ${caseItem.taxonomy ? `${caseItem.taxonomy.code} - ${caseItem.taxonomy.name}` : "nao definida"}`,
      `Empresa representada: ${entity?.name ?? "nao vinculada"}`,
      "",
      "[Partes]",
      ...caseItem.parties.map((party) => `- ${party.role}: ${party.name}${party.document ? ` (${party.document})` : ""}`),
      "",
      "[Documentos da fase inicial]",
      ...documentBlocks
    ].join("\n"),
    metrics: {
      eligibleCount: eligibleDocuments.length,
      processedCount: processedDocuments.length,
      unsupportedCount: ingestions.filter((item) => item.status === "unsupported").length,
      emptyTextCount: ingestions.filter((item) => item.status === "empty_text").length,
      totalCharacters
    }
  };
}
