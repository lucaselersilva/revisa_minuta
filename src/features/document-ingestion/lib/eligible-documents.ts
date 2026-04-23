import type { CaseDocumentType } from "@/types/database";

export const preAnalysisEligibleDocumentTypes: CaseDocumentType[] = [
  "initial_petition",
  "author_documents",
  "initial_amendment"
];

export function isPreAnalysisEligibleDocumentType(documentType: string) {
  return preAnalysisEligibleDocumentTypes.includes(documentType as CaseDocumentType);
}
