import { z } from "zod";

export const caseStatuses = ["draft", "in_progress", "review_pending", "completed"] as const;
export const casePartyRoles = ["author", "defendant", "third_party"] as const;
export const caseDocumentTypes = [
  "initial_petition",
  "author_documents",
  "author_identity_document",
  "author_address_proof",
  "author_payment_proof",
  "author_screen_capture",
  "initial_amendment",
  "initial_amendment_documents",
  "defense",
  "defense_documents",
  "other"
] as const;
export const caseDocumentStages = ["initial", "pre_analysis", "defense", "final_review"] as const;

export const casePartySchema = z.object({
  role: z.enum(casePartyRoles),
  name: z.string().trim().min(2, "Informe o nome da parte."),
  document: z.string().trim().optional()
});

export const caseEntitySchema = z.object({
  mode: z.enum(["existing", "new"]),
  entity_id: z.string().uuid().optional(),
  name: z.string().trim().optional(),
  document: z.string().trim().optional()
});

export const caseFormSchema = z
  .object({
    portfolio_id: z.string().uuid("Selecione a carteira do processo."),
    case_number: z.string().trim().optional(),
    title: z.string().trim().min(3, "Informe um titulo para o processo."),
    description: z.string().trim().optional(),
    represented_entity_notes: z.string().trim().optional(),
    status: z.enum(caseStatuses).default("draft"),
    taxonomy_id: z.string().uuid().optional(),
    responsible_lawyer_id: z.string().uuid().optional(),
    represented_entity: caseEntitySchema,
    parties: z.array(casePartySchema).min(1, "Adicione ao menos uma parte.")
  })
  .superRefine((value, ctx) => {
    if (value.represented_entity.mode !== "existing") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["represented_entity", "mode"],
        message: "Selecione uma empresa previamente cadastrada."
      });
    }

    if (value.represented_entity.mode === "existing" && !value.represented_entity.entity_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["represented_entity", "entity_id"],
        message: "Selecione a empresa representada."
      });
    }
  });

export const documentUploadSchema = z.object({
  case_id: z.string().uuid(),
  document_type: z.enum(caseDocumentTypes),
  stage: z.enum(caseDocumentStages)
});

export const uploadedCaseDocumentSchema = z.object({
  file_path: z.string().min(1),
  file_name: z.string().min(1),
  file_size: z.number().int().positive(),
  mime_type: z.string().min(1)
});

export const registerUploadedCaseDocumentsSchema = documentUploadSchema.extend({
  files: z.array(uploadedCaseDocumentSchema).min(1, "Selecione ao menos um arquivo.")
});

export type CaseFormInput = z.infer<typeof caseFormSchema>;
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
export type RegisterUploadedCaseDocumentsInput = z.infer<typeof registerUploadedCaseDocumentsSchema>;
