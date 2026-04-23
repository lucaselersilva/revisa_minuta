import { getCaseById } from "@/features/cases/queries/get-cases";
import { isPreAnalysisEligibleDocumentType } from "@/features/document-ingestion/lib/eligible-documents";
import type { PreAnalysisSnapshot } from "@/features/document-ingestion/types";
import { createClient } from "@/lib/supabase/server";
import type {
  DocumentIngestion,
  PreAnalysisAcknowledgement,
  PreAnalysisReport,
  Profile
} from "@/types/database";

export async function getPreAnalysisSnapshot(caseId: string): Promise<PreAnalysisSnapshot | null> {
  const supabase = await createClient();
  const caseItem = await getCaseById(caseId);

  if (!caseItem) {
    return null;
  }

  const [ingestionsResult, reportsResult, acknowledgementsResult] = await Promise.all([
    supabase.from("AA_document_ingestions").select("*").returns<DocumentIngestion[]>(),
    supabase
      .from("AA_pre_analysis_reports")
      .select("*, generated_profile:AA_profiles!AA_pre_analysis_reports_generated_by_fkey(id, full_name)")
      .eq("case_id", caseId)
      .order("version", { ascending: false })
      .returns<Array<PreAnalysisReport & { generated_profile: Pick<Profile, "id" | "full_name"> | null }>>(),
    supabase
      .from("AA_pre_analysis_acknowledgements")
      .select("*, acknowledger:AA_profiles!AA_pre_analysis_acknowledgements_acknowledged_by_fkey(id, full_name)")
      .eq("case_id", caseId)
      .order("acknowledged_at", { ascending: false })
      .returns<Array<PreAnalysisAcknowledgement & { acknowledger: Pick<Profile, "id" | "full_name"> | null }>>()
  ]);

  const ingestions = (ingestionsResult.data ?? []).filter((item) =>
    caseItem.documents.some((document) => document.id === item.case_document_id)
  );
  const reports = reportsResult.data ?? [];
  const acknowledgements = acknowledgementsResult.data ?? [];
  const eligibleDocuments = caseItem.documents
    .filter((document) => isPreAnalysisEligibleDocumentType(document.document_type))
    .map((document) => ({
      document,
      ingestion: ingestions.find((ingestion) => ingestion.case_document_id === document.id) ?? null
    }));
  const latestReport = reports[0] ?? null;
  const latestCompletedReport = reports.find((report) => report.status === "completed") ?? null;
  const latestAcknowledgementForLatestReport = latestCompletedReport
    ? acknowledgements.find((ack) => ack.report_id === latestCompletedReport.id) ?? null
    : null;
  const metrics = {
    eligibleCount: eligibleDocuments.length,
    processedCount: eligibleDocuments.filter((item) => item.ingestion?.status === "processed").length,
    failedCount: eligibleDocuments.filter((item) => item.ingestion?.status === "failed").length,
    unsupportedCount: eligibleDocuments.filter((item) => item.ingestion?.status === "unsupported").length,
    emptyTextCount: eligibleDocuments.filter((item) => item.ingestion?.status === "empty_text").length,
    pendingCount: eligibleDocuments.filter((item) => !item.ingestion || item.ingestion.status === "pending" || item.ingestion.status === "processing").length,
    totalExtractedCharacters: eligibleDocuments.reduce((acc, item) => acc + (item.ingestion?.extracted_text_length ?? 0), 0)
  };
  const generationRequirements: string[] = [];

  if (metrics.eligibleCount === 0) {
    generationRequirements.push("Anexe ao menos um documento elegivel da fase inicial.");
  }

  if (metrics.processedCount === 0) {
    generationRequirements.push("Processe documentos com texto extraivel antes de gerar o laudo.");
  }

  return {
    eligibleDocuments,
    latestCompletedReport,
    latestReport,
    reports,
    acknowledgements,
    latestAcknowledgementForLatestReport,
    metrics,
    canGenerateReport: generationRequirements.length === 0,
    generationRequirements
  };
}
