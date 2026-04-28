"use client";

import { FileText, Loader2, RefreshCw, ScanSearch, ShieldAlert, ShieldCheck } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  acknowledgePreAnalysisReportAction,
  generatePreAnalysisReportAction,
  refreshAuthorExternalSearchesAction,
  requestAuthorExternalSearchesAction
} from "@/features/ai/actions/pre-analysis-actions";
import { processCaseInitialDocumentsAction } from "@/features/document-ingestion/actions/document-ingestion-actions";
import { extractStructuredDocumentAnalysis, getDocumentAnalysisStatus } from "@/features/document-ingestion/lib/document-analysis-helpers";
import { documentTypeLabels } from "@/features/cases/components/document-upload";
import { EmptyState } from "@/components/shared/empty-state";
import { ProfessionalMarkdownReport } from "@/components/shared/professional-markdown-report";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PreAnalysisSnapshot } from "@/features/document-ingestion/types";

function statusVariant(status: string) {
  if (status === "processed") return "success";
  if (status === "failed") return "destructive";
  if (status === "unsupported" || status === "empty_text") return "outline";
  return "secondary";
}

export function PreAnalysisWorkspace({ caseId, snapshot }: { caseId: string; snapshot: PreAnalysisSnapshot | null }) {
  const router = useRouter();
  const [selectedReportId, setSelectedReportId] = useState(snapshot?.latestReport?.id ?? null);
  const [isPending, startTransition] = useTransition();

  const selectedReport = useMemo(
    () => snapshot?.reports.find((report) => report.id === selectedReportId) ?? snapshot?.latestReport ?? null,
    [selectedReportId, snapshot]
  );

  const selectedReportFailureMessage =
    selectedReport?.status === "failed"
      ? selectedReport.report_markdown || String(selectedReport.input_summary?.error_message ?? "")
      : "";
  const latestCompletedReportId = snapshot?.latestCompletedReport?.id ?? null;
  const hasLatestAcknowledgement = Boolean(snapshot?.latestAcknowledgementForLatestReport);

  function runProcess() {
    startTransition(async () => {
      const result = await processCaseInitialDocumentsAction(caseId);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function runGenerate() {
    startTransition(async () => {
      const result = await generatePreAnalysisReportAction(caseId);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function runAcknowledge() {
    if (!latestCompletedReportId) return;

    startTransition(async () => {
      const result = await acknowledgePreAnalysisReportAction(caseId, latestCompletedReportId);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function runRequestExternalSearches() {
    startTransition(async () => {
      const result = await requestAuthorExternalSearchesAction(caseId);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function runRefreshExternalSearches() {
    startTransition(async () => {
      const result = await refreshAuthorExternalSearchesAction(caseId);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 2xl:grid-cols-[1.05fr_1.25fr]">
        <Card>
          <CardHeader>
            <CardTitle>Status da ingestao</CardTitle>
            <CardDescription>Documentos elegiveis da fase inicial para a pre-analise.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Metric label="Elegiveis" value={String(snapshot?.metrics.eligibleCount ?? 0)} />
              <Metric label="Processados" value={String(snapshot?.metrics.processedCount ?? 0)} />
              <Metric label="Falhas" value={String(snapshot?.metrics.failedCount ?? 0)} />
              <Metric label="Unsupported" value={String(snapshot?.metrics.unsupportedCount ?? 0)} />
              <Metric label="Sem texto" value={String(snapshot?.metrics.emptyTextCount ?? 0)} />
              <Metric label="Pendentes" value={String(snapshot?.metrics.pendingCount ?? 0)} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={isPending} onClick={runProcess}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
                Processar documentos
              </Button>
              <Button type="button" variant="outline" disabled={isPending || !snapshot?.canGenerateReport} onClick={runGenerate}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {snapshot?.reports.length ? "Gerar nova versao" : "Gerar laudo previo"}
              </Button>
            </div>

            {snapshot && !snapshot.canGenerateReport ? (
              <div className="rounded-lg border bg-muted/35 p-4">
                <p className="text-sm font-semibold">Criterios para gerar o laudo</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {snapshot.generationRequirements.map((item) => (
                    <li key={item} className="rounded-md bg-white px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documentos e processamento</CardTitle>
            <CardDescription>Arquivos suportados e leitura disponivel nesta etapa.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot?.eligibleDocuments.length ? (
              snapshot.eligibleDocuments.map((item) => {
                const documentAnalysis = item.ingestion ? extractStructuredDocumentAnalysis(item.ingestion.metadata) : null;
                const analysisStatus = item.ingestion ? getDocumentAnalysisStatus(item.ingestion.metadata) : null;

                return (
                  <div key={item.document.id} className="rounded-lg border bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{item.document.file_name ?? "Documento sem nome"}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.document.id} - {documentTypeLabels[item.document.document_type]} - {item.document.mime_type ?? "mime desconhecido"}
                        </p>
                        {item.ingestion?.parser_type ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Parser: {formatParserType(item.ingestion.parser_type)}
                            {item.ingestion.extracted_text_length ? ` - ${item.ingestion.extracted_text_length} caracteres` : ""}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant={statusVariant(item.ingestion?.status ?? "pending")}>
                        {item.ingestion?.status ?? "pending"}
                      </Badge>
                    </div>

                    {documentAnalysis ? (
                      <div className="mt-3 rounded-md border bg-muted/25 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{documentAnalysis.inferred_document_kind}</Badge>
                          <Badge variant={analysisStatus === "completed" ? "success" : "outline"}>
                            analise {analysisStatus ?? "nao disponivel"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            confianca {riskLabel(documentAnalysis.confidence)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6">{documentAnalysis.summary}</p>
                      </div>
                    ) : null}

                    {item.ingestion?.error_message ? (
                      <p className="mt-3 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm">
                        {item.ingestion.error_message}
                      </p>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <EmptyState
                icon={FileText}
                title="Nenhum documento elegivel"
                description="Anexe peticao inicial, documentos do autor ou emenda inicial para habilitar a pre-analise."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <AuthorExternalSearchPanel
        snapshot={snapshot}
        isPending={isPending}
        onRequest={runRequestExternalSearches}
        onRefresh={runRefreshExternalSearches}
      />

      <div className="grid gap-5 2xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Versoes do laudo</CardTitle>
            <CardDescription>Historico versionado e auditavel das geracoes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot?.reports.length ? (
              snapshot.reports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setSelectedReportId(report.id)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors",
                    selectedReportId === report.id ? "border-primary bg-primary/5" : "bg-white hover:bg-muted/35"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">Versao {report.version}</p>
                    <Badge variant={report.status === "completed" ? "success" : report.status === "failed" ? "destructive" : "secondary"}>
                      {report.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {report.generated_at ? new Date(report.generated_at).toLocaleString("pt-BR") : "Sem data"}
                  </p>
                  {report.prompt_version ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">prompt_version: {report.prompt_version}</p>
                  ) : null}
                </button>
              ))
            ) : (
              <EmptyState icon={ShieldAlert} title="Laudo ainda nao gerado" description="Depois do processamento documental, gere o primeiro laudo previo estruturado." />
            )}

            {latestCompletedReportId ? (
              <div className="rounded-lg border bg-muted/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">Leitura do laudo</p>
                    <p className="text-sm text-muted-foreground">
                      {hasLatestAcknowledgement
                        ? `Confirmada por ${snapshot?.latestAcknowledgementForLatestReport?.acknowledger?.full_name ?? "usuario interno"}`
                        : "Ainda nao confirmada"}
                    </p>
                  </div>
                  <Button type="button" variant="outline" disabled={isPending || hasLatestAcknowledgement} onClick={runAcknowledge}>
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : hasLatestAcknowledgement ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                    {hasLatestAcknowledgement ? "Leitura confirmada" : "Confirmo leitura"}
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="min-w-0 border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,252,1)_100%)]">
          <CardHeader>
            <CardTitle>Visualizacao do laudo</CardTitle>
            <CardDescription>Leitura operacional e exportacao da versao selecionada.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedReport && selectedReport.status === "completed" ? (
              <div className="space-y-4">
                <ConfigurationTraceCard trace={extractConfigurationTrace(selectedReport.input_summary)} />
                <ProfessionalMarkdownReport
                  title={`Laudo previo operacional v${selectedReport.version}`}
                  subtitle="Relatorio interno estruturado para revisao da narrativa inicial, aderencia documental e preparacao defensiva."
                  markdown={selectedReport.report_markdown}
                  exportFileName={`laudo-previo-v${selectedReport.version}`}
                  generatedAt={selectedReport.generated_at ?? selectedReport.created_at}
                  generatedBy={selectedReport.generated_profile?.full_name ?? null}
                  promptVersion={selectedReport.prompt_version}
                  modelName={selectedReport.model_name}
                />
              </div>
            ) : selectedReport?.status === "failed" ? (
              <div className="space-y-4">
                <EmptyState icon={ShieldAlert} title="Geracao falhou" description="Revise o motivo abaixo e tente gerar uma nova versao do laudo." />
                {selectedReportFailureMessage ? (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                    <p className="text-sm font-semibold text-destructive">Motivo registrado</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                      {selectedReportFailureMessage}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState icon={FileText} title="Nenhum laudo selecionado" description="Gere o laudo previo para visualizar o resultado estruturado nesta etapa." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function extractConfigurationTrace(inputSummary: Record<string, unknown> | null | undefined) {
  const trace = inputSummary?.configuration_trace;
  return trace && typeof trace === "object" && !Array.isArray(trace) ? (trace as Record<string, unknown>) : null;
}

function extractStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function extractNamedList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const title = typeof record.title === "string" ? record.title : typeof record.label === "string" ? record.label : null;
      return title;
    })
    .filter((item): item is string => Boolean(item));
}

function ConfigurationTraceCard({ trace }: { trace: Record<string, unknown> | null }) {
  if (!trace) {
    return null;
  }

  const portfolioStrategy =
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

  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="font-semibold">Base considerada na geracao</p>
      <div className="mt-3 grid gap-4 xl:grid-cols-3">
        <TraceBlock
          title="Estrategia da carteira"
          items={[
            portfolioStrategy && typeof portfolioStrategy.label === "string" ? portfolioStrategy.label : null,
            ...extractStringList(portfolioStrategy?.focus_areas).slice(0, 3)
          ].filter((item): item is string => Boolean(item))}
        />
        <TraceBlock
          title="Perfil de prompt"
          items={[
            promptProfile && typeof promptProfile.profile_name === "string" ? promptProfile.profile_name : null,
            ...extractStringList(promptProfile?.highlights).slice(0, 4)
          ].filter((item): item is string => Boolean(item))}
        />
        <TraceBlock
          title="Configuracao juridica"
          items={[
            ...extractNamedList(legalConfiguration?.requirements).slice(0, 3),
            ...extractNamedList(legalConfiguration?.theses).slice(0, 3),
            ...extractNamedList(legalConfiguration?.templates).slice(0, 2)
          ]}
        />
      </div>
    </div>
  );
}

function TraceBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-sm font-medium">{title}</p>
      <div className="mt-2 space-y-2">
        {items.length ? items.map((item) => <p key={item} className="text-sm text-muted-foreground">{item}</p>) : <p className="text-sm text-muted-foreground">Nenhum item rastreado.</p>}
      </div>
    </div>
  );
}

function AuthorExternalSearchPanel({
  snapshot,
  isPending,
  onRequest,
  onRefresh
}: {
  snapshot: PreAnalysisSnapshot | null;
  isPending: boolean;
  onRequest: () => void;
  onRefresh: () => void;
}) {
  const metrics = snapshot?.externalAuthorSearchMetrics;

  return (
    <Card className="border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,252,1)_100%)]">
      <CardHeader>
        <CardTitle>Consulta externa de autores</CardTitle>
        <CardDescription>
          Busca complementar de processos por CPF dos autores, com identificacao a partir do cadastro da parte e da peticao inicial.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="Autores" value={String(metrics?.authorCount ?? 0)} />
          <Metric label="CPFs identificados" value={String(metrics?.identifiedCpfCount ?? 0)} />
          <Metric label="Consultas" value={String(metrics?.searchesCount ?? 0)} />
          <Metric label="Pendentes" value={String(metrics?.pendingCount ?? 0)} />
          <Metric label="Concluidas" value={String(metrics?.completedCount ?? 0)} />
          <Metric label="Processos" value={String(metrics?.processCount ?? 0)} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={isPending || !metrics?.configured} onClick={onRequest}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
            Consultar autores
          </Button>
          <Button type="button" variant="outline" disabled={isPending || !metrics?.configured} onClick={onRefresh}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar consultas
          </Button>
          {metrics?.lastRequestedAt ? (
            <Badge variant="outline">ultima solicitacao {new Date(metrics.lastRequestedAt).toLocaleString("pt-BR")}</Badge>
          ) : null}
        </div>

        {!metrics?.configured ? (
          <NeutralState message="Configure ESCAVADOR_API_TOKEN no ambiente para habilitar a consulta externa por CPF." />
        ) : null}

        {snapshot?.externalAuthorSearches.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {snapshot.externalAuthorSearches.map((search) => (
              <div key={search.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{search.party?.name ?? "Autor nao identificado"}</p>
                    <p className="text-xs text-slate-500">
                      CPF {search.cpf} • Origem {search.tribunal}
                    </p>
                  </div>
                  <Badge variant={externalSearchStatusVariant(search.status)}>{externalSearchStatusLabel(search.status)}</Badge>
                </div>

                {search.request_payload?.cpf_source ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary">fonte {String(search.request_payload.cpf_source)}</Badge>
                    {search.request_payload?.needs_human_validation ? (
                      <Badge variant="outline">validacao humana recomendada</Badge>
                    ) : null}
                  </div>
                ) : null}

                {search.request_payload?.cpf_reasoning ? (
                  <p className="mt-3 text-sm leading-6 text-slate-700">{String(search.request_payload.cpf_reasoning)}</p>
                ) : null}

                {search.error_message ? (
                  <p className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {search.error_message}
                  </p>
                ) : null}

                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Processos encontrados</p>
                  {search.processes.length ? (
                    search.processes.map((processItem) => (
                      <div key={processItem.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-slate-900">{processItem.process_number}</p>
                          <Badge variant="outline">{processItem.tribunal ?? search.tribunal}</Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {processItem.subject_summary ?? "Sem assunto estruturado na resposta externa."}
                        </p>
                        {processItem.last_movement_at ? (
                          <p className="mt-2 text-xs text-slate-500">ultima referencia: {processItem.last_movement_at}</p>
                        ) : null}
                        {processItem.source_link ? (
                          <a
                            href={processItem.source_link}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex text-sm font-medium text-sky-700 hover:text-sky-800"
                          >
                            Abrir referencia externa
                          </a>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <NeutralState
                      message={
                        search.status === "not_found"
                          ? "A consulta foi concluida sem processos retornados para este CPF nesta origem."
                          : "Nenhum processo persistido para esta consulta ate o momento."
                      }
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <NeutralState message="Nenhuma consulta externa foi iniciada para este caso. O restante da pre-analise continua funcionando sem dependencia deste bloco." />
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function NeutralState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 px-3 py-3 text-sm text-slate-500">
      {message}
    </div>
  );
}

function riskLabel(value: "low" | "medium" | "high") {
  if (value === "high") return "ALTO";
  if (value === "medium") return "MEDIO";
  return "BAIXO";
}

function formatParserType(value: string) {
  if (value === "pdf_text_based") return "PDF pesquisavel";
  if (value === "pdf_hybrid") return "PDF hibrido";
  if (value === "pdf_ocr") return "PDF visual com OCR";
  if (value === "image_ocr") return "Imagem com OCR";
  if (value === "txt_plain") return "TXT";
  return value;
}

function externalSearchStatusLabel(value: "pending" | "completed" | "failed" | "not_found") {
  if (value === "pending") return "PENDENTE";
  if (value === "completed") return "CONCLUIDA";
  if (value === "not_found") return "SEM RESULTADO";
  return "FALHA";
}

function externalSearchStatusVariant(value: "pending" | "completed" | "failed" | "not_found") {
  if (value === "completed") return "success";
  if (value === "failed") return "destructive";
  if (value === "not_found") return "outline";
  return "secondary";
}
