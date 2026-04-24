import { structuredDocumentAnalysisSchema } from "@/features/document-ingestion/lib/document-analysis-schema";
import type { StructuredDocumentAnalysis } from "@/features/document-ingestion/types";

export function extractStructuredDocumentAnalysis(
  metadata: Record<string, unknown>
): StructuredDocumentAnalysis | null {
  const payload = metadata.document_analysis;
  const parsed = structuredDocumentAnalysisSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

export function getDocumentAnalysisStatus(metadata: Record<string, unknown>) {
  const value = metadata.analysis_status;
  return typeof value === "string" ? value : null;
}
