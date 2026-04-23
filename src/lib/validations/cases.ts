import { z } from "zod";

export const caseStatuses = ["draft", "in_progress", "review_pending", "completed"] as const;
export const casePartyRoles = ["author", "defendant", "third_party"] as const;
export const caseDocumentTypes = [
  "initial_petition",
  "author_documents",
  "initial_amendment",
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
    case_number: z.string().trim().optional(),
    title: z.string().trim().min(3, "Informe um titulo para o processo."),
    description: z.string().trim().optional(),
    status: z.enum(caseStatuses).default("draft"),
    taxonomy_id: z.string().uuid().optional(),
    responsible_lawyer_id: z.string().uuid().optional(),
    represented_entity: caseEntitySchema,
    parties: z.array(casePartySchema).min(1, "Adicione ao menos uma parte.")
  })
  .superRefine((value, ctx) => {
    if (value.represented_entity.mode === "existing" && !value.represented_entity.entity_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["represented_entity", "entity_id"],
        message: "Selecione a empresa representada."
      });
    }

    if (value.represented_entity.mode === "new" && !value.represented_entity.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["represented_entity", "name"],
        message: "Informe o nome da empresa representada."
      });
    }
  });

export const documentUploadSchema = z.object({
  case_id: z.string().uuid(),
  document_type: z.enum(caseDocumentTypes),
  stage: z.enum(caseDocumentStages)
});

export type CaseFormInput = z.infer<typeof caseFormSchema>;
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
