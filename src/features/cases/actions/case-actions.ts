"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { bootstrapCaseWorkflow } from "@/features/case-workflow/services/workflow-bootstrap-service";
import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";
import { writeCaseHistory } from "@/features/cases/services/case-history-service";
import { buildCaseFilePath } from "@/features/cases/services/storage-path";
import { createClient } from "@/lib/supabase/server";
import { caseFormSchema, documentUploadSchema, type CaseFormInput } from "@/lib/validations/cases";
import { writeAuditLog } from "@/services/audit-log-service";
import type { CaseDocumentStage, CaseDocumentType } from "@/types/database";

type ActionResult = {
  ok: boolean;
  message: string;
};

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

async function requireProfile() {
  const { profile } = await getCurrentProfile();
  return profile?.office_id ? profile : null;
}

async function resolveRepresentedEntity(input: CaseFormInput["represented_entity"], officeId: string) {
  const supabase = await createClient();

  if (input.mode === "existing" && input.entity_id) {
    return input.entity_id;
  }

  const { data, error } = await supabase
    .from("AA_case_entities")
    .insert({
      office_id: officeId,
      name: input.name,
      document: input.document || null
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw new Error("Nao foi possivel cadastrar a empresa representada.");
  }

  return data.id;
}

export async function createCaseAction(input: CaseFormInput): Promise<ActionResult> {
  const profile = await requireProfile();

  if (!profile) {
    return { ok: false, message: "Perfil interno nao encontrado." };
  }

  const parsed = caseFormSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Dados invalidos." };
  }

  const supabase = await createClient();
  let createdCaseId: string | null = null;

  try {
    const entityId = await resolveRepresentedEntity(parsed.data.represented_entity, profile.office_id!);
    const { data: createdCase, error } = await supabase
      .from("AA_cases")
      .insert({
        office_id: profile.office_id,
        case_number: parsed.data.case_number || null,
        title: parsed.data.title,
        description: parsed.data.description || null,
        status: parsed.data.status,
        taxonomy_id: parsed.data.taxonomy_id || null,
        responsible_lawyer_id: parsed.data.responsible_lawyer_id || null,
        created_by: profile.id
      })
      .select("id")
      .single<{ id: string }>();

    if (error) {
      return { ok: false, message: "Nao foi possivel criar o processo." };
    }

    await supabase.from("AA_case_entity_links").insert({
      case_id: createdCase.id,
      entity_id: entityId
    });

    await supabase.from("AA_case_parties").insert(
      parsed.data.parties.map((party) => ({
        case_id: createdCase.id,
        role: party.role,
        name: party.name,
        document: party.document || null
      }))
    );

    createdCaseId = createdCase.id;
    await bootstrapCaseWorkflow(createdCase.id, profile);

    await writeCaseHistory({
      caseId: createdCase.id,
      action: "case.created",
      profile,
      metadata: { title: parsed.data.title, case_number: parsed.data.case_number || null }
    });

    await writeAuditLog({
      profile,
      action: "case.created",
      entityType: "AA_cases",
      entityId: createdCase.id,
      metadata: { title: parsed.data.title }
    });

    revalidatePath("/app/cases");
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Nao foi possivel criar o processo." };
  }

  redirect(`/app/cases/${createdCaseId}`);
}

