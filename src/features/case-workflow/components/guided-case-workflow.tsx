"use client";

import {
  BarChart3,
  Building2,
  CheckSquare,
  FileText,
  Pencil,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CaseStatusBadge } from "@/features/cases/components/case-status-badge";
import { DocumentUpload, documentTypeLabels } from "@/features/cases/components/document-upload";
import { PreAnalysisWorkspace } from "@/features/document-ingestion/components/pre-analysis-workspace";
import { StepCompletionCard } from "@/features/case-workflow/components/step-completion-card";
import { StepGateNotice } from "@/features/case-workflow/components/step-gate-notice";
import { WorkflowActionBar } from "@/features/case-workflow/components/workflow-action-bar";
import { WorkflowPendingRequirements } from "@/features/case-workflow/components/workflow-pending-requirements";
import { WorkflowStatusBadge } from "@/features/case-workflow/components/workflow-step-status-badge";
import { WorkflowStepper } from "@/features/case-workflow/components/workflow-stepper";
import { getWorkflowStepMeta } from "@/features/case-workflow/lib/workflow-steps";
import { validateWorkflowStepCompletion } from "@/features/case-workflow/lib/workflow-validation";
import type { CaseWorkflowState, WorkflowCompletionInput } from "@/features/case-workflow/types";
import type { Profile, WorkflowStepKey } from "@/types/database";

