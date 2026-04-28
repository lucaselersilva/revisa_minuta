import { redirect } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { getPortfolios } from "@/features/portfolios/queries/get-portfolios";
import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";
import { TaxonomyManager } from "@/features/taxonomies/components/taxonomy-manager";
import { getTaxonomies } from "@/features/taxonomies/queries/get-taxonomies";

export default async function TaxonomiesPage() {
  const { profile } = await getCurrentProfile();

  if (profile?.role !== "admin") {
    redirect("/app");
  }

  const [taxonomies, portfolios] = await Promise.all([getTaxonomies(), getPortfolios()]);

  return (
    <PageShell
      eyebrow="Administracao"
      title="Taxonomias"
      description="Gestao inicial das categorias de caso. Nesta fase elas sao metadados operacionais, sem criterios juridicos automatizados."
    >
      <TaxonomyManager portfolios={portfolios} taxonomies={taxonomies} />
    </PageShell>
  );
}
