import "server-only";

import { normalizeExtractedText } from "@/features/document-ingestion/lib/text-normalization";

const OCR_LANGUAGE = "por+eng";

type OcrResult = {
  text: string;
  language: string | null;
  confidence: number | null;
};

let tesseractModulePromise: Promise<typeof import("tesseract.js")> | null = null;

async function getTesseractModule() {
  if (!tesseractModulePromise) {
    tesseractModulePromise = import("tesseract.js");
  }

  return tesseractModulePromise;
}

export async function runOcrOnBuffer(buffer: Buffer): Promise<OcrResult> {
  const Tesseract = await getTesseractModule();
  const result = await Tesseract.recognize(buffer, OCR_LANGUAGE);
  const normalizedText = normalizeExtractedText(result.data.text ?? "");

  return {
    text: normalizedText,
    language: OCR_LANGUAGE,
    confidence: typeof result.data.confidence === "number" ? result.data.confidence : null
  };
}
