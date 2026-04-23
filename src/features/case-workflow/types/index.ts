import type { CaseDetail } from "@/features/cases/types";
import type { PreAnalysisSnapshot } from "@/features/document-ingestion/types";
import type { CaseWorkflow, CaseWorkflowStep, WorkflowStepKey } from "@/types/database";

export type WorkflowValidationResult = {
  isValid: boolean;
  missingItems: string[];
  warnings: string[];
  nextStep: WorkflowStepKey | null;
};

export type CaseWorkflowState = {
  caseItem: CaseDetail;
  workflow: CaseWorkflow;
  steps: CaseWorkflowStep[];
  currentStep: CaseWorkflowStep;
  progress: number;
  preAnalysis: PreAnalysisSnapshot | null;
  currentValidation: WorkflowValidationResult;
};

export type WorkflowCompletionInput = {
  preAnalysisConfirmed?: boolean;
  finalReviewChecklist?: {
    defenseAttached: boolean;
    defenseDocumentsReviewed: boolean;
    readyForFutureFinalAnalysis: boolean;
  };
};
