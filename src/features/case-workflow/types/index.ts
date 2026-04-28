import type { CaseDetail } from "@/features/cases/types";
import type { PreAnalysisSnapshot } from "@/features/document-ingestion/types";
import type {
  CaseWorkflow,
  CaseWorkflowStep,
  PortfolioCaseTemplate,
  PortfolioDocumentRequirement,
  PortfolioLegalThesis,
  WorkflowStepKey
} from "@/types/database";

export type WorkflowValidationResult = {
  isValid: boolean;
  missingItems: string[];
  warnings: string[];
  nextStep: WorkflowStepKey | null;
};

export type DefensePreparationInput = {
  preAnalysisReviewed: boolean;
  defenseStrategyDefined: boolean;
  defenseDocumentsReviewed: boolean;
  notes: string;
};

export type CaseWorkflowState = {
  caseItem: CaseDetail;
  workflow: CaseWorkflow;
  steps: CaseWorkflowStep[];
  currentStep: CaseWorkflowStep;
  progress: number;
  preAnalysis: PreAnalysisSnapshot | null;
  legalConfig: {
    requirements: PortfolioDocumentRequirement[];
    theses: PortfolioLegalThesis[];
    templates: PortfolioCaseTemplate[];
  };
  currentValidation: WorkflowValidationResult;
};

export type WorkflowCompletionInput = {
  preAnalysisConfirmed?: boolean;
  defensePreparation?: DefensePreparationInput;
  finalReviewChecklist?: {
    defenseAttached: boolean;
    defenseDocumentsReviewed: boolean;
    readyForFutureFinalAnalysis: boolean;
  };
};
