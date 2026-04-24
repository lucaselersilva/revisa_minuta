import { z } from "zod";

export const documentAnalysisKindSchema = z.enum([
  "email_print",
  "whatsapp_print",
  "financial_record",
  "platform_print",
  "identity_document",
  "procuration",
  "travel_record",
  "general_attachment"
]);

export const documentAnalysisSeveritySchema = z.enum(["low", "medium", "high"]);
export const documentAnalysisConfidenceSchema = z.enum(["low", "medium", "high"]);

export const structuredDocumentAnalysisSchema = z.object({
  inferred_document_kind: documentAnalysisKindSchema,
  summary: z.string().min(10),
  participants: z.array(z.string().min(1)),
  dates: z.array(z.string().min(1)),
  monetary_values: z.array(z.string().min(1)),
  key_findings: z.array(
    z.object({
      title: z.string().min(2),
      category: z.string().min(2),
      severity: documentAnalysisSeveritySchema,
      evidence: z.string().min(2)
    })
  ),
  defensive_implications: z.array(z.string().min(2)),
  confidence: documentAnalysisConfidenceSchema
});
