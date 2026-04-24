import type { CaseDocument } from "@/types/database";

export const DOCUMENT_ANALYSIS_PROMPT_VERSION = "v1";

export function buildDocumentAnalysisSystemPrompt() {
  return [
    "Voce atua como analista juridico operacional focado em leitura documental estruturada.",
    "Sua tarefa e classificar o documento, resumir o que ele mostra e destacar achados uteis para futura defesa.",
    "Analise apenas o conteudo fornecido.",
    "Nao invente fatos, datas, valores, pessoas ou autenticidade que nao estejam sustentados pelo documento.",
    "Se houver incerteza, seja prudente e reflita isso na confianca geral.",
    "Responda apenas com JSON estrito.",
    "Use inferred_document_kind apenas entre: email_print, whatsapp_print, financial_record, platform_print, identity_document, procuration, travel_record, general_attachment.",
    "Use severity e confidence apenas entre: low, medium, high."
  ].join(" ");
}

export function buildDocumentAnalysisInstruction(document: CaseDocument, extractedText: string) {
  const excerpt = extractedText.length > 12000 ? `${extractedText.slice(0, 12000)}\n\n[texto truncado]` : extractedText;

  return [
    "Retorne um JSON com as chaves obrigatorias:",
    "inferred_document_kind, summary, participants, dates, monetary_values, key_findings, defensive_implications, confidence.",
    "Os achados devem ser objetivos e orientados a uso juridico-operacional.",
    `Documento atual: ${document.file_name ?? document.document_type}`,
    `Tipo cadastrado: ${document.document_type}`,
    `Mime type: ${document.mime_type ?? "nao informado"}`,
    "Texto extraido do documento:",
    excerpt || "[sem texto extraido]"
  ].join("\n\n");
}
