import { extractDefensePreparationFromMetadata, normalizeDefensePreparationInput } from "@/features/case-workflow/lib/defense-step";
import { getNextWorkflowStepKey } from "@/features/case-workflow/lib/workflow-steps";
import type { CaseWorkflowState, WorkflowCompletionInput, WorkflowValidationResult } from "@/features/case-workflow/types";
import type { WorkflowStepKey } from "@/types/database";

function hasDocument(state: CaseWorkflowState, types: string[]) {
  return state.caseItem.documents.some((document) => types.includes(document.document_type));
}

function hasRepresentedEntity(state: CaseWorkflowState) {
  return state.caseItem.entity_links.some((link) => Boolean(link.entity));
}

function getDefensePreparation(state: CaseWorkflowState, input: WorkflowCompletionInput) {
  if (input.defensePreparation) {
    return normalizeDefensePreparationInput(input.defensePreparation);
  }

  const defenseStep = state.steps.find((step) => step.step_key === "defesa");
  return extractDefensePreparationFromMetadata(defenseStep?.metadata);
}

export function validateWorkflowStepCompletion(
  state: CaseWorkflowState,
  stepKey: WorkflowStepKey,
  input: WorkflowCompletionInput = {}
): WorkflowValidationResult {
  const missingItems: string[] = [];
  const warnings: string[] = [];
  const nextStep = getNextWorkflowStepKey(stepKey);

  if (stepKey === "cadastro_inicial") {
    if (!state.caseItem.title && !state.caseItem.case_number) {
      missingItems.push("Informe titulo ou numero do processo.");
    }
    if (!state.caseItem.taxonomy_id) {
      missingItems.push("Defina uma taxonomia.");
    }
    if (!state.caseItem.responsible_lawyer_id) {
      missingItems.push("Defina o advogado responsavel.");
    }
    if (state.caseItem.parties.length === 0) {
      missingItems.push("Cadastre pelo menos uma parte.");
    }
    if (!hasRepresentedEntity(state)) {
      missingItems.push("Vincule a empresa representada.");
    }
  }

  if (stepKey === "documentos_autor" && !hasDocument(state, ["initial_petition", "author_documents"])) {
    const initialDocumentTypes = [
      "initial_petition",
      "author_documents",
      "author_identity_document",
      "author_address_proof",
      "author_payment_proof",
      "author_screen_capture"
    ];
    if (!hasDocument(state, initialDocumentTypes)) {
      missingItems.push("Anexe a peticao inicial ou documentos relevantes do autor.");
    }
  }

  if (stepKey === "emenda_inicial") {
    const amendmentDocumentTypes = ["initial_amendment", "initial_amendment_documents"];
    if (!hasDocument(state, amendmentDocumentTypes)) {
      warnings.push("Nenhuma emenda foi anexada. A etapa pode ser concluida manualmente ou marcada como nao se aplica.");
    }
  }

  if (stepKey === "pre_analise" && !input.preAnalysisConfirmed) {
    if (!state.preAnalysis?.latestCompletedReport) {
      missingItems.push("Gere um laudo previo concluido.");
    }
    if (!state.preAnalysis?.latestAcknowledgementForLatestReport) {
      missingItems.push("Confirme explicitamente a leitura do laudo mais recente.");
    }
  }

  if (stepKey === "defesa" && !hasDocument(state, ["defense"])) {
    missingItems.push("Anexe a contestacao.");
  }

  if (stepKey === "defesa") {
    const defensePreparation = getDefensePreparation(state, input);

    if (!state.preAnalysis?.latestCompletedReport) {
      missingItems.push("Gere um laudo previo concluido antes de fechar a defesa.");
    }
    if (!state.preAnalysis?.latestAcknowledgementForLatestReport) {
      missingItems.push("Confirme a leitura do laudo previo mais recente antes de concluir a defesa.");
    }
    if (!defensePreparation.preAnalysisReviewed) {
      missingItems.push("Confirme que a pre-analise foi revisada para orientar a defesa.");
    }
    if (!defensePreparation.defenseStrategyDefined) {
      missingItems.push("Confirme que a linha defensiva principal foi definida.");
    }
    if (!defensePreparation.defenseDocumentsReviewed) {
      missingItems.push("Confirme que os documentos defensivos foram revisados.");
    }
  }

  if (stepKey === "revisao_final") {
    const checklist = input.finalReviewChecklist;
    if (!checklist?.defenseAttached) {
      missingItems.push("Confirme que a contestacao esta anexada.");
    }
    if (!checklist?.defenseDocumentsReviewed) {
      missingItems.push("Confirme que os documentos defensivos foram revisados.");
    }
    if (!checklist?.readyForFutureFinalAnalysis) {
      missingItems.push("Confirme que a etapa esta pronta para a futura analise final.");
    }
  }

  return {
    isValid: missingItems.length === 0,
    missingItems,
    warnings,
    nextStep
  };
}
