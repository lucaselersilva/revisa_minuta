import { redirect } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";
import { UserInviteManager } from "@/features/users/components/user-invite-manager";
import { getUsersAndInvites } from "@/features/users/queries/get-users-and-invites";

export default async function UsersPage() {
  const { profile } = await getCurrentProfile();

  if (profile?.role !== "admin") {
    redirect("/app");
  }

  const data = await getUsersAndInvites();

  return (
    <PageShell
      eyebrow="Administracao"
      title="Usuarios e convites"
      description="Gestao basica de usuarios internos. Cadastro publico permanece fechado; novos acessos devem ser criados de forma controlada."
    >
      <UserInviteManager profiles={data.profiles} invites={data.invites} />
    </PageShell>
  );
}
