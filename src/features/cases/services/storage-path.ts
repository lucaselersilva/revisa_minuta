import type { CaseDocumentStage, CaseDocumentType } from "@/types/database";

function sanitizeFileName(fileName: string) {
  const clean = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return clean || "documento";
}

export function buildCaseFilePath({
  officeId,
  caseId,
  stage,
  documentType,
  fileName
}: {
  officeId: string;
  caseId: string;
  stage: CaseDocumentStage;
  documentType: CaseDocumentType;
  fileName: string;
}) {
  const uniquePrefix = `${Date.now()}-${crypto.randomUUID()}`;
  return `${officeId}/${caseId}/${stage}/${documentType}/${uniquePrefix}-${sanitizeFileName(fileName)}`;
}
