import { redirect } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { PortfolioManager } from "@/features/portfolios/components/portfolio-manager";
import { getPortfolios } from "@/features/portfolios/queries/get-portfolios";
import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";

export default async function PortfoliosPage() {
  const { profile } = await getCurrentProfile();

  if (profile?.role !== "admin") {
    redirect("/app");
  }

  const portfolios = await getPortfolios();

  return (
    <PageShell
      eyebrow="Administracao"
      title="Carteiras"
      description="Camada estrutural para separar clientes, taxonomias, empresas representadas e regras operacionais."
    >
      <PortfolioManager portfolios={portfolios} />
    </PageShell>
  );
}
