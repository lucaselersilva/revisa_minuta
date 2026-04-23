import "server-only";

import type { ParserResult } from "@/features/document-ingestion/types";

function normalizePdfText(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

let pdfRuntimePrepared = false;

async function ensurePdfRuntimeGlobals() {
  if (pdfRuntimePrepared) {
    return;
  }

  const canvasRuntime = (await import("@napi-rs/canvas")) as unknown as {
    DOMMatrix?: unknown;
    ImageData?: unknown;
    Path2D?: unknown;
  };

  const { DOMMatrix, ImageData, Path2D } = canvasRuntime;

  if (typeof globalThis.DOMMatrix === "undefined" && DOMMatrix) {
    globalThis.DOMMatrix = DOMMatrix as typeof globalThis.DOMMatrix;
  }

  if (typeof globalThis.ImageData === "undefined" && ImageData) {
    globalThis.ImageData = ImageData as typeof globalThis.ImageData;
  }

  if (typeof globalThis.Path2D === "undefined" && Path2D) {
    globalThis.Path2D = Path2D as typeof globalThis.Path2D;
  }

  pdfRuntimePrepared = true;
}

export async function parsePdfTextBased(buffer: Buffer): Promise<ParserResult> {
  await ensurePdfRuntimeGlobals();

  const { PDFParse } = (await import("pdf-parse")) as {
    PDFParse: new (options: { data: Buffer }) => {
      getText: () => Promise<{ text?: string; pages?: Array<unknown> }>;
      destroy: () => Promise<void>;
    };
  };
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const extractedText = normalizePdfText(result.text ?? "");

    if (!extractedText) {
      return {
        status: "empty_text",
        parserType: "pdf_text_based",
        extractedText: null,
        extractedTextLength: 0,
        detectedLanguage: null,
        metadata: {
          pages: result.pages?.length ?? null
        },
        errorMessage: "O PDF nao possui texto extraivel. OCR ficara para fase posterior."
      };
    }

    return {
      status: "processed",
      parserType: "pdf_text_based",
      extractedText,
      extractedTextLength: extractedText.length,
      detectedLanguage: null,
      metadata: {
        pages: result.pages?.length ?? null
      },
      errorMessage: null
    };
  } catch (error) {
    return {
      status: "failed",
      parserType: "pdf_text_based",
      extractedText: null,
      extractedTextLength: 0,
      detectedLanguage: null,
      metadata: {},
      errorMessage: error instanceof Error ? error.message : "Falha ao processar o PDF."
    };
  } finally {
    await parser.destroy();
  }
}
