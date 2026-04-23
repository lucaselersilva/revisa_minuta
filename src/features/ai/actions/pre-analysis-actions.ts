"use server";

import { revalidatePath } from "next/cache";

import { generatePreAnalysisReport } from "@/features/ai/services/generate-pre-analysis-report";
import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";
import { writeCaseHistory } from "@/features/cases/services/case-history-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/services/audit-log-service";

export async function generatePreAnalysisReportAction(caseId: string) {
  const { profile } = await getCurrentProfile();

  if (!profile?.office_id) {
    return { ok: false, message: "Perfil interno nao encontrado." };
  }

  const result = await generatePreAnalysisReport(caseId, profile);
  revalidatePath(`/app/cases/${caseId}`);
  return result;
}

export async function acknowledgePreAnalysisReportAction(caseId: string, reportId: string) {
  const { profile } = await getCurrentProfile();

  if (!profile?.office_id) {
    return { ok: false, message: "Perfil interno nao encontrado." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("AA_pre_analysis_acknowledgements").insert({
    office_id: profile.office_id,
    case_id: caseId,
    report_id: reportId,
    acknowledged_by: profile.id
  });

  if (error) {
    return { ok: false, message: "Nao foi possivel registrar a leitura do laudo." };
  }

  await writeCaseHistory({
    caseId,
    action: "pre_analysis.report.acknowledged",
    profile,
    metadata: { report_id: reportId }
  });

  if (profile.role === "admin") {
    await writeAuditLog({
      profile,
      action: "pre_analysis.report.acknowledged",
      entityType: "AA_pre_analysis_acknowledgements",
      entityId: null,
      metadata: { case_id: caseId, report_id: reportId }
    });
  }

  revalidatePath(`/app/cases/${caseId}`);
  return { ok: true, message: "Leitura do laudo confirmada." };
}
