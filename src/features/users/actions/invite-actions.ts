"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";
import { inviteUserWithSupabaseAuth, finalizeInviteAcceptance, getInviteAcceptanceState } from "@/features/users/services/invite-service";
import { createClient } from "@/lib/supabase/server";
import { inviteSchema, acceptInviteSchema, type AcceptInviteInput, type InviteInput } from "@/lib/validations/users";
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

  try {
    const inviteResult = await inviteUserWithSupabaseAuth(parsed.data.email);

    if (inviteResult.error) {
      if (inviteResult.error.message.toLowerCase().includes("already been registered")) {
        return { ok: false, message: "Ja existe um usuario Auth registrado para esse e-mail." };
      }

      return { ok: false, message: "Nao foi possivel disparar o convite real pelo Supabase Auth." };
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao preparar o convite real."
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("AA_user_invites")
    .upsert(
      {
        office_id: profile.office_id,
        email: parsed.data.email,
        role: parsed.data.role,
        invited_by: profile.id,
        status: "pending"
      },
      {
        onConflict: "office_id,email"
      }
    )
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
  return { ok: true, message: "Convite registrado e enviado pelo Supabase Auth." };
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

export async function getInviteAcceptanceStateAction() {
  const state = await getInviteAcceptanceState();

  if (!state) {
    return { ok: false, message: "Sessao de convite nao encontrada." };
  }

  if (state.profile) {
    return {
      ok: true,
      status: "accepted" as const,
      email: state.email,
      role: state.profile.role,
      fullName: state.profile.full_name ?? ""
    };
  }

  if (!state.pendingInvite) {
    return { ok: false, message: "Nao existe convite pendente para este usuario." };
  }

  return {
    ok: true,
    status: "pending" as const,
    email: state.email,
    role: state.pendingInvite.role,
    fullName: ""
  };
}

export async function acceptInviteAction(input: AcceptInviteInput): Promise<ActionResult> {
  const parsed = acceptInviteSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Dados invalidos." };
  }

  const result = await finalizeInviteAcceptance(parsed.data.fullName);

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidatePath("/app");
  revalidatePath("/app/admin/users");
  return { ok: true, message: result.message };
}
