import { Activity, FileCheck2, Layers3, LockKeyhole, Tags, Users } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";
import { getCaseCount } from "@/features/cases/queries/get-cases";
import { getTaxonomyCount } from "@/features/taxonomies/queries/get-taxonomies";

const foundations = [
  { label: "Autenticacao", status: "Ativo", icon: LockKeyhole },
  { label: "RLS por office", status: "Preparado", icon: Layers3 },
  { label: "Taxonomias", status: "Operacional", icon: Tags },
  { label: "Usuarios", status: "Base inicial", icon: Users }
];

export default async function AppDashboardPage() {
  const [{ profile }, taxonomyCount, caseCount] = await Promise.all([
    getCurrentProfile(),
    getTaxonomyCount(),
    getCaseCount()
  ]);

  return (
    <PageShell
      eyebrow="Dashboard"
      title="Fundacao operacional"
      description="Visao inicial do ambiente autenticado. Os cards abaixo sao placeholders institucionais para acompanhar maturidade tecnica sem antecipar regras juridicas."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {foundations.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="rounded-md bg-muted p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <Badge variant="secondary">{item.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Roadmap desta base</CardTitle>
            <CardDescription>Itens intencionalmente preparados, sem implementar IA ou workflow juridico nesta fase.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              "Fluxo guiado de revisao por processo",
              "Upload organizado e storage por office",
              "Laudo previo e revisao final assistidos por IA",
              "Auditoria ampliada de mutacoes criticas"
            ].map((item, index) => (
              <div key={item} className="flex items-center gap-4 rounded-lg border bg-white p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item}</p>
                  <Skeleton className="mt-2 h-2 w-full max-w-md" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace atual</CardTitle>
            <CardDescription>Dados derivados do perfil autenticado e das tabelas AA.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-white p-4">
              <p className="text-xs uppercase text-muted-foreground">Usuario</p>
              <p className="mt-1 font-medium">{profile?.full_name ?? "Perfil interno"}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-white p-4">
                <Activity className="mb-3 h-4 w-4 text-accent" />
                <p className="text-2xl font-semibold">{taxonomyCount}</p>
                <p className="text-xs text-muted-foreground">Taxonomias</p>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <FileCheck2 className="mb-3 h-4 w-4 text-accent" />
                <p className="text-2xl font-semibold">{caseCount}</p>
                <p className="text-xs text-muted-foreground">Processos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
