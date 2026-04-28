import "server-only";

import {
  buildCaseTaxonomyClassificationSystemPrompt,
  buildCaseTaxonomyClassificationUserPrompt,
  CASE_TAXONOMY_CLASSIFICATION_PROMPT_VERSION
} from "@/features/ai/prompts/case-taxonomy-classification-prompt";
import { generateStructuredAnthropicResponse } from "@/features/ai/clients/anthropic-client";
import {
  caseTaxonomyClassificationSchema,
  type PersistedCaseTaxonomySuggestion
} from "@/features/cases/lib/case-taxonomy-classification-schema";
import { getCaseById } from "@/features/cases/queries/get-cases";
import { extractStructuredDocumentAnalysis } from "@/features/document-ingestion/lib/document-analysis-helpers";
import { isPreAnalysisEligibleDocumentType } from "@/features/document-ingestion/lib/eligible-documents";
import { createClient } from "@/lib/supabase/server";
import type { DocumentIngestion, Profile, Taxonomy } from "@/types/database";

const MAX_SNIPPET_CHARS = 1200;
const MAX_CONTEXT_CHARS = 22000;

function extractJsonPayload(text: string) {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("A resposta da IA nao trouxe JSON valido para a classificacao.");
  }

  return trimmed.slice(start, end + 1);
}

