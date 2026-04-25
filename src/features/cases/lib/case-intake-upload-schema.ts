import { z } from "zod";

export const caseIntakeUploadAuthorSchema = z.object({
  name: z.string().trim().min(2),
  document: z.string().trim().min(2).nullable()
});

export const caseIntakeUploadExtractionSchema = z.object({
  title: z.string().trim().min(2).nullable(),
  case_number: z.string().trim().min(2).nullable(),
  represented_entity_name: z.string().trim().min(2).nullable(),
  represented_entity_document: z.string().trim().min(2).nullable(),
  authors: z.array(caseIntakeUploadAuthorSchema).max(8),
  summary: z.string().trim().min(2),
  cautionary_notes: z.array(z.string().trim().min(2))
});

export type CaseIntakeUploadExtraction = z.infer<typeof caseIntakeUploadExtractionSchema>;
