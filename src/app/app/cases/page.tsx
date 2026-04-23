import { FilePlus2 } from "lucide-react";
import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { CaseList } from "@/features/cases/components/case-list";
import { getCaseSelectOptions } from "@/features/cases/queries/get-case-options";
import { getCases } from "@/features/cases/queries/get-cases";

type Props = {
  searchParams: Promise<{
    status?: string;
    taxonomy?: string;
  }>;
};

export default async function CasesPage({ searchParams }: Props) {
  const params = await searchParams;
  const [cases, options] = await Promise.all([
    getCases({ status: params.status, taxonomyId: params.taxonomy }),
    getCaseSelectOptions()
  ]);

  return (
    <PageShell
      eyebrow="Processos"
      title="Carteira processual"
      description="Base estruturada para organizar dados, partes e documentos antes das futuras etapas de revisao assistida."
      action={
        <Button asChild>
          <Link href="/app/cases/new">
            <FilePlus2 className="h-4 w-4" />
            Novo processo
          </Link>
        </Button>
      }
    >
      <CaseList cases={cases} taxonomies={options.taxonomies} />
    </PageShell>
  );
}
