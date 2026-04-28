"use client";

import {
  BarChart3,
  BrainCircuit,
  Building2,
  CheckSquare,
  FileText,
  Files,
  Loader2,
  Pencil,
  Save,
  ShieldCheck,
  Sparkles,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ProfessionalMarkdownReport } from "@/components/shared/professional-markdown-report";
import { applyCaseTaxonomySuggestionAction, generateCaseTaxonomySuggestionAction } from "@/features/cases/actions/case-taxonomy-actions";
import { extractPersistedCaseTaxonomySuggestion } from "@/features/cases/lib/case-taxonomy-classification-schema";
import { CaseStatusBadge } from "@/features/cases/components/case-status-badge";
import { DocumentUpload, documentTypeLabels } from "@/features/cases/components/document-upload";
import {
  generateDefenseConformityAction,
  saveDefensePreparationAction
} from "@/features/case-workflow/actions/workflow-actions";
import { extractDefenseConformityFromMetadata } from "@/features/case-workflow/lib/defense-conformity-step";
import {
  defaultDefensePreparationInput,
  extractDefensePreparationFromMetadata
} from "@/features/case-workflow/lib/defense-step";
import { PreAnalysisWorkspace } from "@/features/document-ingestion/components/pre-analysis-workspace";
import { processCaseDefenseDocumentsAction } from "@/features/document-ingestion/actions/document-ingestion-actions";
import { StepCompletionCard } from "@/features/case-workflow/components/step-completion-card";
import { StepGateNotice } from "@/features/case-workflow/components/step-gate-notice";
import { WorkflowActionBar } from "@/features/case-workflow/components/workflow-action-bar";
import { WorkflowPendingRequirements } from "@/features/case-workflow/components/workflow-pending-requirements";
import { WorkflowStatusBadge } from "@/features/case-workflow/components/workflow-step-status-badge";
import { WorkflowStepper } from "@/features/case-workflow/components/workflow-stepper";
import { getWorkflowStepMeta } from "@/features/case-workflow/lib/workflow-steps";
import { validateWorkflowStepCompletion } from "@/features/case-workflow/lib/workflow-validation";
import type { CaseWorkflowState, DefensePreparationInput, WorkflowCompletionInput } from "@/features/case-workflow/types";
import type { Profile, WorkflowStepKey } from "@/types/database";

const stepLabels: Record<WorkflowStepKey, string> = {
  cadastro_inicial: "Cadastro inicial",
  documentos_autor: "Documentos do autor",
  emenda_inicial: "Emenda a inicial",
  pre_analise: "Pre-analise",
  defesa: "Defesa",
  revisao_final: "Revisao final",
  relatorio: "Relatorio"
};

