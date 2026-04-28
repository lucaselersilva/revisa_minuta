"use server";

import { revalidatePath } from "next/cache";

import { requireAdminProfile } from "@/features/profiles/queries/get-current-profile";
import { createClient } from "@/lib/supabase/server";
import {
  portfolioCaseTemplateSchema,
  portfolioDocumentRequirementSchema,
  portfolioLegalThesisSchema,
  type PortfolioCaseTemplateInput,
  type PortfolioDocumentRequirementInput,
  type PortfolioLegalThesisInput
} from "@/lib/validations/legal-config";
import { writeAuditLog } from "@/services/audit-log-service";

type ActionResult = {
  ok: boolean;
  message: string;
};

function revalidateLegalConfigPaths() {
  revalidatePath("/app/admin/legal-config");
  revalidatePath("/app/cases");
}

export async function createDocumentRequirementAction(input: PortfolioDocumentRequirementInput): Promise<ActionResult> {
  const profile = await requireAdminProfile();
  if (!profile?.office_id) {
    return { ok: false, message: "Acesso restrito a administradores." };
  }

  const parsed = portfolioDocumentRequirementSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Dados invalidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("AA_portfolio_document_requirements")
    .insert({
      office_id: profile.office_id,
      ...parsed.data
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    return { ok: false, message: "Nao foi possivel criar o requisito documental." };
  }

  await writeAuditLog({
    profile,
    action: "legal_config.document_requirement.created",
    entityType: "AA_portfolio_document_requirements",
    entityId: data.id,
    metadata: parsed.data
  });

  revalidateLegalConfigPaths();
  return { ok: true, message: "Requisito documental criado." };
}

export async function updateDocumentRequirementAction(id: string, input: PortfolioDocumentRequirementInput): Promise<ActionResult> {
  const profile = await requireAdminProfile();
  if (!profile?.office_id) {
    return { ok: false, message: "Acesso restrito a administradores." };
  }

  const parsed = portfolioDocumentRequirementSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Dados invalidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("AA_portfolio_document_requirements")
    .update(parsed.data)
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) {
    return { ok: false, message: "Nao foi possivel atualizar o requisito documental." };
  }

  await writeAuditLog({
    profile,
    action: "legal_config.document_requirement.updated",
    entityType: "AA_portfolio_document_requirements",
    entityId: id,
    metadata: parsed.data
  });

  revalidateLegalConfigPaths();
  return { ok: true, message: "Requisito documental atualizado." };
}

export async function createLegalThesisAction(input: PortfolioLegalThesisInput): Promise<ActionResult> {
  const profile = await requireAdminProfile();
  if (!profile?.office_id) {
    return { ok: false, message: "Acesso restrito a administradores." };
  }

  const parsed = portfolioLegalThesisSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Dados invalidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("AA_portfolio_legal_theses")
    .insert({
      office_id: profile.office_id,
      ...parsed.data
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    return { ok: false, message: "Nao foi possivel criar a tese." };
  }

  await writeAuditLog({
    profile,
    action: "legal_config.thesis.created",
    entityType: "AA_portfolio_legal_theses",
    entityId: data.id,
    metadata: parsed.data
  });

  revalidateLegalConfigPaths();
  return { ok: true, message: "Tese criada." };
}

export async function updateLegalThesisAction(id: string, input: PortfolioLegalThesisInput): Promise<ActionResult> {
  const profile = await requireAdminProfile();
  if (!profile?.office_id) {
    return { ok: false, message: "Acesso restrito a administradores." };
  }

  const parsed = portfolioLegalThesisSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Dados invalidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("AA_portfolio_legal_theses")
    .update(parsed.data)
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) {
    return { ok: false, message: "Nao foi possivel atualizar a tese." };
  }

  await writeAuditLog({
    profile,
    action: "legal_config.thesis.updated",
    entityType: "AA_portfolio_legal_theses",
    entityId: id,
    metadata: parsed.data
  });

  revalidateLegalConfigPaths();
  return { ok: true, message: "Tese atualizada." };
}

export async function createCaseTemplateAction(input: PortfolioCaseTemplateInput): Promise<ActionResult> {
  const profile = await requireAdminProfile();
  if (!profile?.office_id) {
    return { ok: false, message: "Acesso restrito a administradores." };
  }

  const parsed = portfolioCaseTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Dados invalidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("AA_portfolio_case_templates")
    .insert({
      office_id: profile.office_id,
      ...parsed.data
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    return { ok: false, message: "Nao foi possivel criar o modelo-base." };
  }

  await writeAuditLog({
    profile,
    action: "legal_config.template.created",
    entityType: "AA_portfolio_case_templates",
    entityId: data.id,
    metadata: parsed.data
  });

  revalidateLegalConfigPaths();
  return { ok: true, message: "Modelo-base criado." };
}

export async function updateCaseTemplateAction(id: string, input: PortfolioCaseTemplateInput): Promise<ActionResult> {
  const profile = await requireAdminProfile();
  if (!profile?.office_id) {
    return { ok: false, message: "Acesso restrito a administradores." };
  }

  const parsed = portfolioCaseTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Dados invalidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("AA_portfolio_case_templates")
    .update(parsed.data)
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) {
    return { ok: false, message: "Nao foi possivel atualizar o modelo-base." };
  }

  await writeAuditLog({
    profile,
    action: "legal_config.template.updated",
    entityType: "AA_portfolio_case_templates",
    entityId: id,
    metadata: parsed.data
  });

  revalidateLegalConfigPaths();
  return { ok: true, message: "Modelo-base atualizado." };
}
