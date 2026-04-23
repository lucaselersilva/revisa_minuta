import { UserRound } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";
import { formatDateTime } from "@/lib/utils";

export default async function ProfilePage() {
  const { user, profile } = await getCurrentProfile();

  return (
    <PageShell
      eyebrow="Configuracoes"
      title="Meu perfil"
      description="Perfil interno usado para autorizacao, RLS e rastreabilidade das acoes administrativas."
    >
      <Card className="max-w-3xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Dados do usuario</CardTitle>
              <CardDescription>Informacoes sincronizadas entre Supabase Auth e AA_profiles.</CardDescription>
            </div>
            <div className="rounded-md bg-muted p-3 text-primary">
              <UserRound className="h-5 w-5" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Info label="Nome" value={profile?.full_name ?? "Nao informado"} />
          <Info label="E-mail" value={user?.email ?? "Nao informado"} />
          <Info label="Perfil" value={<Badge variant={profile?.role === "admin" ? "success" : "secondary"}>{profile?.role ?? "sem perfil"}</Badge>} />
          <Info label="Status" value={profile?.is_active ? "Ativo" : "Inativo"} />
          <Info label="Office ID" value={profile?.office_id ?? "Nao vinculado"} className="md:col-span-2" />
          <Info label="Criado em" value={formatDateTime(profile?.created_at)} />
          <Info label="Atualizado em" value={formatDateTime(profile?.updated_at)} />
        </CardContent>
      </Card>
    </PageShell>
  );
}

function Info({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <div className="mt-2 min-h-10 rounded-md border bg-white px-3 py-2 text-sm">{value}</div>
    </div>
  );
}
