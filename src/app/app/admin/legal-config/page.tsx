import { redirect } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { LegalConfigManager } from "@/features/legal-config/components/legal-config-manager";
import { getLegalConfiguration } from "@/features/legal-config/queries/get-legal-config";
import { getPortfolios } from "@/features/portfolios/queries/get-portfolios";
import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";
import { getTaxonomies } from "@/features/taxonomies/queries/get-taxonomies";

export default async function LegalConfigPage() {
  const { profile } = await getCurrentProfile();

  if (profile?.role !== "admin") {
    redirect("/app");
  }

  const [portfolios, taxonomies, legalConfig] = await Promise.all([
    getPortfolios(),
    getTaxonomies(),
    getLegalConfiguration()
  ]);

  return (
    <PageShell
      eyebrow="Administracao"
      title="Configuração jurídica"
      description="Módulo administrativo para parametrizar documentos obrigatórios, teses e modelos-base por carteira."
      fullWidth
    >
      <LegalConfigManager
        portfolios={portfolios}
        taxonomies={taxonomies}
        requirements={legalConfig.requirements}
        theses={legalConfig.theses}
        templates={legalConfig.templates}
        promptProfiles={legalConfig.promptProfiles}
      />
    </PageShell>
  );
}
