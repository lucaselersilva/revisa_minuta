"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";

export async function processCaseInitialDocumentsAction(caseId: string) {
  const { profile } = await getCurrentProfile();

  if (!profile?.office_id) {
    return { ok: false, message: "Perfil interno nao encontrado." };
  }

  const { processCaseInitialDocuments } = await import("@/features/document-ingestion/services/process-case-initial-documents");
  const result = await processCaseInitialDocuments(caseId, profile);
  revalidatePath(`/app/cases/${caseId}`);
  return result;
}
