import { notFound } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { CaseForm } from "@/features/cases/components/case-form";
import { getCaseSelectOptions } from "@/features/cases/queries/get-case-options";
import { getCaseById } from "@/features/cases/queries/get-cases";
import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ source?: string }>;
};

export default async function EditCasePage({ params, searchParams }: Props) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [{ profile }, caseItem, options] = await Promise.all([getCurrentProfile(), getCaseById(id), getCaseSelectOptions()]);

  if (!profile || !caseItem) {
    notFound();
  }

  return (
    <PageShell
      eyebrow="Editar processo"
      title="Atualizar cadastro"
      description="Ajuste dados estruturais, partes e empresa representada mantendo o historico automatico."
    >
      <CaseForm
        options={options}
        initialCase={caseItem}
        importedFromUpload={resolvedSearchParams?.source === "upload"}
        canManageEntities={profile.role === "admin"}
      />
    </PageShell>
  );
}
