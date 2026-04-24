import "server-only";

import type { ParserResult } from "@/features/document-ingestion/types";
import { createPdfParseInstance } from "@/features/document-ingestion/lib/pdf-parse-runtime";
import { normalizeExtractedText } from "@/features/document-ingestion/lib/text-normalization";
import { runOcrOnBuffer } from "@/features/document-ingestion/services/ocr-service";

const PDF_SCREENSHOT_WIDTH = 1440;
const MAX_PDF_OCR_PAGES = 8;
const OCR_LANGUAGE = "por+eng";

export async function parsePdfVisual(
  buffer: Buffer,
  totalPagesHint?: number | null
): Promise<ParserResult> {
  const parser = await createPdfParseInstance(buffer);

  try {
    const firstPageText = await parser.getText({ first: 1 });
    const pageCount = totalPagesHint ?? firstPageText.total ?? 1;
    const pagesToProcess = Math.min(pageCount, MAX_PDF_OCR_PAGES);
    const screenshotResult = await parser.getScreenshot({
      first: pagesToProcess,
      desiredWidth: PDF_SCREENSHOT_WIDTH,
      imageDataUrl: false,
      imageBuffer: true
    });

    const pageTexts: string[] = [];
    const pageConfidences: number[] = [];

    for (const page of screenshotResult.pages) {
      const ocrResult = await runOcrOnBuffer(Buffer.from(page.data));

      if (ocrResult.text) {
        pageTexts.push(`[pagina ${page.pageNumber}]\n${ocrResult.text}`);
      }

      if (typeof ocrResult.confidence === "number") {
        pageConfidences.push(ocrResult.confidence);
      }
    }

    const extractedText = normalizeExtractedText(pageTexts.join("\n\n"));
    const averageConfidence =
      pageConfidences.length > 0
        ? Number((pageConfidences.reduce((total, value) => total + value, 0) / pageConfidences.length).toFixed(2))
        : null;

    if (!extractedText) {
      return {
        status: "empty_text",
        parserType: "pdf_ocr",
        extractedText: null,
        extractedTextLength: 0,
        detectedLanguage: OCR_LANGUAGE,
        metadata: {
          pages: pageCount,
          pages_processed: pagesToProcess,
          ingestion_mode: "ocr_pdf_visual",
          average_confidence: averageConfidence,
          truncated_pages: pageCount > pagesToProcess
        },
        errorMessage:
          pageCount > pagesToProcess
            ? `O PDF nao trouxe texto util nas primeiras ${pagesToProcess} paginas processadas por OCR.`
            : "O PDF visual nao trouxe texto util nesta fase de OCR."
      };
    }

    return {
      status: "processed",
      parserType: "pdf_ocr",
      extractedText,
      extractedTextLength: extractedText.length,
      detectedLanguage: OCR_LANGUAGE,
      metadata: {
        pages: pageCount,
        pages_processed: pagesToProcess,
        ingestion_mode: "ocr_pdf_visual",
        average_confidence: averageConfidence,
        truncated_pages: pageCount > pagesToProcess
      },
      errorMessage:
        pageCount > pagesToProcess ? `OCR aplicado nas primeiras ${pagesToProcess} paginas nesta fase.` : null
    };
  } catch (error) {
    return {
      status: "failed",
      parserType: "pdf_ocr",
      extractedText: null,
      extractedTextLength: 0,
      detectedLanguage: null,
      metadata: {
        ingestion_mode: "ocr_pdf_visual"
      },
      errorMessage: error instanceof Error ? error.message : "Falha ao processar o PDF visual com OCR."
    };
  } finally {
    await parser.destroy();
  }
}
