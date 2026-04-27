"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { bootstrapCaseWorkflow } from "@/features/case-workflow/services/workflow-bootstrap-service";
import { extractCaseDraftFromUploadedDocument } from "@/features/cases/services/case-intake-upload-extraction-service";
import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";
import { writeCaseHistory } from "@/features/cases/services/case-history-service";
import { buildCaseFilePath } from "@/features/cases/services/storage-path";
import { analyzeProcessedDocument } from "@/features/document-ingestion/services/analyze-processed-document";
import { parseDocumentByMimeType } from "@/features/document-ingestion/services/parser-dispatcher";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  caseFormSchema,
  documentUploadSchema,
  registerUploadedCaseDocumentsSchema,
  type CaseFormInput,
  type RegisterUploadedCaseDocumentsInput
} from "@/lib/validations/cases";
import { formatCaseNumber, formatCnpj } from "@/lib/utils";
import { writeAuditLog } from "@/services/audit-log-service";
import type { CaseDocumentStage, CaseDocumentType } from "@/types/database";

export type ActionResult = {
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

function buildImportedCaseTitle({
  extractedTitle,
  caseNumber,
  firstAuthor,
  representedEntity,
  fileName
}: {
  extractedTitle: string | null;
  caseNumber: string | null;
  firstAuthor: string | null;
  representedEntity: string | null;
  fileName: string;
}) {
  if (extractedTitle?.trim()) {
    return extractedTitle.trim();
  }

  if (caseNumber) {
    return `Processo ${caseNumber}`;
  }

  if (firstAuthor && representedEntity) {
    return `${firstAuthor} x ${representedEntity}`;
  }

  return fileName.replace(/\.[^.]+$/, "") || "Processo importado";
}

function normalizeName(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findMatchingEntityIdByName(
  entityName: string | null,
  existingEntities: Array<{ id: string; name: string }>
) {
  const normalizedTarget = normalizeName(entityName);

  if (!normalizedTarget) {
    return null;
  }

  const exact = existingEntities.find((entity) => normalizeName(entity.name) === normalizedTarget);
  if (exact) {
    return exact.id;
  }

  const partial = existingEntities.find((entity) => {
    const normalizedEntity = normalizeName(entity.name);
    return normalizedEntity.includes(normalizedTarget) || normalizedTarget.includes(normalizedEntity);
  });

  return partial?.id ?? null;
}

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
      document: input.document ? formatCnpj(input.document) : null
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
        case_number: parsed.data.case_number ? formatCaseNumber(parsed.data.case_number) : null,
        title: parsed.data.title,
        description: parsed.data.description || null,
        represented_entity_notes: parsed.data.represented_entity_notes || null,
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

export async function createCaseFromUploadAction(
  _previousState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireProfile();

  if (!profile?.office_id) {
    return { ok: false, message: "Perfil interno nao encontrado." };
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, message: "Selecione um arquivo para iniciar o cadastro por upload." };
  }

  if (!allowedMimeTypes.has(file.type)) {
    return { ok: false, message: `Tipo de arquivo nao permitido: ${file.name}` };
  }

  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const caseId = crypto.randomUUID();
  const filePath = buildCaseFilePath({
    officeId: profile.office_id,
    caseId,
    stage: "initial",
    documentType: "initial_petition",
    fileName: file.name
  });

  let uploadedToStorage = false;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseDocumentByMimeType({ mimeType: file.type, buffer });
    const extractionResult = await extractCaseDraftFromUploadedDocument({
      fileName: file.name,
      mimeType: file.type,
      fileBuffer: buffer,
      extractedText: parsed.extractedText
    });
    const [entitiesResult] = await Promise.all([
      supabase
        .from("AA_case_entities")
        .select("id, name")
        .order("name", { ascending: true })
        .returns<Array<{ id: string; name: string }>>()
    ]);

    const extracted = extractionResult.extraction;
    const title = buildImportedCaseTitle({
      extractedTitle: extracted.title,
      caseNumber: extracted.case_number,
      firstAuthor: extracted.authors[0]?.name ?? null,
      representedEntity: extracted.represented_entity_name,
      fileName: file.name
    });

    const { error: caseError } = await supabase.from("AA_cases").insert({
      id: caseId,
      office_id: profile.office_id,
      case_number: extracted.case_number ? formatCaseNumber(extracted.case_number) : null,
      title,
      description:
        extracted.summary && extracted.summary !== "Extracao inicial gerada por fallback textual com baixa confianca operacional."
          ? extracted.summary
          : "Cadastro inicial criado a partir de upload. Revise os dados extraidos antes de seguir.",
      status: "draft",
      taxonomy_id: null,
      responsible_lawyer_id: profile.id,
      created_by: profile.id
    });

    if (caseError) {
      return { ok: false, message: "Nao foi possivel criar o processo a partir do upload." };
    }

    const matchedEntityId = findMatchingEntityIdByName(
      extracted.represented_entity_name,
      entitiesResult.data ?? []
    );
    let entityId = matchedEntityId;

    if (!entityId && extracted.represented_entity_name) {
      const entityInsert = await supabase
        .from("AA_case_entities")
        .insert({
          office_id: profile.office_id,
          name: extracted.represented_entity_name,
          document: extracted.represented_entity_document ? formatCnpj(extracted.represented_entity_document) : null
        })
        .select("id")
        .single<{ id: string }>();

      entityId = entityInsert.data?.id ?? null;
    } else if (entityId && extracted.represented_entity_document) {
      await supabase
        .from("AA_case_entities")
        .update({
          document: formatCnpj(extracted.represented_entity_document)
        })
        .eq("id", entityId)
        .is("document", null);
    }

    if (entityId) {
      await supabase.from("AA_case_entity_links").insert({
        case_id: caseId,
        entity_id: entityId
      });
    }

    if (extracted.authors.length > 0) {
      await supabase.from("AA_case_parties").insert(
        extracted.authors.map((author) => ({
          case_id: caseId,
          role: "author",
          name: author.name,
          document: author.document
        }))
      );
    }

    await bootstrapCaseWorkflow(caseId, profile);

    const { error: uploadError } = await supabase.storage.from("aa-case-files").upload(filePath, file, {
      contentType: file.type,
      upsert: false
    });

    if (uploadError) {
      throw new Error(`Nao foi possivel enviar ${file.name}.`);
    }

    uploadedToStorage = true;

    const documentInsert = await supabase
      .from("AA_case_documents")
      .insert({
        case_id: caseId,
        uploaded_by: profile.id,
        document_type: "initial_petition",
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        stage: "initial"
      })
      .select("id")
      .single<{ id: string }>();

    if (!documentInsert.data?.id) {
      throw new Error("Upload concluido, mas nao foi possivel registrar o documento no processo.");
    }

    let analysisMetadata: Record<string, unknown> = {};
    if (parsed.status === "processed" && parsed.extractedText) {
      const analysis = await analyzeProcessedDocument({
        document: {
          id: documentInsert.data.id,
          case_id: caseId,
          uploaded_by: profile.id,
          document_type: "initial_petition",
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          stage: "initial",
          created_at: new Date().toISOString()
        },
        extractedText: parsed.extractedText,
        fileBuffer: buffer,
        parserType: parsed.parserType,
        parserMetadata: parsed.metadata
      });

      analysisMetadata =
        analysis.status === "completed"
          ? {
              analysis_status: "completed",
              analysis_model_name: analysis.modelName,
              analysis_prompt_version: analysis.promptVersion,
              document_analysis: analysis.report
            }
          : {
              analysis_status: analysis.status,
              analysis_prompt_version: analysis.promptVersion,
              analysis_error_message: analysis.errorMessage
            };
    }

    await supabase.from("AA_document_ingestions").upsert(
      {
        office_id: profile.office_id,
        case_document_id: documentInsert.data.id,
        status: parsed.status,
        parser_type: parsed.parserType,
        extracted_text: parsed.extractedText,
        extracted_text_length: parsed.extractedTextLength,
        detected_language: parsed.detectedLanguage,
        error_message: parsed.errorMessage,
        metadata: {
          ...parsed.metadata,
          ...analysisMetadata,
          file_name: file.name,
          mime_type: file.type,
          intake_prompt_version: extractionResult.promptVersion,
          intake_model_name: extractionResult.modelName,
          intake_usage: extractionResult.usage ?? null,
          intake_used_fallback: extractionResult.usedFallback,
          intake_summary: extracted.summary,
          intake_cautionary_notes: extracted.cautionary_notes
        },
        processed_at: new Date().toISOString()
      },
      { onConflict: "case_document_id" }
    );

    await writeCaseHistory({
      caseId,
      action: "case.created_via_upload",
      profile,
      metadata: {
        file_name: file.name,
        imported_case_number: extracted.case_number,
        imported_authors: extracted.authors,
        represented_entity_name: extracted.represented_entity_name,
        represented_entity_document: extracted.represented_entity_document,
        used_fallback: extractionResult.usedFallback
      }
    });

    await writeCaseHistory({
      caseId,
      action: "document.uploaded",
      profile,
      metadata: {
        count: 1,
        document_type: "initial_petition",
        stage: "initial",
        files: [file.name]
      }
    });

    await writeAuditLog({
      profile,
      action: "case.created_via_upload",
      entityType: "AA_cases",
      entityId: caseId,
      metadata: {
        file_name: file.name,
        imported_case_number: extracted.case_number,
        represented_entity_document: extracted.represented_entity_document,
        used_fallback: extractionResult.usedFallback
      }
    });
  } catch (error) {
    if (uploadedToStorage) {
      await adminSupabase.storage.from("aa-case-files").remove([filePath]);
    }

    await adminSupabase.from("AA_cases").delete().eq("id", caseId);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Nao foi possivel criar o processo por upload."
    };
  }

  redirect(`/app/cases/${caseId}/edit?source=upload`);
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
        case_number: parsed.data.case_number ? formatCaseNumber(parsed.data.case_number) : null,
        title: parsed.data.title,
        description: parsed.data.description || null,
        represented_entity_notes: parsed.data.represented_entity_notes || null,
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

