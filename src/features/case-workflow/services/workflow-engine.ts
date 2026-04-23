import { getNextWorkflowStepKey, workflowSteps } from "@/features/case-workflow/lib/workflow-steps";
import { validateWorkflowStepCompletion } from "@/features/case-workflow/lib/workflow-validation";
import type {
  CaseWorkflowState,
  WorkflowCompletionInput,
  WorkflowValidationResult
} from "@/features/case-workflow/types";
import { getCaseById } from "@/features/cases/queries/get-cases";
import { writeCaseHistory } from "@/features/cases/services/case-history-service";
import { getPreAnalysisSnapshot } from "@/features/document-ingestion/queries/get-pre-analysis-snapshot";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/services/audit-log-service";
import type { CaseWorkflow, CaseWorkflowStep, Profile, WorkflowStepKey } from "@/types/database";

export function validateStepCompletion(
  state: CaseWorkflowState,
  stepKey: WorkflowStepKey,
  input: WorkflowCompletionInput = {}
): WorkflowValidationResult {
  return validateWorkflowStepCompletion(state, stepKey, input);
}

export async function getCaseWorkflowState(caseId: string): Promise<CaseWorkflowState | null> {
  const supabase = await createClient();
  const [caseItem, workflowResult, stepsResult, preAnalysis] = await Promise.all([
    getCaseById(caseId),
    supabase.from("AA_case_workflows").select("*").eq("case_id", caseId).single<CaseWorkflow>(),
    supabase
      .from("AA_case_workflow_steps")
      .select("*")
      .eq("case_id", caseId)
      .order("step_order", { ascending: true })
      .returns<CaseWorkflowStep[]>(),
    getPreAnalysisSnapshot(caseId)
  ]);

  if (!caseItem || workflowResult.error || stepsResult.error || !workflowResult.data) {
    return null;
  }

  const steps = stepsResult.data ?? [];
  const currentStep = steps.find((step) => step.step_key === workflowResult.data.current_step) ?? steps[0];

  if (!currentStep) {
    return null;
  }

  const completedCount = steps.filter((step) => step.status === "completed" || step.status === "skipped").length;
  const stateWithoutValidation = {
    caseItem,
    workflow: workflowResult.data,
    steps,
    currentStep,
    progress: steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0,
    preAnalysis,
    currentValidation: {
      isValid: false,
      missingItems: [],
      warnings: [],
      nextStep: null
    }
  };

  return {
    ...stateWithoutValidation,
    currentValidation: validateStepCompletion(stateWithoutValidation, currentStep.step_key)
  };
}

async function unlockNextStep(caseId: string, completedStepKey: WorkflowStepKey, profile: Profile) {
  const supabase = await createClient();
  const nextStep = getNextWorkflowStepKey(completedStepKey);

  if (!nextStep) {
    await supabase
      .from("AA_case_workflows")
      .update({
        status: "completed",
        completed_at: new Date().toISOString()
      })
      .eq("case_id", caseId);
    return;
  }

  await supabase
    .from("AA_case_workflow_steps")
    .update({
      status: "in_progress",
      started_at: new Date().toISOString()
    })
    .eq("case_id", caseId)
    .eq("step_key", nextStep);

  await supabase
    .from("AA_case_workflows")
    .update({
      current_step: nextStep,
      status: "in_progress"
    })
    .eq("case_id", caseId);

  await writeCaseHistory({
    caseId,
    action: "workflow.step.started",
    profile,
    metadata: { step_key: nextStep }
  });
}

export async function completeStep(caseId: string, stepKey: WorkflowStepKey, profile: Profile, input: WorkflowCompletionInput = {}) {
  const supabase = await createClient();
  const state = await getCaseWorkflowState(caseId);

  if (!state) {
    return { ok: false, message: "Fluxo nao encontrado." };
  }

  const step = state.steps.find((item) => item.step_key === stepKey);
  if (!step || step.status === "locked") {
    return { ok: false, message: "Etapa bloqueada." };
  }

  const validation = validateStepCompletion(state, stepKey, input);
  if (!validation.isValid) {
    await writeCaseHistory({
      caseId,
      action: "workflow.validation_failed",
      profile,
      metadata: { step_key: stepKey, missing_items: validation.missingItems }
    });
    return { ok: false, message: validation.missingItems[0] ?? "Existem pendencias para concluir a etapa." };
  }

  const metadata = {
    ...step.metadata,
    completed_by: profile.id,
    completion_input: input
  };

  const { error } = await supabase
    .from("AA_case_workflow_steps")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      metadata
    })
    .eq("case_id", caseId)
    .eq("step_key", stepKey);

  if (error) {
    return { ok: false, message: "Nao foi possivel concluir a etapa." };
  }

  await writeCaseHistory({
    caseId,
    action: "workflow.step.completed",
    profile,
    metadata: { step_key: stepKey, next_step: validation.nextStep }
  });

  await unlockNextStep(caseId, stepKey, profile);
  return { ok: true, message: "Etapa concluida." };
}

export async function markStepAsSkipped(caseId: string, stepKey: WorkflowStepKey, profile: Profile) {
  if (stepKey !== "emenda_inicial") {
    return { ok: false, message: "Somente etapas opcionais podem ser marcadas como nao se aplica." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("AA_case_workflow_steps")
    .update({
      status: "skipped",
      completed_at: new Date().toISOString(),
      metadata: { skipped_by: profile.id, reason: "not_applicable" }
    })
    .eq("case_id", caseId)
    .eq("step_key", stepKey);

  if (error) {
    return { ok: false, message: "Nao foi possivel marcar a etapa como nao se aplica." };
  }

  await writeCaseHistory({
    caseId,
    action: "workflow.step.skipped",
    profile,
    metadata: { step_key: stepKey }
  });

  await unlockNextStep(caseId, stepKey, profile);
  return { ok: true, message: "Etapa marcada como nao se aplica." };
}

export async function reopenStep(caseId: string, stepKey: WorkflowStepKey, profile: Profile) {
  if (profile.role !== "admin") {
    return { ok: false, message: "Apenas administradores podem reabrir etapas." };
  }

  const supabase = await createClient();
  const targetMeta = workflowSteps.find((step) => step.key === stepKey);

  if (!targetMeta) {
    return { ok: false, message: "Etapa invalida." };
  }

  const now = new Date().toISOString();
  const { error: stepError } = await supabase
    .from("AA_case_workflow_steps")
    .update({
      status: "in_progress",
      started_at: now,
      completed_at: null
    })
    .eq("case_id", caseId)
    .eq("step_key", stepKey);

  if (stepError) {
    return { ok: false, message: "Nao foi possivel reabrir a etapa." };
  }

  await supabase
    .from("AA_case_workflow_steps")
    .update({ status: "locked", completed_at: null })
    .eq("case_id", caseId)
    .gt("step_order", targetMeta.order);

  await supabase
    .from("AA_case_workflows")
    .update({
      current_step: stepKey,
      status: "in_progress",
      completed_at: null
    })
    .eq("case_id", caseId);

  await writeCaseHistory({
    caseId,
    action: "workflow.step.reopened",
    profile,
    metadata: { step_key: stepKey }
  });

  await writeAuditLog({
    profile,
    action: "workflow.step.reopened",
    entityType: "AA_case_workflow_steps",
    entityId: null,
    metadata: { case_id: caseId, step_key: stepKey }
  });

  return { ok: true, message: "Etapa reaberta." };
}
