import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserInvite } from "@/types/database";

type InviteAcceptanceState = {
  userId: string;
  email: string;
  profile: Profile | null;
  pendingInvite: UserInvite | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function resolveAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL nao configurada.");
  }

  return appUrl.replace(/\/$/, "");
}

export function buildInviteRedirectUrl() {
  return `${resolveAppUrl()}/auth/confirm?next=/auth/complete-invite`;
}

export async function inviteUserWithSupabaseAuth(email: string) {
  const admin = createAdminClient();

  return admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: buildInviteRedirectUrl()
  });
}

export async function getInviteAcceptanceState(): Promise<InviteAcceptanceState | null> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.id || !user.email) {
    return null;
  }

  const normalizedEmail = normalizeEmail(user.email);
  const admin = createAdminClient();

  const [{ data: profile }, { data: pendingInvite }] = await Promise.all([
    admin.from("AA_profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
    admin
      .from("AA_user_invites")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<UserInvite>()
  ]);

  return {
    userId: user.id,
    email: normalizedEmail,
    profile: profile ?? null,
    pendingInvite: pendingInvite ?? null
  };
}

export async function finalizeInviteAcceptance(fullName: string) {
  const state = await getInviteAcceptanceState();

  if (!state) {
    return { ok: false, message: "Sessao de convite nao encontrada." };
  }

  if (state.profile) {
    return { ok: true, message: "Convite ja aceito.", officeId: state.profile.office_id };
  }

  if (!state.pendingInvite?.office_id) {
    return { ok: false, message: "Nao existe convite pendente valido para este usuario." };
  }

  const admin = createAdminClient();
  const safeFullName = fullName.trim();

  const { error: profileError } = await admin.from("AA_profiles").upsert(
    {
      id: state.userId,
      office_id: state.pendingInvite.office_id,
      full_name: safeFullName,
      role: state.pendingInvite.role,
      is_active: true
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return { ok: false, message: "Nao foi possivel criar o perfil interno do usuario." };
  }

  const { error: inviteError } = await admin
    .from("AA_user_invites")
    .update({ status: "accepted" })
    .eq("id", state.pendingInvite.id);

  if (inviteError) {
    return { ok: false, message: "O usuario foi criado no Auth, mas o convite nao foi marcado como aceito." };
  }

  await admin.from("AA_audit_logs").insert({
    office_id: state.pendingInvite.office_id,
    actor_profile_id: state.userId,
    action: "invite.accepted",
    entity_type: "AA_user_invites",
    entity_id: state.pendingInvite.id,
    metadata: {
      email: state.email,
      role: state.pendingInvite.role
    }
  });

  return {
    ok: true,
    message: "Convite aceito com sucesso.",
    officeId: state.pendingInvite.office_id
  };
}
