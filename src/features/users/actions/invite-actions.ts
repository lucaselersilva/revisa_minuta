"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";
import { createClient } from "@/lib/supabase/server";
import { inviteSchema, type InviteInput } from "@/lib/validations/users";
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

export async function createInviteAction(input: InviteInput): Promise<ActionResult> {
  const profile = await requireAdmin();

  if (!profile) {
    return { ok: false, message: "Acesso restrito a administradores." };
  }

  const parsed = inviteSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Dados invalidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("AA_user_invites")
    .insert({
      office_id: profile.office_id,
      email: parsed.data.email,
      role: parsed.data.role,
      invited_by: profile.id,
      status: "pending"
    })
    .select("id, email, role")
    .single();

  if (error) {
    return { ok: false, message: "Nao foi possivel registrar o convite." };
  }

  await writeAuditLog({
    profile,
    action: "invite.created",
    entityType: "AA_user_invites",
    entityId: data.id,
    metadata: { email: data.email, role: data.role }
  });

  revalidatePath("/app/admin/users");
  return { ok: true, message: "Convite registrado." };
}

export async function revokeInviteAction(id: string): Promise<ActionResult> {
  const profile = await requireAdmin();

  if (!profile) {
    return { ok: false, message: "Acesso restrito a administradores." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("AA_user_invites")
    .update({ status: "revoked" })
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) {
    return { ok: false, message: "Nao foi possivel revogar o convite." };
  }

  await writeAuditLog({
    profile,
    action: "invite.revoked",
    entityType: "AA_user_invites",
    entityId: id
  });

  revalidatePath("/app/admin/users");
  return { ok: true, message: "Convite revogado." };
}
