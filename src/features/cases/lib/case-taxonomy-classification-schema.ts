import { z } from "zod";

const aiUsageTelemetrySchema = z.object({
  input_tokens: z.number().int().min(0),
  output_tokens: z.number().int().min(0),
  cache_creation_input_tokens: z.number().int().min(0),
  cache_read_input_tokens: z.number().int().min(0),
  total_tokens: z.number().int().min(0)
});

export const taxonomyClassificationConfidenceSchema = z.enum(["low", "medium", "high"]);

export const caseTaxonomyClassificationSchema = z.object({
  recommended_taxonomy_code: z.string().trim().min(1).nullable(),
  confidence: taxonomyClassificationConfidenceSchema,
  summary: z.string().trim().min(8),
  rationale: z.string().trim().min(8),
  matched_signals: z.array(z.string().trim().min(2)),
  missing_signals: z.array(z.string().trim().min(2)),
  alternative_taxonomy_codes: z.array(z.string().trim().min(1)).max(3),
  documents_considered: z.array(z.string().trim().min(2)),
  cautionary_notes: z.array(z.string().trim().min(2))
});

export type CaseTaxonomyClassification = z.infer<typeof caseTaxonomyClassificationSchema>;

export const persistedCaseTaxonomySuggestionSchema = z.object({
  prompt_version: z.string().trim().min(2),
  model_name: z.string().trim().min(2).nullable(),
  generated_at: z.string().trim().min(2),
  generated_by: z.string().uuid().nullable(),
  usage: aiUsageTelemetrySchema.optional(),
  source_summary: z.object({
    total_documents: z.number().int().min(0),
    processed_documents: z.number().int().min(0),
    analyzed_documents: z.number().int().min(0)
  }),
  recommendation: z.object({
    taxonomy_id: z.string().uuid().nullable(),
    taxonomy_code: z.string().trim().min(1).nullable(),
    taxonomy_name: z.string().trim().min(1).nullable(),
    confidence: taxonomyClassificationConfidenceSchema,
    summary: z.string().trim().min(2),
    rationale: z.string().trim().min(2),
    matched_signals: z.array(z.string().trim().min(2)),
    missing_signals: z.array(z.string().trim().min(2)),
    alternative_taxonomy_codes: z.array(z.string().trim().min(1)).max(3),
    documents_considered: z.array(z.string().trim().min(2)),
    cautionary_notes: z.array(z.string().trim().min(2))
  }),
  application: z
    .object({
      applied_at: z.string().trim().min(2),
      applied_by: z.string().uuid().nullable(),
      previous_taxonomy_id: z.string().uuid().nullable(),
      previous_taxonomy_code: z.string().trim().min(1).nullable()
    })
    .nullable()
});

export type PersistedCaseTaxonomySuggestion = z.infer<typeof persistedCaseTaxonomySuggestionSchema>;

export function extractPersistedCaseTaxonomySuggestion(metadata: Record<string, unknown> | null | undefined) {
  const parsed = persistedCaseTaxonomySuggestionSchema.safeParse(metadata?.ai_taxonomy_classification);
  return parsed.success ? parsed.data : null;
}
