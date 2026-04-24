import { parseImageOcr } from "@/features/document-ingestion/parsers/parse-image-ocr";
import { parsePdfTextBased } from "@/features/document-ingestion/parsers/parse-pdf-text-based";
import { parseTxt } from "@/features/document-ingestion/parsers/parse-txt";
import type { ParserResult } from "@/features/document-ingestion/types";

export async function parseDocumentByMimeType({
  mimeType,
  buffer
}: {
  mimeType: string | null;
  buffer: Buffer;
}): Promise<ParserResult> {
  if (mimeType === "application/pdf") {
    return parsePdfTextBased(buffer);
  }

  if (mimeType === "text/plain") {
    return parseTxt(buffer);
  }

  if (mimeType === "image/jpeg" || mimeType === "image/png") {
    return parseImageOcr({ buffer, mimeType });
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return {
      status: "unsupported",
      parserType: "docx_pending",
      extractedText: null,
      extractedTextLength: 0,
      detectedLanguage: null,
      metadata: {},
      errorMessage: "DOCX simples ficara para uma evolucao posterior desta camada."
    };
  }

  return {
    status: "unsupported",
    parserType: null,
    extractedText: null,
    extractedTextLength: 0,
    detectedLanguage: null,
    metadata: {},
    errorMessage: "Formato ainda nao suportado. OCR e extracao avancada entram em fase posterior."
  };
}
