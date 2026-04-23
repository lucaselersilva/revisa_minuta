import { bootstrapCaseWorkflow } from "@/features/case-workflow/services/workflow-bootstrap-service";
import { getCaseWorkflowState } from "@/features/case-workflow/services/workflow-engine";
import { getCaseById } from "@/features/cases/queries/get-cases";
import type { Profile } from "@/types/database";

export async function getCaseWorkflowStateQuery(caseId: string) {
  return getCaseWorkflowState(caseId);
}

export async function getOrCreateCaseWorkflowStateQuery(caseId: string, profile: Profile) {
  const state = await getCaseWorkflowState(caseId);

  if (state) {
    return state;
  }

  const caseItem = await getCaseById(caseId);

  if (!caseItem) {
    return null;
  }

  await bootstrapCaseWorkflow(caseId, profile);
  return getCaseWorkflowState(caseId);
}
