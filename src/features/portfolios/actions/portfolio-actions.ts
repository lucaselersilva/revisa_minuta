"use server";

import { revalidatePath } from "next/cache";

import { requireAdminProfile } from "@/features/profiles/queries/get-current-profile";
import { createClient } from "@/lib/supabase/server";
import { portfolioSchema, type PortfolioInput } from "@/lib/validations/portfolios";
import { writeAuditLog } from "@/services/audit-log-service";

type ActionResult = {
  ok: boolean;
  message: string;
};

const defaultWorkflowRules = [
  ["cadastro_inicial", "case_basic_data_required", "Dados basicos, carteira, taxonomia, responsavel, partes e empresa representada"],
  ["documentos_autor", "initial_petition_required", "Peticao inicial ou documentos do autor anexados"],
  ["documentos_autor", "author_documents_required", "Documentos do autor anexados quando aplicavel"],
  ["defesa", "defense_document_required", "Contestacao anexada"]
] as const;

async function seedPortfolioWorkflowRules(supabase: Awaited<ReturnType<typeof createClient>>, officeId: string, portfolioId: string) {
  await supabase.from("AA_workflow_rules").upsert(
    defaultWorkflowRules.map(([step_key, rule_key, rule_label]) => ({
      office_id: officeId,
      portfolio_id: portfolioId,
      step_key,
      rule_key,
      rule_label
    })),
    { onConflict: "portfolio_id,step_key,rule_key" }
  );
}

export async function createPortfolioAction(input: PortfolioInput): Promise<ActionResult> {
  const profile = await requireAdminProfile();

  if (!profile?.office_id) {
    return { ok: false, message: "Acesso restrito a administradores." };
  }

  const parsed = portfolioSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Dados invalidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("AA_portfolios")
    .insert({
      office_id: profile.office_id,
      ...parsed.data
    })
    .select("id, name, slug")
    .single<{ id: string; name: string; slug: string }>();

  if (error) {
    return { ok: false, message: "Nao foi possivel criar a carteira. Verifique se o identificador ja existe." };
  }

  await seedPortfolioWorkflowRules(supabase, profile.office_id, data.id);
  await writeAuditLog({
    profile,
    action: "portfolio.created",
    entityType: "AA_portfolios",
    entityId: data.id,
    metadata: { name: data.name, slug: data.slug }
  });

  revalidatePath("/app/admin/portfolios");
  revalidatePath("/app/admin/entities");
  revalidatePath("/app/admin/taxonomies");
  revalidatePath("/app/cases");
  return { ok: true, message: "Carteira criada." };
}

export async function updatePortfolioAction(id: string, input: PortfolioInput): Promise<ActionResult> {
  const profile = await requireAdminProfile();

  if (!profile?.office_id) {
    return { ok: false, message: "Acesso restrito a administradores." };
  }

  const parsed = portfolioSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Dados invalidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("AA_portfolios")
    .update(parsed.data)
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) {
    return { ok: false, message: "Nao foi possivel atualizar a carteira." };
  }

  await writeAuditLog({
    profile,
    action: "portfolio.updated",
    entityType: "AA_portfolios",
    entityId: id,
    metadata: parsed.data
  });

  revalidatePath("/app/admin/portfolios");
  revalidatePath("/app/admin/entities");
  revalidatePath("/app/admin/taxonomies");
  revalidatePath("/app/cases");
  return { ok: true, message: "Carteira atualizada." };
}
