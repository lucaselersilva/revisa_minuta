import { extractStructuredDocumentAnalysis } from "@/features/document-ingestion/lib/document-analysis-helpers";
import { getCaseById } from "@/features/cases/queries/get-cases";
import { isPreAnalysisEligibleDocumentType } from "@/features/document-ingestion/lib/eligible-documents";
import { buildPromptProfileContextLines, buildPromptTrace, getPortfolioStaticGuidance } from "@/features/legal-config/lib/prompt-guidance";
import { getActiveLegalConfigurationForPortfolio, resolvePromptProfile } from "@/features/legal-config/queries/get-legal-config";
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
  const caseItem = await getCaseById(caseId);

  if (!caseItem) {
    return null;
  }

  const [ingestionsResult, legalConfig] = await Promise.all([
    supabase
      .from("AA_document_ingestions")
      .select("*")
      .returns<DocumentIngestion[]>(),
    getActiveLegalConfigurationForPortfolio(caseItem.portfolio_id, caseItem.taxonomy_id)
  ]);

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
  const documentInventory = eligibleDocuments.map((document) => {
    const ingestion = ingestions.find((item) => item.case_document_id === document.id) ?? null;
    const documentAnalysis = ingestion ? extractStructuredDocumentAnalysis(ingestion.metadata) : null;
    return [
      `- ID: ${document.id}`,
      `- Nome: ${document.file_name ?? document.document_type}`,
      `  Tipo: ${document.document_type}`,
      `  Etapa documental: ${document.stage}`,
      `  Mime: ${document.mime_type ?? "nao informado"}`,
      `  Status da ingestao: ${ingestion?.status ?? "pending"}`,
      `  Parser aplicado: ${ingestion?.parser_type ?? "nao processado"}`,
      `  Texto extraido: ${ingestion?.extracted_text_length ?? 0} caracteres`,
      `  Analise estruturada: ${documentAnalysis ? documentAnalysis.inferred_document_kind : "nao disponivel"}`
    ].join("\n");
  });
  const documentAnalysisBlocks = processedDocuments
    .map((item) => {
      if (!item.ingestion) {
        return null;
      }

      const documentAnalysis = extractStructuredDocumentAnalysis(item.ingestion.metadata);
      if (!documentAnalysis) {
        return null;
      }

      return [
        `Documento ID: ${item.document.id}`,
        `Documento: ${item.document.file_name ?? item.document.document_type}`,
        `Tipo inferido: ${documentAnalysis.inferred_document_kind}`,
        `Resumo: ${documentAnalysis.summary}`,
        `Participantes: ${documentAnalysis.participants.join(", ") || "nao identificados"}`,
        `Datas: ${documentAnalysis.dates.join(", ") || "nao identificadas"}`,
        `Valores: ${documentAnalysis.monetary_values.join(", ") || "nao identificados"}`,
        "Achados relevantes:",
        ...documentAnalysis.key_findings.map(
          (finding) => `- ${finding.title} [${finding.severity}] (${finding.category}) - ${finding.evidence}`
        ),
        "Implicacoes para a defesa:",
        ...documentAnalysis.defensive_implications.map((itemText) => `- ${itemText}`),
        `Confianca geral: ${documentAnalysis.confidence}`
      ].join("\n");
    })
    .filter((item): item is string => Boolean(item));

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

  const entity = caseItem.entity_links[0]?.entity;
  const relevantRequirements = legalConfig.requirements.filter((item) =>
    item.step_key === "cadastro_inicial" || item.step_key === "documentos_autor" || item.step_key === "pre_analise"
  );
  const relevantTemplates = legalConfig.templates.slice(0, 1);
  const relevantTheses = legalConfig.theses.slice(0, 6);
  const promptProfile = resolvePromptProfile(legalConfig.promptProfiles, "pre_analysis", caseItem.taxonomy_id);
  const staticGuidance = getPortfolioStaticGuidance({
    portfolioSlug: caseItem.portfolio?.slug,
    portfolioSegment: caseItem.portfolio?.segment,
    analysisType: "pre_analysis"
  });
  const configurationTrace = buildPromptTrace({
    analysisType: "pre_analysis",
    staticGuidance,
    promptProfile,
    requirements: relevantRequirements,
    theses: relevantTheses,
    templateTitles: relevantTemplates.map((item) => ({ id: item.id, title: item.title }))
  });
  const inputSummary = {
    case_id: caseItem.id,
    case_number: caseItem.case_number,
    title: caseItem.title,
    portfolio: caseItem.portfolio?.name ?? null,
    taxonomy: caseItem.taxonomy ? `${caseItem.taxonomy.code} - ${caseItem.taxonomy.name}` : null,
    responsible_lawyer: caseItem.responsible_lawyer?.full_name ?? null,
    represented_entity: entity?.name ?? null,
    eligible_documents: eligibleDocuments.length,
    processed_documents: processedDocuments.length,
    analyzed_documents: documentAnalysisBlocks.length,
    unsupported_documents: ingestions.filter((item) => item.status === "unsupported").length,
    empty_text_documents: ingestions.filter((item) => item.status === "empty_text").length,
    total_characters: totalCharacters,
    legal_config: {
      requirements_count: relevantRequirements.length,
      theses_count: relevantTheses.length,
      templates_count: relevantTemplates.length
    },
    configuration_trace: configurationTrace
  };

  return {
    caseId,
    inputSummary,
    configurationTrace,
    promptContext: [
      "[Escopo da etapa]",
      "Trata-se de pre-analise com base em documentos da fase inicial.",
      "Ainda nao ha revisao final da contestacao nesta etapa, salvo se texto de defesa estiver explicitamente presente no contexto.",
      "",
      "[Metadados do processo]",
      `Titulo: ${caseItem.title ?? "nao informado"}`,
      `Numero: ${caseItem.case_number ?? "nao informado"}`,
      `Descricao: ${caseItem.description ?? "nao informada"}`,
      `Carteira: ${caseItem.portfolio?.name ?? "nao informada"}`,
      `Taxonomia: ${caseItem.taxonomy ? `${caseItem.taxonomy.code} - ${caseItem.taxonomy.name}` : "nao definida"}`,
      `Empresa representada: ${entity?.name ?? "nao vinculada"}`,
      `Responsavel: ${caseItem.responsible_lawyer?.full_name ?? "nao definido"}`,
      "",
      "[Partes]",
      ...caseItem.parties.map((party) => `- ${party.role}: ${party.name}${party.document ? ` (${party.document})` : ""}`),
      "",
      "[Inventario documental da fase inicial]",
      ...documentInventory,
      "",
      "[Orientacao de rastreabilidade]",
      "Ao citar um documento no laudo, prefira usar o nome do arquivo e, quando disponivel, o Documento ID.",
      "Se houver peticao inicial, emenda inicial e documentos do autor, diferencie isso explicitamente.",
      "",
      "[Configuracao juridica ativa da carteira]",
      "Use esta configuracao apenas como guia interno de leitura defensiva. Ela nao substitui os fatos e documentos do caso concreto.",
      `Documentos obrigatorios relevantes nesta etapa: ${relevantRequirements.length > 0 ? relevantRequirements.map((item) => `${item.requirement_label} (${item.document_type})`).join("; ") : "nenhum requisito configurado"}`,
      ...(relevantTheses.length > 0
        ? [
            "Teses consolidadas relevantes:",
            ...relevantTheses.map((item) => `- ${item.title}: ${item.summary}`)
          ]
        : ["Teses consolidadas relevantes: nenhuma tese ativa configurada."]),
      ...(relevantTemplates.length > 0
        ? [
            "Modelo-base de referencia da taxonomia atual:",
            ...relevantTemplates.map((item) => `${item.title}\n${truncateText(item.template_markdown, 4000)}`)
          ]
        : ["Modelo-base de referencia da taxonomia atual: nenhum modelo ativo configurado."]),
      "",
      "[Diretivas operacionais da carteira]",
      `Estratégia base considerada: ${staticGuidance.strategyLabel}.`,
      "Focos operacionais prioritarios:",
      ...staticGuidance.focusAreas.map((item) => `- ${item}`),
      "Cuidados de leitura:",
      ...staticGuidance.cautionPoints.map((item) => `- ${item}`),
      "Enfase esperada na saida:",
      ...staticGuidance.outputEmphasis.map((item) => `- ${item}`),
      "",
      "[Refino administrativo de prompt]",
      ...buildPromptProfileContextLines(promptProfile),
      "",
      "[Analise documental estruturada]",
      ...(documentAnalysisBlocks.length > 0 ? documentAnalysisBlocks : ["Nenhuma analise estruturada disponivel."]),
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
