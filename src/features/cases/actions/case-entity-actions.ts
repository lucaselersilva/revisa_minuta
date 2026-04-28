"use server";

import { revalidatePath } from "next/cache";

import { requireAdminProfile } from "@/features/profiles/queries/get-current-profile";
import { createClient } from "@/lib/supabase/server";
import { formatCnpj } from "@/lib/utils";
import { caseEntityManagementSchema, type CaseEntityManagementInput } from "@/lib/validations/entities";
import { writeAuditLog } from "@/services/audit-log-service";

type ActionResult = {
  ok: boolean;
  message: string;
};

export async function createCaseEntityAction(input: CaseEntityManagementInput): Promise<ActionResult> {
  const profile = await requireAdminProfile();

  if (!profile?.office_id) {
    return { ok: false, message: "Acesso restrito a administradores." };
  }

  const parsed = caseEntityManagementSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Dados invalidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("AA_case_entities")
    .insert({
      office_id: profile.office_id,
      portfolio_id: parsed.data.portfolio_id,
      name: parsed.data.name,
      document: parsed.data.document ? formatCnpj(parsed.data.document) : null
    })
    .select("id, name, document")
    .single();

  if (error) {
    return { ok: false, message: "Nao foi possivel cadastrar a empresa." };
  }

  await writeAuditLog({
    profile,
    action: "case_entity.created",
    entityType: "AA_case_entities",
    entityId: data.id,
    metadata: { name: data.name, document: data.document }
  });

  revalidatePath("/app/admin/entities");
  revalidatePath("/app/cases/new");
  return { ok: true, message: "Empresa cadastrada." };
}

export async function updateCaseEntityAction(id: string, input: CaseEntityManagementInput): Promise<ActionResult> {
  const profile = await requireAdminProfile();

  if (!profile?.office_id) {
    return { ok: false, message: "Acesso restrito a administradores." };
  }

  const parsed = caseEntityManagementSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Dados invalidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("AA_case_entities")
    .update({
      portfolio_id: parsed.data.portfolio_id,
      name: parsed.data.name,
      document: parsed.data.document ? formatCnpj(parsed.data.document) : null
    })
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) {
    return { ok: false, message: "Nao foi possivel atualizar a empresa." };
  }

  await writeAuditLog({
    profile,
    action: "case_entity.updated",
    entityType: "AA_case_entities",
    entityId: id,
    metadata: parsed.data
  });

  revalidatePath("/app/admin/entities");
  revalidatePath("/app/cases/new");
  return { ok: true, message: "Empresa atualizada." };
}
