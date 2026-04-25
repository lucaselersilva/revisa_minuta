import type { CaseDocumentType } from "@/types/database";

export const preAnalysisEligibleDocumentTypes: CaseDocumentType[] = [
  "initial_petition",
  "author_documents",
  "author_identity_document",
  "author_address_proof",
  "author_payment_proof",
  "author_screen_capture",
  "initial_amendment",
  "initial_amendment_documents"
];

export function isPreAnalysisEligibleDocumentType(documentType: string) {
  return preAnalysisEligibleDocumentTypes.includes(documentType as CaseDocumentType);
}
