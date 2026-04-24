import { getCaseById } from "@/features/cases/queries/get-cases";
import { isPreAnalysisEligibleDocumentType } from "@/features/document-ingestion/lib/eligible-documents";
import type { PreAnalysisSnapshot } from "@/features/document-ingestion/types";
import { createClient } from "@/lib/supabase/server";
import type {
  AuthorExternalProcess,
  AuthorExternalSearch,
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

  const [ingestionsResult, reportsResult, acknowledgementsResult, externalSearchesResult, externalProcessesResult] = await Promise.all([
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
      .returns<Array<PreAnalysisAcknowledgement & { acknowledger: Pick<Profile, "id" | "full_name"> | null }>>(),
    supabase
      .from("AA_author_external_searches")
      .select("*")
      .eq("case_id", caseId)
      .order("requested_at", { ascending: false })
      .returns<AuthorExternalSearch[]>(),
    supabase
      .from("AA_author_external_processes")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .returns<AuthorExternalProcess[]>()
  ]);

  const ingestions = (ingestionsResult.data ?? []).filter((item) =>
    caseItem.documents.some((document) => document.id === item.case_document_id)
  );
  const reports = reportsResult.data ?? [];
  const acknowledgements = acknowledgementsResult.data ?? [];
  const externalSearches = externalSearchesResult.data ?? [];
  const externalProcesses = externalProcessesResult.data ?? [];
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
  const externalAuthorSearches = externalSearches.map((search) => ({
    ...search,
    party:
      caseItem.parties.find((party) => party.id === search.party_id) ?? null,
    processes: externalProcesses.filter((process) => process.search_id === search.id)
  }));
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

  const externalAuthorSearchMetrics = {
    configured: Boolean(process.env.ESCAVADOR_API_TOKEN?.trim()),
    authorCount: caseItem.parties.filter((party) => party.role === "author").length,
    searchesCount: externalAuthorSearches.length,
    pendingCount: externalAuthorSearches.filter((item) => item.status === "pending").length,
    completedCount: externalAuthorSearches.filter((item) => item.status === "completed").length,
    failedCount: externalAuthorSearches.filter((item) => item.status === "failed").length,
    identifiedCpfCount: new Set(externalAuthorSearches.map((item) => item.cpf).filter(Boolean)).size,
    processCount: externalProcesses.length,
    lastRequestedAt: externalAuthorSearches[0]?.requested_at ?? null
  };

  return {
    eligibleDocuments,
    latestCompletedReport,
    latestReport,
    reports,
    acknowledgements,
    latestAcknowledgementForLatestReport,
    metrics,
    externalAuthorSearches,
    externalAuthorSearchMetrics,
    canGenerateReport: generationRequirements.length === 0,
    generationRequirements
  };
}