export async function updateCaseAction(id: string, input: CaseFormInput): Promise<ActionResult> {
  const profile = await requireProfile();

  if (!profile) {
    return { ok: false, message: "Perfil interno nao encontrado." };
  }

  const parsed = caseFormSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Dados invalidos." };
  }

  const supabase = await createClient();
  let shouldRedirect = false;

  try {
    const entityId = await resolveRepresentedEntity(parsed.data.represented_entity, profile.office_id!);
    const { error } = await supabase
      .from("AA_cases")
      .update({
        case_number: parsed.data.case_number || null,
        title: parsed.data.title,
        description: parsed.data.description || null,
        status: parsed.data.status,
        taxonomy_id: parsed.data.taxonomy_id || null,
        responsible_lawyer_id: parsed.data.responsible_lawyer_id || null
      })
      .eq("id", id)
      .eq("office_id", profile.office_id);

    if (error) {
      return { ok: false, message: "Nao foi possivel editar o processo. Verifique sua permissao." };
    }

    await supabase.from("AA_case_parties").delete().eq("case_id", id);
    await supabase.from("AA_case_parties").insert(
      parsed.data.parties.map((party) => ({
        case_id: id,
        role: party.role,
        name: party.name,
        document: party.document || null
      }))
    );

    await supabase.from("AA_case_entity_links").delete().eq("case_id", id);
    await supabase.from("AA_case_entity_links").insert({
      case_id: id,
      entity_id: entityId
    });

    await writeCaseHistory({
      caseId: id,
      action: "case.updated",
      profile,
      metadata: { title: parsed.data.title, status: parsed.data.status }
    });

    await writeAuditLog({
      profile,
      action: "case.updated",
      entityType: "AA_cases",
      entityId: id,
      metadata: { title: parsed.data.title }
    });

    revalidatePath("/app/cases");
    revalidatePath(`/app/cases/${id}`);
    shouldRedirect = true;
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Nao foi possivel editar o processo." };
  }

  if (shouldRedirect) {
    redirect(`/app/cases/${id}`);
  }

  return { ok: true, message: "Processo atualizado." };
}

export async function uploadCaseDocumentsAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireProfile();

  if (!profile) {
    return { ok: false, message: "Perfil interno nao encontrado." };
  }

  const parsed = documentUploadSchema.safeParse({
    case_id: formData.get("case_id"),
    document_type: formData.get("document_type"),
    stage: formData.get("stage")
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Dados invalidos." };
  }

  const files = formData.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);

  if (files.length === 0) {
    return { ok: false, message: "Selecione ao menos um arquivo." };
  }

  const invalidFile = files.find((file) => !allowedMimeTypes.has(file.type));

  if (invalidFile) {
    return { ok: false, message: `Tipo de arquivo nao permitido: ${invalidFile.name}` };
  }

  const supabase = await createClient();
  const uploadedRows = [];

  for (const file of files) {
    const filePath = buildCaseFilePath({
      officeId: profile.office_id!,
      caseId: parsed.data.case_id,
      stage: parsed.data.stage as CaseDocumentStage,
      documentType: parsed.data.document_type as CaseDocumentType,
      fileName: file.name
    });

    const { error: uploadError } = await supabase.storage.from("aa-case-files").upload(filePath, file, {
      contentType: file.type,
      upsert: false
    });

    if (uploadError) {
      return { ok: false, message: `Nao foi possivel enviar ${file.name}.` };
    }

    uploadedRows.push({
      case_id: parsed.data.case_id,
      uploaded_by: profile.id,
      document_type: parsed.data.document_type,
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      stage: parsed.data.stage
    });
  }

  const { error } = await supabase.from("AA_case_documents").insert(uploadedRows);

  if (error) {
    await supabase.storage.from("aa-case-files").remove(uploadedRows.map((row) => row.file_path));
    return { ok: false, message: "Upload concluido, mas nao foi possivel salvar os metadados." };
  }

  await writeCaseHistory({
    caseId: parsed.data.case_id,
    action: "document.uploaded",
    profile,
    metadata: {
      count: uploadedRows.length,
      document_type: parsed.data.document_type,
      stage: parsed.data.stage,
      files: uploadedRows.map((row) => row.file_name)
    }
  });

  revalidatePath(`/app/cases/${parsed.data.case_id}`);
  return { ok: true, message: uploadedRows.length === 1 ? "Documento enviado." : "Documentos enviados." };
}

export async function removeCaseDocumentAction(documentId: string, caseId: string, filePath: string): Promise<ActionResult> {
  const profile = await requireProfile();

  if (!profile) {
    return { ok: false, message: "Perfil interno nao encontrado." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("AA_case_documents").delete().eq("id", documentId);

  if (error) {
    return { ok: false, message: "Nao foi possivel remover o documento. Verifique sua permissao." };
  }

  await supabase.storage.from("aa-case-files").remove([filePath]);
  await writeCaseHistory({
    caseId,
    action: "document.removed",
    profile,
    metadata: { document_id: documentId, file_path: filePath }
  });

  revalidatePath(`/app/cases/${caseId}`);
  return { ok: true, message: "Documento removido." };
}
