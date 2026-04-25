import type { DefensePreparationInput } from "@/features/case-workflow/types";

export const defaultDefensePreparationInput: DefensePreparationInput = {
  preAnalysisReviewed: false,
  defenseStrategyDefined: false,
  defenseDocumentsReviewed: false,
  notes: ""
};

export function normalizeDefensePreparationInput(
  value: Partial<DefensePreparationInput> | null | undefined
): DefensePreparationInput {
  return {
    preAnalysisReviewed: Boolean(value?.preAnalysisReviewed),
    defenseStrategyDefined: Boolean(value?.defenseStrategyDefined),
    defenseDocumentsReviewed: Boolean(value?.defenseDocumentsReviewed),
    notes: typeof value?.notes === "string" ? value.notes : ""
  };
}

export function extractDefensePreparationFromMetadata(metadata: Record<string, unknown> | null | undefined) {
  const payload = metadata?.defense_preparation;

  if (!payload || typeof payload !== "object") {
    return defaultDefensePreparationInput;
  }

  return normalizeDefensePreparationInput(payload as Partial<DefensePreparationInput>);
}
