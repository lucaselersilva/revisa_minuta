import { redirect } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signOutAction } from "@/features/auth/actions/sign-out";
import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getCurrentProfile();

  if (!user) {
    redirect("/login");
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 premium-grid">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Perfil interno pendente</CardTitle>
            <CardDescription>
              Sua sessao existe no Supabase Auth, mas ainda nao ha um registro em AA_profiles vinculado ao seu usuario.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signOutAction}>
              <Button type="submit">Voltar ao login</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-background premium-grid">
      <AppSidebar profile={profile} />
      <div className="min-w-0 flex-1">
        <AppHeader />
        <main>{children}</main>
      </div>
    </div>
  );
}
