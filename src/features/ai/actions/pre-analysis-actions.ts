"use server";

import { revalidatePath } from "next/cache";

import { generatePreAnalysisReport } from "@/features/ai/services/generate-pre-analysis-report";
import {
  refreshAuthorExternalSearches,
  requestAuthorExternalSearches
} from "@/features/author-process-search/services/author-process-search-service";
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

export async function requestAuthorExternalSearchesAction(caseId: string) {
  const { profile } = await getCurrentProfile();

  if (!profile?.office_id) {
    return { ok: false, message: "Perfil interno nao encontrado." };
  }

  try {
    const result = await requestAuthorExternalSearches(caseId, profile);

    await writeCaseHistory({
      caseId,
      action: "pre_analysis.author_external_search.requested",
      profile,
      metadata: {
        submitted: result.submitted,
        skipped: result.skipped,
        unresolved: result.unresolved
      }
    });

    if (profile.role === "admin") {
      await writeAuditLog({
        profile,
        action: "pre_analysis.author_external_search.requested",
        entityType: "AA_author_external_searches",
        entityId: null,
        metadata: {
          case_id: caseId,
          submitted: result.submitted,
          skipped: result.skipped,
          unresolved: result.unresolved
        }
      });
    }

    revalidatePath(`/app/cases/${caseId}`);

    return {
      ok: true,
      message:
        result.submitted > 0
          ? `Consulta externa iniciada. ${result.submitted} consulta(s) enviada(s), ${result.skipped} reaproveitada(s) e ${result.unresolved} autor(es) sem CPF confirmado.`
          : result.unresolved > 0
            ? `Nenhuma consulta enviada. ${result.unresolved} autor(es) seguem sem CPF confirmado na inicial ou no cadastro.`
            : "Nenhuma nova consulta precisou ser enviada."
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Nao foi possivel iniciar a consulta externa dos autores."
    };
  }
}

export async function refreshAuthorExternalSearchesAction(caseId: string) {
  const { profile } = await getCurrentProfile();

  if (!profile?.office_id) {
    return { ok: false, message: "Perfil interno nao encontrado." };
  }

  try {
    const result = await refreshAuthorExternalSearches(caseId);

    await writeCaseHistory({
      caseId,
      action: "pre_analysis.author_external_search.refreshed",
      profile,
      metadata: {
        refreshed: result.refreshed,
        completed: result.completed,
        not_found: result.notFound,
        processes_found: result.processesFound
      }
    });

    if (profile.role === "admin") {
      await writeAuditLog({
        profile,
        action: "pre_analysis.author_external_search.refreshed",
        entityType: "AA_author_external_searches",
        entityId: null,
        metadata: {
          case_id: caseId,
          refreshed: result.refreshed,
          completed: result.completed,
          not_found: result.notFound,
          processes_found: result.processesFound
        }
      });
    }

    revalidatePath(`/app/cases/${caseId}`);

    return {
      ok: true,
      message:
        result.refreshed > 0
          ? `Consultas atualizadas: ${result.refreshed}. Concluidas: ${result.completed}. Sem resultado: ${result.notFound}. Processos encontrados: ${result.processesFound}.`
          : "Nao ha consultas pendentes para atualizar no momento."
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Nao foi possivel atualizar as consultas externas."
    };
  }
}