function truncateText(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, maxChars)}\n[trecho truncado]`;
}

function normalizeCode(value: string | null) {
  return value?.trim().toUpperCase() ?? null;
}

function buildClassificationContext({
  caseItem,
  taxonomies,
  ingestions
}: {
  caseItem: NonNullable<Awaited<ReturnType<typeof getCaseById>>>;
  taxonomies: Taxonomy[];
  ingestions: DocumentIngestion[];
}) {
  const entity = caseItem.entity_links[0]?.entity;
  const relevantDocuments = caseItem.documents.filter(
    (document) =>
      isPreAnalysisEligibleDocumentType(document.document_type) ||
      document.stage === "initial" ||
      document.stage === "pre_analysis"
  );
  const processedDocuments = relevantDocuments
    .map((document) => ({
      document,
      ingestion: ingestions.find((item) => item.case_document_id === document.id) ?? null
    }))
    .filter((item) => item.ingestion?.status === "processed");

  const analysisBlocks = processedDocuments
    .map(({ document, ingestion }) => {
      if (!ingestion) {
        return null;
      }

      const structured = extractStructuredDocumentAnalysis(ingestion.metadata);
      const lines = [
        `Documento: ${document.file_name ?? document.document_type}`,
        `Tipo: ${document.document_type}`,
        `Etapa: ${document.stage}`,
        `Resumo livre: ${structured?.summary ?? "nao disponivel"}`,
        `Tipo inferido: ${structured?.inferred_document_kind ?? "nao disponivel"}`,
        `Achados: ${structured?.key_findings.map((finding) => finding.title).join("; ") || "nao disponiveis"}`,
        `Implicacoes defensivas: ${structured?.defensive_implications.join("; ") || "nao disponiveis"}`
      ];

      if (ingestion.extracted_text) {
        lines.push(`Trecho textual:\n${truncateText(ingestion.extracted_text, MAX_SNIPPET_CHARS)}`);
      }

      return lines.join("\n");
    })
    .filter((item): item is string => Boolean(item));

  const rawInventory = relevantDocuments.map((document) => {
    const ingestion = ingestions.find((item) => item.case_document_id === document.id) ?? null;
    return `- ${document.file_name ?? document.document_type} | tipo=${document.document_type} | etapa=${document.stage} | status=${ingestion?.status ?? "pending"}`;
  });

  const context = [
    `[Dados cadastrais]`,
    `Carteira: ${caseItem.portfolio?.name ?? "nao informada"}`,
    `Titulo: ${caseItem.title ?? "nao informado"}`,
    `Numero: ${caseItem.case_number ?? "nao informado"}`,
    `Descricao: ${caseItem.description ?? "nao informada"}`,
    `Taxonomia atual: ${caseItem.taxonomy ? `${caseItem.taxonomy.code} - ${caseItem.taxonomy.name}` : "nao definida"}`,
    `Empresa representada: ${entity?.name ?? "nao vinculada"}`,
    "",
    `[Partes]`,
    ...caseItem.parties.map((party) => `- ${party.role}: ${party.name}${party.document ? ` (${party.document})` : ""}`),
    "",
    `[Inventario documental relevante]`,
    ...(rawInventory.length > 0 ? rawInventory : ["Nenhum documento relevante encontrado."]),
    "",
    `[Documentos processados com maior valor para classificar o caso]`,
    ...(analysisBlocks.length > 0 ? analysisBlocks : ["Nao ha documentos processados com texto estruturado disponivel."]),
    "",
    `[Orientacao]`,
    `A taxonomia deve refletir o enquadramento operacional mais util entre ${taxonomies.length} opcoes ativas.`
  ].join("\n");

  return {
    context: truncateText(context, MAX_CONTEXT_CHARS),
    sourceSummary: {
      total_documents: relevantDocuments.length,
      processed_documents: processedDocuments.length,
      analyzed_documents: analysisBlocks.length
    }
  };
}

export async function generateCaseTaxonomySuggestion(caseId: string, profile: Profile) {
  const supabase = await createClient();
  const [caseItem, ingestionsResult] = await Promise.all([
    getCaseById(caseId),
    supabase.from("AA_document_ingestions").select("*").returns<DocumentIngestion[]>()
  ]);

  if (!caseItem || caseItem.office_id !== profile.office_id) {
    throw new Error("Processo nao encontrado.");
  }

  const { data: taxonomiesData } = await supabase
    .from("AA_taxonomies")
    .select("*")
    .eq("is_active", true)
    .eq("portfolio_id", caseItem.portfolio_id)
    .order("code", { ascending: true })
    .returns<Taxonomy[]>();

  const taxonomies = taxonomiesData ?? [];
  if (taxonomies.length === 0) {
    throw new Error("Nao ha taxonomias ativas para classificar este processo.");
  }

  const ingestions = (ingestionsResult.data ?? []).filter((item) =>
    caseItem.documents.some((document) => document.id === item.case_document_id)
  );
  const { context, sourceSummary } = buildClassificationContext({
    caseItem,
    taxonomies,
    ingestions
  });

  const response = await generateStructuredAnthropicResponse({
    systemPrompt: buildCaseTaxonomyClassificationSystemPrompt(),
    userPrompt: buildCaseTaxonomyClassificationUserPrompt({
      taxonomies,
      context
    }),
    maxTokens: 1400
  });

  const parsedJson = JSON.parse(extractJsonPayload(response.text));
  const classification = caseTaxonomyClassificationSchema.parse(parsedJson);
  const normalizedCode = normalizeCode(classification.recommended_taxonomy_code);
  const recommendedTaxonomy = normalizedCode
    ? taxonomies.find((taxonomy) => normalizeCode(taxonomy.code) === normalizedCode) ?? null
    : null;

  const normalizedAlternativeCodes = classification.alternative_taxonomy_codes
    .map((code) => normalizeCode(code))
    .filter((code): code is string => Boolean(code))
    .filter((code, index, array) => array.indexOf(code) === index)
    .filter((code) => taxonomies.some((taxonomy) => normalizeCode(taxonomy.code) === code))
    .filter((code) => code !== normalizedCode)
    .slice(0, 3);

  const suggestion: PersistedCaseTaxonomySuggestion = {
    prompt_version: CASE_TAXONOMY_CLASSIFICATION_PROMPT_VERSION,
    model_name: response.modelName,
    generated_at: new Date().toISOString(),
    generated_by: profile.id,
    usage: response.usage,
    source_summary: sourceSummary,
    recommendation: {
      taxonomy_id: recommendedTaxonomy?.id ?? null,
      taxonomy_code: recommendedTaxonomy?.code ?? null,
      taxonomy_name: recommendedTaxonomy?.name ?? null,
      confidence: classification.confidence,
      summary: classification.summary,
      rationale: classification.rationale,
      matched_signals: classification.matched_signals,
      missing_signals: classification.missing_signals,
      alternative_taxonomy_codes: normalizedAlternativeCodes,
      documents_considered: classification.documents_considered,
      cautionary_notes: classification.cautionary_notes
    },
    application: null
  };

  return suggestion;
}
