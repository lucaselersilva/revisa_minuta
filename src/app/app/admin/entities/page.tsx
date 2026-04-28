import { redirect } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { CaseEntityManager } from "@/features/cases/components/case-entity-manager";
import { getCaseEntities } from "@/features/cases/queries/get-case-entities";
import { getPortfolios } from "@/features/portfolios/queries/get-portfolios";
import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";

export default async function EntitiesPage() {
  const { profile } = await getCurrentProfile();

  if (profile?.role !== "admin") {
    redirect("/app");
  }

  const [entities, portfolios] = await Promise.all([getCaseEntities(), getPortfolios()]);

  return (
    <PageShell
      eyebrow="Administracao"
      title="Empresas"
      description="Gestao da base de empresas representadas usada no cadastro dos processos."
    >
      <CaseEntityManager entities={entities} portfolios={portfolios} />
    </PageShell>
  );
}