export function GuidedCaseWorkflow({ state, profile }: { state: CaseWorkflowState; profile: Profile }) {
  const [selectedStepKey, setSelectedStepKey] = useState<WorkflowStepKey>(state.workflow.current_step);
  const [defensePreparation, setDefensePreparation] = useState<DefensePreparationInput>(() => {
    const defenseStep = state.steps.find((step) => step.step_key === "defesa");
    return defenseStep ? extractDefensePreparationFromMetadata(defenseStep.metadata) : defaultDefensePreparationInput;
  });
  const [finalChecklist, setFinalChecklist] = useState({
    defenseAttached: false,
    defenseDocumentsReviewed: false,
    readyForFutureFinalAnalysis: false
  });

  const selectedStep = state.steps.find((step) => step.step_key === selectedStepKey) ?? state.currentStep;
  const selectedMeta = getWorkflowStepMeta(selectedStep.step_key);
  const isPreAnalysisStep = selectedStep.step_key === "pre_analise";
  const completionInput: WorkflowCompletionInput = useMemo(() => {
    if (selectedStep.step_key === "defesa") {
      return { defensePreparation };
    }
    if (selectedStep.step_key === "revisao_final") {
      return { finalReviewChecklist: finalChecklist };
    }
    return {};
  }, [defensePreparation, finalChecklist, selectedStep.step_key]);
  const validation = validateWorkflowStepCompletion(state, selectedStep.step_key, completionInput);

  return (
    <div className="space-y-6">
      <WorkflowHeader state={state} />

      <div className={isPreAnalysisStep ? "grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]" : "grid gap-6 xl:grid-cols-[360px_1fr]"}>
        <WorkflowStepper steps={state.steps} selectedStep={selectedStep.step_key} onSelectStep={setSelectedStepKey} />

        <div className="space-y-5">
          {isPreAnalysisStep ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(248,250,252,1))] p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                  <div className="max-w-4xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Etapa ativa</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-950">{selectedMeta.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{selectedMeta.description}</p>
                  </div>
                  <Badge variant={selectedStep.is_required ? "default" : "outline"}>
                    {selectedStep.is_required ? "Obrigatoria" : "Opcional"}
                  </Badge>
                </div>
              </div>

              {selectedStep.status === "locked" ? (
                <Card>
                  <CardContent className="pt-6">
                    <StepGateNotice />
                  </CardContent>
                </Card>
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
                    defensePreparation={defensePreparation}
                    setDefensePreparation={setDefensePreparation}
                    finalChecklist={finalChecklist}
                    setFinalChecklist={setFinalChecklist}
                  />
                  <Card className="border-slate-200">
                    <CardContent className="pt-6">
                      <WorkflowPendingRequirements validation={validation} />
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          ) : (
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
                      defensePreparation={defensePreparation}
                      setDefensePreparation={setDefensePreparation}
                      finalChecklist={finalChecklist}
                      setFinalChecklist={setFinalChecklist}
                    />
                    <WorkflowPendingRequirements validation={validation} />
                  </>
                )}
              </CardContent>
            </Card>
          )}

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
  defensePreparation,
  setDefensePreparation,
  finalChecklist,
  setFinalChecklist
}: {
  state: CaseWorkflowState;
  stepKey: WorkflowStepKey;
  defensePreparation: DefensePreparationInput;
  setDefensePreparation: (value: DefensePreparationInput) => void;
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
        officeId={state.caseItem.office_id}
        documents={state.caseItem.documents}
        allowedDocumentTypes={[
          "initial_petition",
          "author_documents",
          "author_identity_document",
          "author_address_proof",
          "author_payment_proof",
          "author_screen_capture",
          "other"
        ]}
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
        officeId={state.caseItem.office_id}
        documents={state.caseItem.documents}
        allowedDocumentTypes={["initial_amendment", "initial_amendment_documents", "other"]}
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
    const defenseStep = state.steps.find((step) => step.step_key === "defesa") ?? null;

    return (
      <DefenseWorkspace
        caseId={state.caseItem.id}
        officeId={state.caseItem.office_id}
        documents={state.caseItem.documents}
        snapshot={state.preAnalysis}
        legalConfig={state.legalConfig}
        preparation={defensePreparation}
        onChange={setDefensePreparation}
        savedConformityReport={extractDefenseConformityFromMetadata(defenseStep?.metadata)}
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
  const cadastroStep = state.steps.find((step) => step.step_key === "cadastro_inicial") ?? null;
  const taxonomySuggestion = extractPersistedCaseTaxonomySuggestion(cadastroStep?.metadata);
  const entity = state.caseItem.entity_links[0]?.entity;
  const rows = [
    { label: "Carteira", value: state.caseItem.portfolio?.name ?? "Nao informada" },
    { label: "Titulo", value: state.caseItem.title || "Nao informado" },
    { label: "Numero", value: state.caseItem.case_number || "Nao informado" },
    { label: "Taxonomia", value: state.caseItem.taxonomy ? `${state.caseItem.taxonomy.code} - ${state.caseItem.taxonomy.name}` : "Nao definida" },
    { label: "Responsavel", value: state.caseItem.responsible_lawyer?.full_name ?? "Nao definido" },
    { label: "Empresa representada", value: entity?.name ?? "Nao vinculada" }
  ];

  return (
    <div className="space-y-4">
      <TaxonomySuggestionCard
        caseId={state.caseItem.id}
        currentTaxonomyCode={state.caseItem.taxonomy?.code ?? null}
        suggestion={taxonomySuggestion}
        processedDocuments={state.preAnalysis?.metrics.processedCount ?? 0}
        totalRelevantDocuments={state.preAnalysis?.metrics.eligibleCount ?? 0}
      />

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

      {state.legalConfig.requirements.length > 0 ? (
        <div className="rounded-lg border bg-white p-4">
          <p className="font-semibold">Requisitos jurídicos ativos da carteira</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {state.legalConfig.requirements.slice(0, 6).map((item) => (
              <div key={item.id} className="rounded-md bg-muted/45 px-3 py-2 text-sm">
                <p className="font-medium">{item.requirement_label}</p>
                <p className="text-xs text-muted-foreground">
                  {stepLabels[item.step_key]} - {documentTypeLabels[item.document_type] ?? item.document_type}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TaxonomySuggestionCard({
  caseId,
  currentTaxonomyCode,
  suggestion,
  processedDocuments,
  totalRelevantDocuments
}: {
  caseId: string;
  currentTaxonomyCode: string | null;
  suggestion: ReturnType<typeof extractPersistedCaseTaxonomySuggestion>;
  processedDocuments: number;
  totalRelevantDocuments: number;
}) {
  const router = useRouter();
  const [isGenerating, startGenerating] = useTransition();
  const [isApplying, startApplying] = useTransition();
  const recommendation = suggestion?.recommendation ?? null;
  const hasApplicableSuggestion = Boolean(recommendation?.taxonomy_id && recommendation.taxonomy_code);
  const alreadyApplied = Boolean(suggestion?.application);
  const matchesCurrentTaxonomy = Boolean(currentTaxonomyCode && currentTaxonomyCode === recommendation?.taxonomy_code);

  function refreshAfter(result: { ok: boolean; message: string }) {
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
      return;
    }

    toast.error(result.message);
  }

  return (
    <Card className="border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(248,250,252,1))] shadow-sm">
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <BrainCircuit className="h-5 w-5 text-primary" />
              Classificacao automatica do caso
            </CardTitle>
            {recommendation?.taxonomy_code ? <Badge variant="secondary">{recommendation.taxonomy_code}</Badge> : null}
            {recommendation ? <ConfidenceBadge confidence={recommendation.confidence} /> : null}
            {alreadyApplied ? <Badge variant="success">Aplicada</Badge> : null}
          </div>
          <CardDescription className="mt-2 leading-6">
            A IA sugere a taxonomia operacional com base no cadastro do processo e nos documentos processados, sem substituir a validacao humana.
          </CardDescription>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            variant="outline"
            disabled={isGenerating}
            onClick={() =>
              startGenerating(async () => {
                const result = await generateCaseTaxonomySuggestionAction(caseId);
                refreshAfter(result);
              })
            }
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {suggestion ? "Atualizar sugestao" : "Gerar sugestao"}
          </Button>
          {hasApplicableSuggestion && !matchesCurrentTaxonomy ? (
            <Button
              type="button"
              disabled={isApplying}
              onClick={() =>
                startApplying(async () => {
                  const result = await applyCaseTaxonomySuggestionAction(caseId);
                  refreshAfter(result);
                })
              }
            >
              {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
              Aplicar taxonomia sugerida
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <MetricTile label="Taxonomia atual" value={currentTaxonomyCode ?? "Nao definida"} />
          <MetricTile label="Documentos relevantes" value={String(totalRelevantDocuments)} />
          <MetricTile label="Documentos processados" value={String(processedDocuments)} />
        </div>

        {!suggestion ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm text-slate-600">
            Nenhuma sugestao foi gerada ainda. Quando houver dados cadastrais e, idealmente, documentos processados, a IA pode propor a taxonomia mais aderente.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Sintese operacional</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {recommendation?.taxonomy_code
                    ? `${recommendation.taxonomy_code} - ${recommendation.taxonomy_name ?? "Taxonomia sugerida"}`
                    : "Classificacao inconclusiva"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {recommendation?.summary ?? "A sugestao ainda nao trouxe resumo operacional."}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  <span className="font-medium text-slate-900">Justificativa:</span> {recommendation?.rationale ?? "Sem justificativa estruturada."}
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <StringListCard
                  title="Sinais que sustentam"
                  items={recommendation?.matched_signals ?? []}
                  emptyMessage="A IA nao destacou sinais positivos suficientes."
                />
                <StringListCard
                  title="Lacunas para confirmar"
                  items={recommendation?.missing_signals ?? []}
                  emptyMessage="Nao ha lacunas adicionais destacadas."
                />
              </div>
            </div>

            <div className="space-y-4">
              <StringListCard
                title="Documentos considerados"
                items={recommendation?.documents_considered ?? []}
                emptyMessage="Nao houve documentos explicitamente citados."
              />
              <StringListCard
                title="Taxonomias alternativas"
                items={recommendation?.alternative_taxonomy_codes ?? []}
                emptyMessage="A IA nao sugeriu alternativas proximas."
              />
              <StringListCard
                title="Alertas de cautela"
                items={recommendation?.cautionary_notes ?? []}
                emptyMessage="Nenhum alerta adicional foi registrado."
              />
              {matchesCurrentTaxonomy ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  A taxonomia atual ja coincide com a recomendacao mais recente da IA.
                </div>
              ) : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConfidenceBadge({ confidence }: { confidence: "low" | "medium" | "high" }) {
  if (confidence === "high") {
    return <Badge variant="success">Confianca alta</Badge>;
  }

  if (confidence === "medium") {
    return <Badge variant="secondary">Confianca media</Badge>;
  }

  return <Badge variant="outline">Confianca baixa</Badge>;
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StringListCard({
  title,
  items,
  emptyMessage
}: {
  title: string;
  items: string[];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {items.length > 0 ? (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item} className="rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
              {item}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">{emptyMessage}</p>
      )}
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

function DefenseWorkspace({
  caseId,
  officeId,
  documents,
  snapshot,
  legalConfig,
  preparation,
  onChange,
  savedConformityReport
}: {
  caseId: string;
  officeId: string;
  documents: CaseWorkflowState["caseItem"]["documents"];
  snapshot: CaseWorkflowState["preAnalysis"];
  legalConfig: CaseWorkflowState["legalConfig"];
  preparation: DefensePreparationInput;
  onChange: (value: DefensePreparationInput) => void;
  savedConformityReport: ReturnType<typeof extractDefenseConformityFromMetadata>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const defenseDocuments = documents.filter((document) => document.stage === "defense");
  const mainDefenseCount = defenseDocuments.filter((document) => document.document_type === "defense").length;
  const supportDefenseCount = defenseDocuments.filter((document) => document.document_type === "defense_documents").length;
  const latestReport = snapshot?.latestCompletedReport ?? null;
  const hasAcknowledgement = Boolean(snapshot?.latestAcknowledgementForLatestReport);
  const conformityReport = savedConformityReport?.report_json ?? null;
  const activeTemplate = legalConfig.templates[0] ?? null;
  const activeTheses = legalConfig.theses.slice(0, 5);
  const checklistItems = [
    ["preAnalysisReviewed", "Pre-analise revisada e incorporada na estrategia"],
    ["defenseStrategyDefined", "Linha defensiva principal definida"],
    ["defenseDocumentsReviewed", "Documentos da defesa revisados"]
  ] as const;

  function savePreparation() {
    startTransition(async () => {
      const result = await saveDefensePreparationAction(caseId, preparation);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function processDefenseDocuments() {
    startTransition(async () => {
      const result = await processCaseDefenseDocumentsAction(caseId);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function generateConformity() {
    startTransition(async () => {
      const result = await generateDefenseConformityAction(caseId);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <SummaryMetric icon={ShieldCheck} label="Contestacoes" value={String(mainDefenseCount)} />
        <SummaryMetric icon={Files} label="Anexos defensivos" value={String(supportDefenseCount)} />
        <SummaryMetric
          icon={BrainCircuit}
          label="Laudo previo"
          value={latestReport ? `v${latestReport.version}${hasAcknowledgement ? " confirmado" : ""}` : "Nao gerado"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_1.1fr]">
        <div className="space-y-5">
          <div className="rounded-lg border bg-white p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Preparacao da defesa</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use a pre-analise como base, anexe a contestacao principal e confirme o fechamento operacional desta etapa.
            </p>
            <div className="mt-5 space-y-2">
              {checklistItems.map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 rounded-md border bg-muted/30 p-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={preparation[key]}
                    onChange={(event) => onChange({ ...preparation, [key]: event.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium">Observacoes da estrategia</p>
              <Textarea
                value={preparation.notes}
                onChange={(event) => onChange({ ...preparation, notes: event.target.value })}
                placeholder="Registre teses, pontos sensiveis, documentos internos pendentes ou observacoes para a revisao final."
                rows={6}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="button" variant="outline" disabled={isPending} onClick={savePreparation}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar preparo
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Processamento da defesa</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  A contestacao e os anexos defensivos precisam ter texto extraido para alimentar o relatorio de conformidade.
                </p>
              </div>
              <Button type="button" variant="outline" disabled={isPending || defenseDocuments.length === 0} onClick={processDefenseDocuments}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                Processar defesa
              </Button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <MetricTile label="Docs defesa" value={String(defenseDocuments.length)} />
              <MetricTile label="Contestacoes" value={String(mainDefenseCount)} />
              <MetricTile label="Anexos" value={String(supportDefenseCount)} />
            </div>
          </div>

          <DocumentUpload
            caseId={caseId}
            officeId={officeId}
            documents={documents}
            allowedDocumentTypes={["defense", "defense_documents"]}
            allowedStages={["defense"]}
            defaultDocumentType="defense"
            defaultStage="defense"
          />
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border bg-white p-5">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Base da pre-analise</h3>
            </div>
            {latestReport ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">
                    Ultimo laudo concluido: v{latestReport.version}
                    {hasAcknowledgement ? " - leitura confirmada" : " - leitura pendente"}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Gerado por {latestReport.generated_profile?.full_name ?? "usuario interno"} em{" "}
                    {new Date(latestReport.generated_at ?? latestReport.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <StringListCard
                  title="Documentos internos recomendados"
                  items={extractStringArray(latestReport.report_json, "documentos_internos_recomendados_para_defesa")}
                  emptyMessage="Nenhuma recomendacao especifica registrada no laudo."
                />
                <StringListCard
                  title="Pontos exploraveis para defesa"
                  items={extractExplorableDefensePoints(latestReport.report_json)}
                  emptyMessage="Nenhum ponto exploravel estruturado no laudo."
                />
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                A defesa ainda nao tem laudo previo concluido. Gere e confirme a pre-analise antes de fechar esta etapa.
              </p>
            )}
          </div>

          <div className="rounded-lg border bg-white p-5">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Modelo-base e teses da carteira</h3>
            </div>
            {activeTemplate ? (
              <div className="mt-4 rounded-md border bg-muted/30 p-3">
                <p className="font-medium">{activeTemplate.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{activeTemplate.usage_notes ?? "Sem observacoes adicionais."}</p>
                <pre className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-700">{activeTemplate.template_markdown}</pre>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Nenhum modelo-base ativo para a taxonomia atual.</p>
            )}
            <div className="mt-4 space-y-2">
              {activeTheses.length > 0 ? (
                activeTheses.map((thesis) => (
                  <div key={thesis.id} className="rounded-md border bg-muted/25 p-3">
                    <p className="font-medium">{thesis.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{thesis.summary}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma tese ativa configurada para a carteira atual.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Relatorio de conformidade</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Cruza inicial, emenda, documentos do autor, laudo previo e contestacao para mostrar pontos conformes,
                  incompletos e ausentes na defesa.
                </p>
              </div>
              <Button type="button" variant="outline" disabled={isPending} onClick={generateConformity}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {savedConformityReport ? "Atualizar relatorio" : "Gerar relatorio"}
              </Button>
            </div>

            {savedConformityReport ? (
              <div className="mt-4 rounded-md border bg-muted/30 p-3 text-sm">
                <p className="font-medium">
                  Ultima geracao em {new Date(savedConformityReport.generated_at).toLocaleString("pt-BR")}
                </p>
                <p className="mt-1 text-muted-foreground">
                  Prompt {savedConformityReport.prompt_version}
                  {savedConformityReport.model_name ? ` - ${savedConformityReport.model_name}` : ""}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Nenhum relatorio de conformidade gerado ainda para esta defesa.
              </p>
            )}

            {savedConformityReport?.input_summary ? (
              <div className="mt-4">
                <ConfigurationTraceCard trace={extractConfigurationTrace(savedConformityReport.input_summary)} />
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border bg-white p-5">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Resumo documental da defesa</h3>
            </div>
            <div className="mt-4 space-y-3">
              {defenseDocuments.length ? (
                defenseDocuments.map((document) => (
                  <div key={document.id} className="rounded-md border bg-muted/25 p-3">
                    <p className="font-medium">{document.file_name ?? "Documento sem nome"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {documentTypeLabels[document.document_type]} - {document.mime_type ?? "mime desconhecido"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum documento da defesa anexado ainda.</p>
              )}
            </div>
          </div>

          {conformityReport ? (
            <>
              <div className="rounded-lg border bg-white p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Sintese de conformidade</h3>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <MetricTile
                    label="Conformes"
                    value={String(conformityReport.pontuacao_geral.contestacao.conformes)}
                  />
                  <MetricTile
                    label="Incompletos"
                    value={String(conformityReport.pontuacao_geral.contestacao.incompletos)}
                  />
                  <MetricTile
                    label="Ausentes"
                    value={String(conformityReport.pontuacao_geral.contestacao.ausentes)}
                  />
                  <MetricTile
                    label="Pontuacao"
                    value={`${conformityReport.pontuacao_geral.pontuacao_geral}/100`}
                  />
                  <MetricTile label="Risco geral" value={conformityReport.pontuacao_geral.risco_geral} />
                  <MetricTile
                    label="Risco alto docs"
                    value={String(conformityReport.pontuacao_geral.documentacao_autor.risco_alto)}
                  />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-5">
                <div className="flex items-center gap-2">
                  <Files className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Pedidos e lacunas destacadas</h3>
                </div>
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <StringListCard
                    title="Pedidos nao integralmente rebatidos"
                    items={conformityReport.pedidos_da_inicial_nao_integralmente_rebatidos.map(
                      (item) => `${item.pedido} - ${item.situacao}`
                    )}
                    emptyMessage="Nenhum pedido relevante pendente de enfrentamento foi destacado."
                  />
                  <StringListCard
                    title="Recomendacoes prioritarias"
                    items={conformityReport.recomendacoes_prioritarias.map(
                      (item) => `[${item.prioridade}] ${item.titulo} - ${item.acao_sugerida || item.descricao}`
                    )}
                    emptyMessage="Nenhuma recomendacao prioritaria registrada."
                  />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-5">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Relatorio exportavel</h3>
                </div>
                <div className="mt-4">
                  <ProfessionalMarkdownReport
                    title="Relatorio de conformidade da defesa"
                    subtitle="Consolidado interno para conferencia de aderencia da contestacao, autenticidade documental e recomendacoes prioritarias."
                    markdown={savedConformityReport?.report_markdown ?? null}
                    exportFileName="relatorio-conformidade-defesa"
                    generatedAt={savedConformityReport?.generated_at}
                    promptVersion={savedConformityReport?.prompt_version ?? null}
                    modelName={savedConformityReport?.model_name ?? null}
                  />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function extractStringArray(reportJson: Record<string, unknown> | null, key: string) {
  const value = reportJson?.[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function extractConfigurationTrace(inputSummary: Record<string, unknown> | null | undefined) {
  const trace = inputSummary?.configuration_trace;
  return trace && typeof trace === "object" && !Array.isArray(trace) ? (trace as Record<string, unknown>) : null;
}

function extractTraceStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function extractTraceNamedItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      return typeof record.title === "string" ? record.title : typeof record.label === "string" ? record.label : null;
    })
    .filter((item): item is string => Boolean(item));
}

function ConfigurationTraceCard({ trace }: { trace: Record<string, unknown> | null }) {
  if (!trace) {
    return null;
  }

  const strategy =
    trace.portfolio_strategy && typeof trace.portfolio_strategy === "object" && !Array.isArray(trace.portfolio_strategy)
      ? (trace.portfolio_strategy as Record<string, unknown>)
      : null;
  const promptProfile =
    trace.prompt_profile && typeof trace.prompt_profile === "object" && !Array.isArray(trace.prompt_profile)
      ? (trace.prompt_profile as Record<string, unknown>)
      : null;
  const legalConfiguration =
    trace.legal_configuration && typeof trace.legal_configuration === "object" && !Array.isArray(trace.legal_configuration)
      ? (trace.legal_configuration as Record<string, unknown>)
      : null;

  const columns = [
    {
      title: "Estrategia",
      items: [
        strategy && typeof strategy.label === "string" ? strategy.label : null,
        ...extractTraceStrings(strategy?.focus_areas).slice(0, 3)
      ].filter((item): item is string => Boolean(item))
    },
    {
      title: "Perfil de prompt",
      items: [
        promptProfile && typeof promptProfile.profile_name === "string" ? promptProfile.profile_name : null,
        ...extractTraceStrings(promptProfile?.highlights).slice(0, 4)
      ].filter((item): item is string => Boolean(item))
    },
    {
      title: "Base juridica",
      items: [
        ...extractTraceNamedItems(legalConfiguration?.requirements).slice(0, 3),
        ...extractTraceNamedItems(legalConfiguration?.theses).slice(0, 3),
        ...extractTraceNamedItems(legalConfiguration?.templates).slice(0, 2)
      ]
    }
  ];

  return (
    <div className="rounded-md border bg-muted/25 p-3">
      <p className="font-medium">Base considerada na geracao</p>
      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        {columns.map((column) => (
          <div key={column.title} className="rounded-md border bg-white p-3">
            <p className="text-sm font-medium">{column.title}</p>
            <div className="mt-2 space-y-2">
              {column.items.length ? (
                column.items.map((item) => (
                  <p key={item} className="text-sm text-muted-foreground">
                    {item}
                  </p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum item rastreado.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function extractExplorableDefensePoints(reportJson: Record<string, unknown> | null) {
  const value = reportJson?.pontos_exploraveis_defesa;
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const point = "ponto" in item && typeof item.ponto === "string" ? item.ponto : null;
      const justification = "justificativa" in item && typeof item.justificativa === "string" ? item.justificativa : null;
      if (!point) {
        return null;
      }

      return justification ? `${point} - ${justification}` : point;
    })
    .filter((item): item is string => Boolean(item));
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
