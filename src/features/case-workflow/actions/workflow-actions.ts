"use server";

import { revalidatePath } from "next/cache";

import {
  completeStep,
  markStepAsSkipped,
  reopenStep
} from "@/features/case-workflow/services/workflow-engine";
import { normalizeDefensePreparationInput } from "@/features/case-workflow/lib/defense-step";
import type { DefensePreparationInput, WorkflowCompletionInput } from "@/features/case-workflow/types";
import { writeCaseHistory } from "@/features/cases/services/case-history-service";
import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/services/audit-log-service";
import type { WorkflowStepKey } from "@/types/database";

type ActionResult = {
  ok: boolean;
  message: string;
};

async function requireProfile() {
  const { profile } = await getCurrentProfile();
  return profile?.office_id ? profile : null;
}

export async function completeWorkflowStepAction(
  caseId: string,
  stepKey: WorkflowStepKey,
  input: WorkflowCompletionInput = {}
): Promise<ActionResult> {
  const profile = await requireProfile();

  if (!profile) {
    return { ok: false, message: "Perfil interno nao encontrado." };
  }

  const result = await completeStep(caseId, stepKey, profile, input);
  revalidatePath(`/app/cases/${caseId}`);
  revalidatePath("/app/cases");
  return result;
}

export async function skipWorkflowStepAction(caseId: string, stepKey: WorkflowStepKey): Promise<ActionResult> {
  const profile = await requireProfile();

  if (!profile) {
    return { ok: false, message: "Perfil interno nao encontrado." };
  }

  const result = await markStepAsSkipped(caseId, stepKey, profile);
  revalidatePath(`/app/cases/${caseId}`);
  revalidatePath("/app/cases");
  return result;
}

export async function reopenWorkflowStepAction(caseId: string, stepKey: WorkflowStepKey): Promise<ActionResult> {
  const profile = await requireProfile();

  if (!profile) {
    return { ok: false, message: "Perfil interno nao encontrado." };
  }

  const result = await reopenStep(caseId, stepKey, profile);
  revalidatePath(`/app/cases/${caseId}`);
  revalidatePath("/app/cases");
  return result;
}

export async function saveDefensePreparationAction(
  caseId: string,
  input: DefensePreparationInput
): Promise<ActionResult> {
  const profile = await requireProfile();

  if (!profile) {
    return { ok: false, message: "Perfil interno nao encontrado." };
  }

  const supabase = await createClient();
  const normalizedInput = normalizeDefensePreparationInput(input);
  const currentStepResult = await supabase
    .from("AA_case_workflow_steps")
    .select("metadata")
    .eq("case_id", caseId)
    .eq("step_key", "defesa")
    .single<{ metadata: Record<string, unknown> | null }>();

  const metadata = {
    ...(currentStepResult.data?.metadata ?? {}),
    defense_preparation: normalizedInput,
    defense_preparation_saved_at: new Date().toISOString(),
    defense_preparation_saved_by: profile.id
  };

  const { error } = await supabase
    .from("AA_case_workflow_steps")
    .update({ metadata })
    .eq("case_id", caseId)
    .eq("step_key", "defesa");

  if (error) {
    return { ok: false, message: "Nao foi possivel salvar o preparo da defesa." };
  }

  await writeCaseHistory({
    caseId,
    action: "defense.preparation.saved",
    profile,
    metadata: {
      checklist: {
        pre_analysis_reviewed: normalizedInput.preAnalysisReviewed,
        defense_strategy_defined: normalizedInput.defenseStrategyDefined,
        defense_documents_reviewed: normalizedInput.defenseDocumentsReviewed
      }
    }
  });

  await writeAuditLog({
    profile,
    action: "defense.preparation.saved",
    entityType: "AA_case_workflow_steps",
    entityId: null,
    metadata: {
      case_id: caseId,
      step_key: "defesa"
    }
  });

  revalidatePath(`/app/cases/${caseId}`);
  revalidatePath("/app/cases");
  return { ok: true, message: "Preparo da defesa salvo." };
}
