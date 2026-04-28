import { z } from "zod";

import { caseDocumentTypes } from "@/lib/validations/cases";

const workflowStepKeys = [
  "cadastro_inicial",
  "documentos_autor",
  "emenda_inicial",
  "pre_analise",
  "defesa",
  "revisao_final",
  "relatorio"
] as const;

const promptAnalysisTypes = ["pre_analysis", "defense_conformity"] as const;

export const portfolioDocumentRequirementSchema = z.object({
  portfolio_id: z.string().uuid("Selecione a carteira."),
  taxonomy_id: z.string().uuid().optional().nullable(),
  step_key: z.enum(workflowStepKeys),
  document_type: z.enum(caseDocumentTypes),
  requirement_label: z.string().trim().min(2, "Informe o nome do requisito.").max(160, "Use ate 160 caracteres."),
  requirement_details: z.string().trim().max(600, "Use ate 600 caracteres.").optional().transform((value) => value || null),
  is_required: z.boolean().default(true),
  is_active: z.boolean().default(true)
});

export const portfolioLegalThesisSchema = z.object({
  portfolio_id: z.string().uuid("Selecione a carteira."),
  taxonomy_id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(3, "Informe o titulo da tese.").max(180, "Use ate 180 caracteres."),
  summary: z.string().trim().min(8, "Informe um resumo da tese.").max(2000, "Use ate 2000 caracteres."),
  legal_basis: z.string().trim().max(1200, "Use ate 1200 caracteres.").optional().transform((value) => value || null),
  applicability_notes: z.string().trim().max(1200, "Use ate 1200 caracteres.").optional().transform((value) => value || null),
  is_active: z.boolean().default(true)
});

export const portfolioCaseTemplateSchema = z.object({
  portfolio_id: z.string().uuid("Selecione a carteira."),
  taxonomy_id: z.string().uuid("Selecione a taxonomia."),
  title: z.string().trim().min(3, "Informe o titulo do modelo.").max(180, "Use ate 180 caracteres."),
  template_markdown: z.string().trim().min(20, "Informe o conteúdo do modelo-base."),
  usage_notes: z.string().trim().max(1200, "Use ate 1200 caracteres.").optional().transform((value) => value || null),
  is_active: z.boolean().default(true)
});

export const portfolioPromptProfileSchema = z.object({
  portfolio_id: z.string().uuid("Selecione a carteira."),
  taxonomy_id: z.string().uuid().optional().nullable(),
  analysis_type: z.enum(promptAnalysisTypes),
  profile_name: z.string().trim().min(3, "Informe o nome do perfil.").max(120, "Use ate 120 caracteres."),
  instruction_priority: z.string().trim().max(1500, "Use ate 1500 caracteres.").optional().transform((value) => value || null),
  must_check_items: z.string().trim().max(2000, "Use ate 2000 caracteres.").optional().transform((value) => value || null),
  forbidden_assumptions: z.string().trim().max(1500, "Use ate 1500 caracteres.").optional().transform((value) => value || null),
  preferred_reasoning_style: z.string().trim().max(1000, "Use ate 1000 caracteres.").optional().transform((value) => value || null),
  output_emphasis: z.string().trim().max(1500, "Use ate 1500 caracteres.").optional().transform((value) => value || null),
  additional_instructions: z.string().trim().max(2000, "Use ate 2000 caracteres.").optional().transform((value) => value || null),
  is_active: z.boolean().default(true)
});

export type PortfolioDocumentRequirementInput = z.infer<typeof portfolioDocumentRequirementSchema>;
export type PortfolioLegalThesisInput = z.infer<typeof portfolioLegalThesisSchema>;
export type PortfolioCaseTemplateInput = z.infer<typeof portfolioCaseTemplateSchema>;
export type PortfolioPromptProfileInput = z.infer<typeof portfolioPromptProfileSchema>;
