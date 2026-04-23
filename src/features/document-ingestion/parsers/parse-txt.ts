import type { ParserResult } from "@/features/document-ingestion/types";

function normalizeText(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\u0000/g, "").trim();
}

export async function parseTxt(buffer: Buffer): Promise<ParserResult> {
  const extractedText = normalizeText(buffer.toString("utf-8"));

  if (!extractedText) {
    return {
      status: "empty_text",
      parserType: "txt",
      extractedText: null,
      extractedTextLength: 0,
      detectedLanguage: "pt-BR",
      metadata: {},
      errorMessage: "O arquivo TXT nao possui texto util."
    };
  }

  return {
    status: "processed",
    parserType: "txt",
    extractedText,
    extractedTextLength: extractedText.length,
    detectedLanguage: "pt-BR",
    metadata: {},
    errorMessage: null
  };
}
