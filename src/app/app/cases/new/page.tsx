import { PageShell } from "@/components/layout/page-shell";
import { CaseForm } from "@/features/cases/components/case-form";
import { getCaseSelectOptions } from "@/features/cases/queries/get-case-options";

export default async function NewCasePage() {
  const options = await getCaseSelectOptions();

  return (
    <PageShell
      eyebrow="Novo processo"
      title="Cadastrar processo"
      description="Crie a estrutura base do caso, vincule a empresa representada e organize as partes processuais."
    >
      <CaseForm options={options} />
    </PageShell>
  );
}
