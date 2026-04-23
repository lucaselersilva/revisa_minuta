"use server";

import { revalidatePath } from "next/cache";

import {
  completeStep,
  markStepAsSkipped,
  reopenStep
} from "@/features/case-workflow/services/workflow-engine";
import type { WorkflowCompletionInput } from "@/features/case-workflow/types";
import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";
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