export function GuidedCaseWorkflow({ state, profile }: { state: CaseWorkflowState; profile: Profile }) {
  const [selectedStepKey, setSelectedStepKey] = useState<WorkflowStepKey>(state.workflow.current_step);
  const [finalChecklist, setFinalChecklist] = useState({
    defenseAttached: false,
    defenseDocumentsReviewed: false,
    readyForFutureFinalAnalysis: false
  });

  const selectedStep = state.steps.find((step) => step.step_key === selectedStepKey) ?? state.currentStep;
  const selectedMeta = getWorkflowStepMeta(selectedStep.step_key);
  const completionInput: WorkflowCompletionInput = useMemo(() => {
    if (selectedStep.step_key === "revisao_final") {
      return { finalReviewChecklist: finalChecklist };
    }
    return {};
  }, [finalChecklist, selectedStep.step_key]);
  const validation = validateWorkflowStepCompletion(state, selectedStep.step_key, completionInput);

  return (
    <div className="space-y-6">
      <WorkflowHeader state={state} />

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <WorkflowStepper steps={state.steps} selectedStep={selectedStep.step_key} onSelectStep={setSelectedStepKey} />

        <div className="space-y-5">
          <Card>
            <CardHeader className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <CardTitle>{selectedMeta.title}</CardTitle>
                <CardDescription>{selectedMeta.description}</CardDescription>
              </div>
              <Badge variant={selectedStep.is_required ? "default" : "outline"}>
                {selectedStep.is_required ? "Obrigatoria" : "Opcional"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-5">
              {selectedStep.status === "locked" ? (
                <StepGateNotice />
              ) : (
                <>
                  {selectedStep.status === "completed" ? (
                    <StepCompletionCard title="Etapa concluida" description="Esta etapa ja foi validada no fluxo. Administradores podem reabri-la se houver necessidade operacional." />
                  ) : null}
                  {selectedStep.status === "skipped" ? (
                    <StepCompletionCard title="Etapa marcada como nao se aplica" description="O fluxo seguiu sem exigir conteudo desta etapa opcional." />
                  ) : null}
                  <StepContent
                    state={state}
                    stepKey={selectedStep.step_key}
                    finalChecklist={finalChecklist}
                    setFinalChecklist={setFinalChecklist}
                  />
                  <WorkflowPendingRequirements validation={validation} />
                </>
              )}
            </CardContent>
          </Card>

          {selectedStep.status !== "locked" ? (
            <WorkflowActionBar
              caseId={state.caseItem.id}
              stepKey={selectedStep.step_key}
              status={selectedStep.status}
              validation={validation}
              profile={profile}
              completionInput={completionInput}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function WorkflowHeader({ state }: { state: CaseWorkflowState }) {
  return (
    <div className="rounded-lg border bg-white p-5 shadow-subtle">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <CaseStatusBadge status={state.caseItem.status} />
            <WorkflowStatusBadge status={state.workflow.status} />
            {state.caseItem.taxonomy ? <Badge variant="secondary">{state.caseItem.taxonomy.code}</Badge> : null}
          </div>
          <h2 className="text-2xl font-semibold">{state.caseItem.title || "Processo sem titulo"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{state.caseItem.case_number || "Numero nao informado"}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Responsavel: {state.caseItem.responsible_lawyer?.full_name ?? "Nao definido"}
          </p>
        </div>
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progresso geral</span>
            <span className="text-muted-foreground">{state.progress}%</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${state.progress}%` }} />
          </div>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href={`/app/cases/${state.caseItem.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Editar dados do processo
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepContent({
  state,
  stepKey,
  finalChecklist,
  setFinalChecklist
}: {
  state: CaseWorkflowState;
  stepKey: WorkflowStepKey;
  finalChecklist: {
    defenseAttached: boolean;
    defenseDocumentsReviewed: boolean;
    readyForFutureFinalAnalysis: boolean;
  };
  setFinalChecklist: (value: {
    defenseAttached: boolean;
    defenseDocumentsReviewed: boolean;
    readyForFutureFinalAnalysis: boolean;
  }) => void;
}) {
  if (stepKey === "cadastro_inicial") {
    return <InitialRegistrationStep state={state} />;
  }

  if (stepKey === "documentos_autor") {
    return (
      <DocumentUpload
        caseId={state.caseItem.id}
        documents={state.caseItem.documents}
        allowedDocumentTypes={["initial_petition", "author_documents"]}
        allowedStages={["initial"]}
        defaultDocumentType="initial_petition"
        defaultStage="initial"
      />
    );
  }

  if (stepKey === "emenda_inicial") {
    return (
      <DocumentUpload
        caseId={state.caseItem.id}
        documents={state.caseItem.documents}
        allowedDocumentTypes={["initial_amendment"]}
        allowedStages={["pre_analysis"]}
        defaultDocumentType="initial_amendment"
        defaultStage="pre_analysis"
      />
    );
  }

  if (stepKey === "pre_analise") {
    return <PreAnalysisWorkspace caseId={state.caseItem.id} snapshot={state.preAnalysis} />;
  }

  if (stepKey === "defesa") {
    return (
      <DocumentUpload
        caseId={state.caseItem.id}
        documents={state.caseItem.documents}
        allowedDocumentTypes={["defense", "defense_documents"]}
        allowedStages={["defense"]}
        defaultDocumentType="defense"
        defaultStage="defense"
      />
    );
  }

  if (stepKey === "revisao_final") {
    return (
      <FinalReviewChecklist
        checklist={finalChecklist}
        onChange={setFinalChecklist}
      />
    );
  }

  return <ReportStep state={state} />;
}

function InitialRegistrationStep({ state }: { state: CaseWorkflowState }) {
  const entity = state.caseItem.entity_links[0]?.entity;
  const rows = [
    { label: "Titulo", value: state.caseItem.title || "Nao informado" },
    { label: "Numero", value: state.caseItem.case_number || "Nao informado" },
    { label: "Taxonomia", value: state.caseItem.taxonomy ? `${state.caseItem.taxonomy.code} - ${state.caseItem.taxonomy.name}` : "Nao definida" },
    { label: "Responsavel", value: state.caseItem.responsible_lawyer?.full_name ?? "Nao definido" },
    { label: "Empresa representada", value: entity?.name ?? "Nao vinculada" }
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg border bg-white p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">{row.label}</p>
            <p className="mt-1 text-sm font-semibold">{row.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-primary" />
          <p className="font-semibold">Partes cadastradas</p>
        </div>
        <div className="space-y-2">
          {state.caseItem.parties.map((party) => (
            <div key={party.id} className="rounded-md bg-muted/45 px-3 py-2 text-sm">
              <p className="font-medium">{party.name}</p>
              <p className="text-xs text-muted-foreground">{party.role}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FinalReviewChecklist({
  checklist,
  onChange
}: {
  checklist: {
    defenseAttached: boolean;
    defenseDocumentsReviewed: boolean;
    readyForFutureFinalAnalysis: boolean;
  };
  onChange: (value: {
    defenseAttached: boolean;
    defenseDocumentsReviewed: boolean;
    readyForFutureFinalAnalysis: boolean;
  }) => void;
}) {
  const items = [
    ["defenseAttached", "Contestacao anexada"],
    ["defenseDocumentsReviewed", "Documentos defensivos revisados"],
    ["readyForFutureFinalAnalysis", "Etapa pronta para analise final futura"]
  ] as const;

  return (
    <div className="rounded-lg border bg-white p-5">
      <CheckSquare className="mb-4 h-6 w-6 text-primary" />
      <h3 className="font-semibold">Checklist manual de revisao final</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Esta etapa prepara a futura revisao juridica automatizada sem executar analise ou score nesta fase.
      </p>
      <div className="mt-5 space-y-2">
        {items.map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 rounded-md border bg-muted/30 p-3 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={checklist[key]}
              onChange={(event) => onChange({ ...checklist, [key]: event.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}

function ReportStep({ state }: { state: CaseWorkflowState }) {
  const documentsByType = state.caseItem.documents.reduce<Record<string, number>>((acc, document) => {
    acc[document.document_type] = (acc[document.document_type] ?? 0) + 1;
    return acc;
  }, {});
  const completedSteps = state.steps.filter((step) => step.status === "completed" || step.status === "skipped");

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <SummaryMetric icon={BarChart3} label="Etapas finalizadas" value={`${completedSteps.length}/${state.steps.length}`} />
      <SummaryMetric icon={FileText} label="Documentos enviados" value={String(state.caseItem.documents.length)} />
      <SummaryMetric icon={Building2} label="Empresa" value={state.caseItem.entity_links[0]?.entity?.name ?? "Nao vinculada"} />

      <div className="rounded-lg border bg-white p-4 lg:col-span-2">
        <p className="mb-3 font-semibold">Documentos por tipo</p>
        <div className="grid gap-2 md:grid-cols-2">
          {Object.entries(documentsByType).map(([type, count]) => (
            <div key={type} className="rounded-md bg-muted/45 px-3 py-2 text-sm">
              <span className="font-medium">{documentTypeLabels[type as keyof typeof documentTypeLabels] ?? type}</span>: {count}
            </div>
          ))}
          {Object.keys(documentsByType).length === 0 ? <p className="text-sm text-muted-foreground">Nenhum documento enviado.</p> : null}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <p className="mb-3 font-semibold">Historico recente</p>
        <div className="space-y-2">
          {state.caseItem.history.slice(0, 4).map((item) => (
            <div key={item.id} className="rounded-md bg-muted/45 px-3 py-2">
              <p className="text-sm font-medium">{item.action}</p>
              <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("pt-BR")}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryMetric({ icon: Icon, label, value }: { icon: typeof BarChart3; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <Icon className="mb-3 h-5 w-5 text-primary" />
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold">{value}</p>
    </div>
  );
}
