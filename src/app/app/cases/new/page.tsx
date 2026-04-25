import { PageShell } from "@/components/layout/page-shell";
import { NewCaseEntry } from "@/features/cases/components/new-case-entry";
import { getCaseSelectOptions } from "@/features/cases/queries/get-case-options";
import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";
import { notFound } from "next/navigation";

export default async function NewCasePage() {
  const [{ profile }, options] = await Promise.all([getCurrentProfile(), getCaseSelectOptions()]);

  if (!profile) {
    notFound();
  }

  return (
    <PageShell
      eyebrow="Novo processo"
      title="Cadastrar processo"
      description="Escolha entre cadastro manual ou criacao por upload da peticao inicial para iniciar o fluxo do processo."
    >
      <NewCaseEntry options={options} profile={profile} />
    </PageShell>
  );
}
