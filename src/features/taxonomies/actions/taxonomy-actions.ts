"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";
import { createClient } from "@/lib/supabase/server";
import { taxonomySchema, type TaxonomyInput } from "@/lib/validations/taxonomies";
import { writeAuditLog } from "@/services/audit-log-service";

type ActionResult = {
  ok: boolean;
  message: string;
};

async function requireAdmin() {
  const { profile } = await getCurrentProfile();

  if (!profile || profile.role !== "admin" || !profile.office_id) {
    return null;
  }

  return profile;
}

export async function createTaxonomyAction(input: TaxonomyInput): Promise<ActionResult> {
  const profile = await requireAdmin();

  if (!profile) {
    return { ok: false, message: "Acesso restrito a administradores." };
  }

  const parsed = taxonomySchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Dados invalidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("AA_taxonomies")
    .insert({
      office_id: profile.office_id,
      ...parsed.data
    })
    .select("id, code, name")
    .single();

  if (error) {
    return { ok: false, message: "Nao foi possivel criar a taxonomia. Verifique se o codigo ja existe." };
  }

  await writeAuditLog({
    profile,
    action: "taxonomy.created",
    entityType: "AA_taxonomies",
    entityId: data.id,
    metadata: { code: data.code, name: data.name }
  });

  revalidatePath("/app/admin/taxonomies");
  return { ok: true, message: "Taxonomia criada." };
}

export async function updateTaxonomyAction(id: string, input: TaxonomyInput): Promise<ActionResult> {
  const profile = await requireAdmin();

  if (!profile) {
    return { ok: false, message: "Acesso restrito a administradores." };
  }

  const parsed = taxonomySchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Dados invalidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("AA_taxonomies")
    .update(parsed.data)
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) {
    return { ok: false, message: "Nao foi possivel atualizar a taxonomia." };
  }

  await writeAuditLog({
    profile,
    action: "taxonomy.updated",
    entityType: "AA_taxonomies",
    entityId: id,
    metadata: parsed.data
  });

  revalidatePath("/app/admin/taxonomies");
  return { ok: true, message: "Taxonomia atualizada." };
}

export async function deactivateTaxonomyAction(id: string): Promise<ActionResult> {
  const profile = await requireAdmin();

  if (!profile) {
    return { ok: false, message: "Acesso restrito a administradores." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("AA_taxonomies")
    .update({ is_active: false })
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) {
    return { ok: false, message: "Nao foi possivel desativar a taxonomia." };
  }

  await writeAuditLog({
    profile,
    action: "taxonomy.deactivated",
    entityType: "AA_taxonomies",
    entityId: id
  });

  revalidatePath("/app/admin/taxonomies");
  return { ok: true, message: "Taxonomia desativada." };
}
