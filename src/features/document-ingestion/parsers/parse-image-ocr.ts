import "server-only";

import type { ParserResult } from "@/features/document-ingestion/types";
import { runOcrOnBuffer } from "@/features/document-ingestion/services/ocr-service";

export async function parseImageOcr({
  buffer,
  mimeType
}: {
  buffer: Buffer;
  mimeType: string | null;
}): Promise<ParserResult> {
  try {
    const result = await runOcrOnBuffer(buffer);

    if (!result.text) {
      return {
        status: "empty_text",
        parserType: "image_ocr",
        extractedText: null,
        extractedTextLength: 0,
        detectedLanguage: result.language,
        metadata: {
          mime_type: mimeType,
          ingestion_mode: "ocr_image",
          confidence: result.confidence
        },
        errorMessage: "A imagem nao trouxe texto util nesta fase de OCR."
      };
    }

    return {
      status: "processed",
      parserType: "image_ocr",
      extractedText: result.text,
      extractedTextLength: result.text.length,
      detectedLanguage: result.language,
      metadata: {
        mime_type: mimeType,
        ingestion_mode: "ocr_image",
        confidence: result.confidence
      },
      errorMessage: null
    };
  } catch (error) {
    return {
      status: "failed",
      parserType: "image_ocr",
      extractedText: null,
      extractedTextLength: 0,
      detectedLanguage: null,
      metadata: {
        mime_type: mimeType,
        ingestion_mode: "ocr_image"
      },
      errorMessage: error instanceof Error ? error.message : "Falha ao processar a imagem com OCR."
    };
  }
}