export async function registerUploadedCaseDocumentsAction(
  input: RegisterUploadedCaseDocumentsInput
): Promise<ActionResult> {
  const profile = await requireProfile();

  if (!profile?.office_id) {
    return { ok: false, message: "Perfil interno nao encontrado." };
  }

  const parsed = registerUploadedCaseDocumentsSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Dados invalidos." };
  }

  const officePrefix = `${profile.office_id}/${parsed.data.case_id}/`;
  const invalidPath = parsed.data.files.find((file) => !file.file_path.startsWith(officePrefix));

  if (invalidPath) {
    await cleanupUploadedCaseFilesAction(parsed.data.files.map((file) => file.file_path));
    return { ok: false, message: "Um ou mais arquivos enviados nao pertencem ao processo atual." };
  }

  const invalidFile = parsed.data.files.find((file) => !allowedMimeTypes.has(file.mime_type));

  if (invalidFile) {
    await cleanupUploadedCaseFilesAction(parsed.data.files.map((file) => file.file_path));
    return { ok: false, message: `Tipo de arquivo nao permitido: ${invalidFile.file_name}` };
  }

  const supabase = await createClient();
  const uploadedRows = parsed.data.files.map((file) => ({
    case_id: parsed.data.case_id,
    uploaded_by: profile.id,
    document_type: parsed.data.document_type,
    file_path: file.file_path,
    file_name: file.file_name,
    file_size: file.file_size,
    mime_type: file.mime_type,
    stage: parsed.data.stage
  }));

  const { error } = await supabase.from("AA_case_documents").insert(uploadedRows);

  if (error) {
    await cleanupUploadedCaseFilesAction(uploadedRows.map((row) => row.file_path));
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

export async function cleanupUploadedCaseFilesAction(filePaths: string[]) {
  const profile = await requireProfile();

  if (!profile?.office_id || filePaths.length === 0) {
    return { ok: false };
  }

  const allowedPaths = filePaths.filter((path) => path.startsWith(`${profile.office_id}/`));

  if (allowedPaths.length === 0) {
    return { ok: false };
  }

  const adminSupabase = createAdminClient();
  await adminSupabase.storage.from("aa-case-files").remove(allowedPaths);

  return { ok: true };
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
