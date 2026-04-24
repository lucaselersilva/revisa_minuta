import "server-only";

import { createPdfParseInstance } from "@/features/document-ingestion/lib/pdf-parse-runtime";
import { normalizeExtractedText } from "@/features/document-ingestion/lib/text-normalization";
import { parsePdfVisual } from "@/features/document-ingestion/parsers/parse-pdf-visual";
import { runOcrOnBuffer } from "@/features/document-ingestion/services/ocr-service";
import type { ParserResult } from "@/features/document-ingestion/types";

const PDF_PAGE_TEXT_THRESHOLD = 80;
const PDF_SCREENSHOT_WIDTH = 1440;
const MAX_HYBRID_OCR_PAGES = 8;
const OCR_LANGUAGE = "por+eng";

export async function parsePdfTextBased(buffer: Buffer): Promise<ParserResult> {
  const parser = await createPdfParseInstance(buffer);

  try {
    const firstPageResult = await parser.getText({ first: 1 });
    const totalPages = firstPageResult.total ?? 1;
    const pageTexts: string[] = [];
    const pageStrategies: Array<{
      page_number: number;
      strategy: "native_text" | "ocr" | "empty";
      native_characters: number;
      ocr_characters?: number;
      confidence?: number | null;
    }> = [];

    let hasNativeText = false;
    let hasOcrText = false;
    let ocrPagesProcessed = 0;

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const pageResult =
        pageNumber === 1 ? firstPageResult : await parser.getText({ partial: [pageNumber] });
      const pageText = normalizeExtractedText(pageResult.pages[0]?.text ?? "");

      if (pageText.length >= PDF_PAGE_TEXT_THRESHOLD) {
        hasNativeText = true;
        pageTexts.push(`[pagina ${pageNumber}]\n${pageText}`);
        pageStrategies.push({
          page_number: pageNumber,
          strategy: "native_text",
          native_characters: pageText.length
        });
        continue;
      }

      if (ocrPagesProcessed >= MAX_HYBRID_OCR_PAGES) {
        pageStrategies.push({
          page_number: pageNumber,
          strategy: "empty",
          native_characters: pageText.length
        });
        continue;
      }

      const screenshot = await parser.getScreenshot({
        partial: [pageNumber],
        desiredWidth: PDF_SCREENSHOT_WIDTH,
        imageDataUrl: false,
        imageBuffer: true
      });
      const screenshotPage = screenshot.pages[0];

      if (!screenshotPage?.data) {
        pageStrategies.push({
          page_number: pageNumber,
          strategy: "empty",
          native_characters: pageText.length
        });
        continue;
      }

      const ocrResult = await runOcrOnBuffer(Buffer.from(screenshotPage.data));
      ocrPagesProcessed += 1;

      if (ocrResult.text) {
        hasOcrText = true;
        pageTexts.push(`[pagina ${pageNumber}]\n${ocrResult.text}`);
        pageStrategies.push({
          page_number: pageNumber,
          strategy: "ocr",
          native_characters: pageText.length,
          ocr_characters: ocrResult.text.length,
          confidence: ocrResult.confidence
        });
      } else {
        pageStrategies.push({
          page_number: pageNumber,
          strategy: "empty",
          native_characters: pageText.length,
          confidence: ocrResult.confidence
        });
      }
    }

    const extractedText = normalizeExtractedText(pageTexts.join("\n\n"));

    if (!extractedText) {
      return parsePdfVisual(buffer, totalPages);
    }

    const averageOcrConfidence = (() => {
      const confidences = pageStrategies
        .map((item) => item.confidence)
        .filter((value): value is number => typeof value === "number");

      if (confidences.length === 0) {
        return null;
      }

      return Number((confidences.reduce((total, value) => total + value, 0) / confidences.length).toFixed(2));
    })();

    const parserType = hasNativeText && hasOcrText ? "pdf_hybrid" : hasOcrText ? "pdf_ocr" : "pdf_text_based";

    return {
      status: "processed",
      parserType,
      extractedText,
      extractedTextLength: extractedText.length,
      detectedLanguage: hasOcrText ? OCR_LANGUAGE : null,
      metadata: {
        pages: totalPages,
        ingestion_mode: parserType === "pdf_hybrid" ? "hybrid_pdf" : parserType === "pdf_ocr" ? "ocr_pdf_visual" : "text_pdf",
        page_strategies: pageStrategies,
        ocr_pages_processed: ocrPagesProcessed,
        ocr_pages_truncated: totalPages > ocrPagesProcessed && pageStrategies.some((item) => item.strategy !== "native_text"),
        average_ocr_confidence: averageOcrConfidence
      },
      errorMessage:
        totalPages > ocrPagesProcessed && hasOcrText
          ? `OCR aplicado em ate ${MAX_HYBRID_OCR_PAGES} paginas com baixa densidade textual nesta fase.`
          : null
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
