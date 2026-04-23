import { workflowSteps } from "@/features/case-workflow/lib/workflow-steps";
import { writeCaseHistory } from "@/features/cases/services/case-history-service";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/types/database";

export async function bootstrapCaseWorkflow(caseId: string, profile: Profile) {
  const supabase = createAdminClient();

  const { error: workflowError } = await supabase
    .from("AA_case_workflows")
    .upsert(
      {
        case_id: caseId,
        current_step: "cadastro_inicial",
        status: "in_progress",
        started_at: new Date().toISOString()
      },
      { onConflict: "case_id", ignoreDuplicates: true }
    );

  if (workflowError) {
    console.error("Failed to bootstrap AA_case_workflows", workflowError);
    throw new Error("Nao foi possivel iniciar o fluxo do processo.");
  }

  const now = new Date().toISOString();
  const { error: stepsError } = await supabase
    .from("AA_case_workflow_steps")
    .upsert(
      workflowSteps.map((step) => ({
        case_id: caseId,
        step_key: step.key,
        step_order: step.order,
        status: step.key === "cadastro_inicial" ? "available" : "locked",
        is_required: step.required,
        started_at: step.key === "cadastro_inicial" ? now : null
      })),
      { onConflict: "case_id,step_key", ignoreDuplicates: true }
    );

  if (stepsError) {
    console.error("Failed to bootstrap AA_case_workflow_steps", stepsError);
    throw new Error("Nao foi possivel criar as etapas do fluxo.");
  }

  await writeCaseHistory({
    caseId,
    action: "workflow.created",
    profile,
    metadata: {
      current_step: "cadastro_inicial",
      steps: workflowSteps.map((step) => step.key)
    }
  });
}
