import "server-only";

let pdfRuntimePrepared = false;

export async function ensurePdfRuntimeGlobals() {
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
