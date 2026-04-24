import "server-only";

import { ensurePdfRuntimeGlobals } from "@/features/document-ingestion/lib/pdf-runtime";

export type PdfParsePageTextResult = {
  num: number;
  text: string;
};

export type PdfParseTextResult = {
  pages: Array<PdfParsePageTextResult>;
  text: string;
  total: number;
};

export type PdfParseScreenshotPage = {
  data: Uint8Array;
  pageNumber: number;
  width: number;
  height: number;
  scale: number;
};

export type PdfParseScreenshotResult = {
  pages: Array<PdfParseScreenshotPage>;
  total: number;
};

export type PdfParseInstance = {
  getText: (params?: {
    partial?: number[];
    first?: number;
    last?: number;
  }) => Promise<PdfParseTextResult>;
  getScreenshot: (params?: {
    partial?: number[];
    first?: number;
    last?: number;
    scale?: number;
    desiredWidth?: number;
    imageDataUrl?: boolean;
    imageBuffer?: boolean;
  }) => Promise<PdfParseScreenshotResult>;
  destroy: () => Promise<void>;
};

type PdfParseConstructor = {
  new (options: { data: Buffer }): PdfParseInstance;
  setWorker: (workerSource: string) => void;
};

let pdfWorkerPrepared = false;
let pdfParseConstructorPromise: Promise<PdfParseConstructor> | null = null;

async function getPdfParseConstructor() {
  if (!pdfParseConstructorPromise) {
    pdfParseConstructorPromise = (async () => {
      await ensurePdfRuntimeGlobals();

      const [{ PDFParse }, { getData }] = (await Promise.all([
        import("pdf-parse"),
        import("pdf-parse/worker")
      ])) as [
        { PDFParse: PdfParseConstructor },
        { getData: () => string }
      ];

      if (!pdfWorkerPrepared) {
        PDFParse.setWorker(getData());
        pdfWorkerPrepared = true;
      }

      return PDFParse;
    })();
  }

  return pdfParseConstructorPromise;
}

export async function createPdfParseInstance(buffer: Buffer) {
  const PDFParse = await getPdfParseConstructor();
  return new PDFParse({ data: buffer });
}
