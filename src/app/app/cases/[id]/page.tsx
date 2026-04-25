import { notFound } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { GuidedCaseWorkflow } from "@/features/case-workflow/components/guided-case-workflow";
import { getOrCreateCaseWorkflowStateQuery } from "@/features/case-workflow/queries/get-case-workflow-state";
import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;
  const { profile } = await getCurrentProfile();

  if (!profile) {
    notFound();
  }

  const state = await getOrCreateCaseWorkflowStateQuery(id, profile);

  if (!state) {
    notFound();
  }

  return (
    <PageShell
      eyebrow="Processo"
      title="Fluxo guiado do processo"
      description="Etapas operacionais com progresso visual, validacoes de completude e governanca preparatoria."
      fullWidth
    >
      <GuidedCaseWorkflow state={state} profile={profile} />
    </PageShell>
  );
}
