"use client";

import { FileText, Loader2, RefreshCw, ScanSearch, ShieldAlert, ShieldCheck } from "lucide-react";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  acknowledgePreAnalysisReportAction,
  generatePreAnalysisReportAction,
  refreshAuthorExternalSearchesAction,
  requestAuthorExternalSearchesAction
} from "@/features/ai/actions/pre-analysis-actions";
import { normalizePreAnalysisReportPayload, type PreAnalysisReportOutput } from "@/features/ai/types/pre-analysis-report";
import { processCaseInitialDocumentsAction } from "@/features/document-ingestion/actions/document-ingestion-actions";
import { extractStructuredDocumentAnalysis, getDocumentAnalysisStatus } from "@/features/document-ingestion/lib/document-analysis-helpers";
import { documentTypeLabels } from "@/features/cases/components/document-upload";
import { EmptyState } from "@/components/shared/empty-state";
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

  const selectedReportJson = useMemo(() => {
    if (!selectedReport?.report_json) return null;

    try {
      return normalizePreAnalysisReportPayload(selectedReport.report_json);
    } catch {
      return null;
    }
  }, [selectedReport]);

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
            <CardDescription>Leitura operacional da versao selecionada.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedReport && selectedReport.status === "completed" && selectedReportJson ? (
              <PreAnalysisReportView report={selectedReportJson} snapshot={snapshot} markdown={selectedReport.report_markdown} />
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

function PreAnalysisReportView({
  report,
  snapshot,
  markdown
}: {
  report: PreAnalysisReportOutput;
  snapshot: PreAnalysisSnapshot | null;
  markdown: string | null;
}) {
  const prioridadesAltas = report.priorizacao_estrategica.filter((item) => item.prioridade === "urgente" || item.prioridade === "importante");

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.05),rgba(255,255,255,1))] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Painel defensivo</p>
            <p className="max-w-5xl text-sm leading-7 text-slate-700">{report.resumo_executivo}</p>
          </div>
          <Badge variant={suficienciaVariant(report.suficiencia_probatoria.conclusao)}>
            {suficienciaLabel(report.suficiencia_probatoria.conclusao)}
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <QuickChip label="Matriz final" />
          <QuickChip label="Prioridades" />
          <QuickChip label="Fatos da emenda" />
          <QuickChip label="Mapa documental" />
          <QuickChip label="Pontos defesa" />
          <QuickChip label="Docs internos" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <Metric label="Suficiencia" value={suficienciaLabel(report.suficiencia_probatoria.conclusao)} />
        <Metric label="Pontos defesa" value={String(report.pontos_exploraveis_defesa.length)} />
        <Metric label="Prioridades" value={String(report.priorizacao_estrategica.length)} />
        <Metric label="Fatos emenda" value={String(report.fatos_supervenientes_ou_da_emenda.length)} />
        <Metric label="Docs processados" value={String(snapshot?.metrics.processedCount ?? 0)} />
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <SectionCard title="Matriz final de confronto" emphasis>
          <div className="grid gap-3 lg:grid-cols-2">
            <SoftPanel title="O que o autor narra">
              <StringList items={report.matriz_final_confronto.o_que_autor_narra} />
            </SoftPanel>
            <SoftPanel title="O que os documentos provam">
              <StringList items={report.matriz_final_confronto.o_que_documentos_provam} />
            </SoftPanel>
            <SoftPanel title="O que os documentos nao provam">
              <StringList items={report.matriz_final_confronto.o_que_documentos_nao_provam} />
            </SoftPanel>
            <SoftPanel title="O que pode ser explorado pela defesa">
              <StringList items={report.matriz_final_confronto.o_que_pode_ser_explorado_pela_defesa} />
            </SoftPanel>
          </div>
        </SectionCard>

        <SectionCard title="Prioridades operacionais" description="O que merece enfrentamento mais rapido pela defesa.">
          {prioridadesAltas.length ? (
            <div className="space-y-3">
              {prioridadesAltas.map((item) => (
                <div key={`${item.titulo}-${item.motivo}`} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{item.titulo}</p>
                    <Badge variant={prioridadeVariant(item.prioridade)}>{prioridadeLabel(item.prioridade)}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{item.motivo}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-medium text-slate-800">Acao sugerida:</span> {item.acao_sugerida}
                  </p>
                  {item.referencia_documental.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.referencia_documental.map((ref) => (
                        <Badge key={ref} variant="outline">
                          {ref}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <NeutralState message="Nao ha prioridades urgentes ou importantes estruturadas nesta versao." />
          )}
        </SectionCard>
      </div>

      <details open className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer list-none">
          <SectionHeader title="Narrativa x documentos" description={report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.justificativa} />
        </summary>
        <div className="mt-4 grid gap-4 2xl:grid-cols-2">
          <SoftPanel title="Narrativa">
            <ConclusionRow label="Documentos embasam a narrativa" value={report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.conclusao} />
            <TextBlock text={report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.justificativa} />
            <LabelledList title="Pontos fortes" items={report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.pontos_fortes} />
            <LabelledList title="Lacunas" items={report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.lacunas} />
          </SoftPanel>
          <SoftPanel title="Pedidos">
            <ConclusionRow label="Documentos embasam os pedidos" value={report.analise_narrativa_vs_documentos.documentos_embasam_pedidos.conclusao} />
            <TextBlock text={report.analise_narrativa_vs_documentos.documentos_embasam_pedidos.justificativa} />
            <LabelledList title="Pedidos sustentados" items={report.analise_narrativa_vs_documentos.documentos_embasam_pedidos.pedidos_sustentados} />
            <LabelledList title="Pedidos nao sustentados ou fracos" items={report.analise_narrativa_vs_documentos.documentos_embasam_pedidos.pedidos_nao_sustentados_ou_fracos} />
          </SoftPanel>
        </div>
      </details>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <SectionCard title="Fatos supervenientes ou da emenda" description="Alegacoes novas que merecem tratamento proprio.">
          {report.fatos_supervenientes_ou_da_emenda.length ? (
            <div className="space-y-3">
              {report.fatos_supervenientes_ou_da_emenda.map((item) => (
                <div key={`${item.descricao}-${item.impacto_para_defesa}`} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{item.descricao}</p>
                    <Badge variant={item.exige_enfrentamento_especifico ? "destructive" : "outline"}>
                      {item.exige_enfrentamento_especifico ? "enfrentar" : "monitorar"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{item.impacto_para_defesa}</p>
                  <LabelChips items={item.referencia_documental} emptyMessage="Sem referencia documental estruturada." />
                </div>
              ))}
            </div>
          ) : (
            <NeutralState message="Nao ha fatos supervenientes ou de emenda estruturados." />
          )}
        </SectionCard>

        <SectionCard title="Pontos exploraveis para defesa" description="Mapa objetivo de exploracao defensiva.">
          {report.pontos_exploraveis_defesa.length ? (
            <div className="space-y-3">
              {report.pontos_exploraveis_defesa.map((item) => (
                <div key={`${item.ponto}-${item.justificativa}`} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-semibold text-slate-900">{item.ponto}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{item.categoria.replaceAll("_", " ")}</Badge>
                      <Badge variant={relevanciaVariant(item.relevancia)}>{relevanciaLabel(item.relevancia)}</Badge>
                      <Badge variant={explorabilidadeVariant(item.explorabilidade)}>{explorabilidadeLabel(item.explorabilidade)}</Badge>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{item.justificativa}</p>
                </div>
              ))}
            </div>
          ) : (
            <NeutralState message="Nenhum ponto exploravel foi estruturado nesta versao." />
          )}
        </SectionCard>
      </div>

      <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" open>
        <summary className="cursor-pointer list-none">
          <SectionHeader title="Mapa documental do autor" description="Rastreabilidade por documento, com vinculo subjetivo e impacto defensivo." />
        </summary>
        <div className="mt-4 space-y-3">
          {report.mapa_documental_autor.length ? (
            report.mapa_documental_autor.map((item) => (
              <div key={`${item.documento_referencia}-${item.tipo_documento}`} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.documento_referencia}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.tipo_documento}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{vinculoLabel(item.vinculo_subjetivo)}</Badge>
                    <Badge variant={pesoProbatorioVariant(item.peso_probatorio)}>{pesoProbatorioLabel(item.peso_probatorio)}</Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <SoftPanel title="Leitura documental">
                    <InfoLine label="Titular ou emitente" value={item.titular_ou_emitente ?? "Nao identificado"} />
                    <InfoLine label="Impacto para defesa" value={item.impacto_para_defesa} />
                    <InfoLine label="Referencia de trecho" value={item.referencia_trecho_ou_contexto ?? "Nao informada"} />
                  </SoftPanel>
                  <SoftPanel title="Achados e cautelas">
                    <LabelledList title="Achados principais" items={item.achados_principais} />
                    <LabelledList title="Pontos de atencao" items={item.pontos_de_atencao} />
                  </SoftPanel>
                </div>
              </div>
            ))
          ) : (
            <NeutralState message="Nao ha rastreabilidade documental estruturada para esta versao do laudo." />
          )}
        </div>
      </details>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Suficiencia probatoria" description={report.suficiencia_probatoria.observacoes}>
          <div className="flex flex-wrap gap-2">
            <Badge variant={suficienciaVariant(report.suficiencia_probatoria.conclusao)}>
              {suficienciaLabel(report.suficiencia_probatoria.conclusao)}
            </Badge>
          </div>
          <div className="mt-3 space-y-3">
            <LabelledList title="Provas fortes" items={report.suficiencia_probatoria.provas_fortes} />
            <LabelledList title="Provas fracas ou unilaterais" items={report.suficiencia_probatoria.provas_fracas_ou_unilaterais} />
            <LabelledList title="Documentos-chave ausentes" items={report.suficiencia_probatoria.documentos_chave_ausentes} />
          </div>
        </SectionCard>

        <SectionCard title="Pedido indenizatorio" description="Aderencia minima entre pedidos e prova disponivel.">
          <div className="space-y-3">
            <ConclusionRow label="Dano material tem prova minima" value={report.pedido_indenizatorio.dano_material_tem_prova_minima} />
            <ConclusionRow label="Valor pedido tem suporte documental" value={report.pedido_indenizatorio.valor_pedido_tem_suporte_documental} />
            <ConclusionRow label="Dano moral tem base fatica individualizada" value={report.pedido_indenizatorio.dano_moral_tem_base_fatica_individualizada} />
            <LabelledList title="Despesas extraordinarias comprovadas" items={report.pedido_indenizatorio.despesas_extraordinarias_comprovadas} />
            <LabelledList title="Lacunas" items={report.pedido_indenizatorio.lacunas} />
          </div>
        </SectionCard>
      </div>

      <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer list-none">
          <SectionHeader title="Cronologia, coerencia e individualizacao" description="Bloco de verificacao objetiva do conjunto fatico-documental." />
        </summary>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <SoftPanel title="Cronologia">
            {report.cronologia.eventos_identificados.length ? (
              <div className="space-y-3">
                {report.cronologia.eventos_identificados.map((item, index) => (
                  <div key={`${item.data}-${item.evento}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="font-medium text-slate-900">{item.evento}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.data ?? "Data nao identificada"} - {item.fonte_documental ?? "Fonte nao informada"}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{item.observacao}</p>
                  </div>
                ))}
              </div>
            ) : (
              <NeutralState message="Nenhum evento cronologico estruturado." />
            )}
            <LabelledList title="Inconsistencias temporais" items={report.cronologia.inconsistencias_temporais} />
            <LabelledList title="Eventos sem prova temporal" items={report.cronologia.eventos_sem_prova_temporal} />
          </SoftPanel>

          <SoftPanel title="Coerencia entre documentos">
            <LabelledList title="Nomes divergentes" items={report.coerencia_entre_documentos.nomes_divergentes} />
            <LabelledList title="Datas divergentes" items={report.coerencia_entre_documentos.datas_divergentes} />
            <LabelledList title="Valores divergentes" items={report.coerencia_entre_documentos.valores_divergentes} />
            <LabelledList title="Codigos localizadores divergentes" items={report.coerencia_entre_documentos.codigos_localizadores_divergentes} />
            <LabelledList title="Emails, telefones ou identificadores divergentes" items={report.coerencia_entre_documentos.emails_telefones_ou_identificadores_divergentes} />
            <TextBlock text={report.coerencia_entre_documentos.observacoes} />
          </SoftPanel>

          <SoftPanel title="Individualizacao por autor">
            {report.analise_individualizada_por_autor.length ? (
              <div className="space-y-3">
                {report.analise_individualizada_por_autor.map((item) => (
                  <div key={item.nome_autor} className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="font-medium text-slate-900">{item.nome_autor}</p>
                    <LabelledList title="Documentos vinculados" items={item.documentos_vinculados} />
                    <LabelledList title="Pedidos vinculados" items={item.pedidos_vinculados} />
                    <LabelledList title="Danos individualizados" items={item.danos_individualizados} />
                    <LabelledList title="Lacunas de individualizacao" items={item.lacunas_individualizacao} />
                  </div>
                ))}
              </div>
            ) : (
              <NeutralState message="Nao houve individualizacao estruturada por autor." />
            )}
          </SoftPanel>
        </div>
      </details>

      <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer list-none">
          <SectionHeader title="Analise por tipo documental" description="Leitura tecnica dos tipos documentais principais." />
        </summary>
        <div className="mt-4 grid gap-4 2xl:grid-cols-2">
          <SoftPanel title="Procuracao">
            <InfoLine label="Existe" value={report.analise_por_tipo_documental.procuracao.existe ? "Sim" : "Nao"} />
            <InfoLine label="Regularidade formal" value={report.analise_por_tipo_documental.procuracao.regularidade_formal} />
            <InfoLine label="Assinatura e compatibilidade" value={assinaturaLabel(report.analise_por_tipo_documental.procuracao.assinatura_compatibilidade)} />
            <LabelledList title="Pontos de atencao" items={report.analise_por_tipo_documental.procuracao.pontos_de_atencao} />
          </SoftPanel>
          <SoftPanel title="Documento de identidade">
            <InfoLine label="Existe" value={report.analise_por_tipo_documental.documento_identidade.existe ? "Sim" : "Nao"} />
            <InfoLine label="Compatibilidade com a parte" value={report.analise_por_tipo_documental.documento_identidade.compatibilidade_com_parte} />
            <LabelledList title="Sinais de edicao ou layout incompativel" items={report.analise_por_tipo_documental.documento_identidade.sinais_de_edicao_ou_layout_incompativel} />
            <LabelledList title="Pontos de atencao" items={report.analise_por_tipo_documental.documento_identidade.pontos_de_atencao} />
          </SoftPanel>
          <SoftPanel title="Comprovante de endereco">
            <InfoLine label="Existe" value={report.analise_por_tipo_documental.comprovante_endereco.existe ? "Sim" : "Nao"} />
            <InfoLine label="Aderencia ao nome da parte" value={report.analise_por_tipo_documental.comprovante_endereco.aderencia_ao_nome_da_parte} />
            <InfoLine label="Aderencia ao endereco da inicial" value={report.analise_por_tipo_documental.comprovante_endereco.aderencia_ao_endereco_da_inicial} />
            <LabelledList title="Sinais de edicao ou layout incompativel" items={report.analise_por_tipo_documental.comprovante_endereco.sinais_de_edicao_ou_layout_incompativel} />
            <LabelledList title="Pontos de atencao" items={report.analise_por_tipo_documental.comprovante_endereco.pontos_de_atencao} />
          </SoftPanel>
          <SoftPanel title="Comprovantes de pagamento">
            <InfoLine label="Existem" value={report.analise_por_tipo_documental.comprovantes_pagamento.existem ? "Sim" : "Nao"} />
            <InfoLine label="Aderencia ao nome da parte" value={report.analise_por_tipo_documental.comprovantes_pagamento.aderencia_ao_nome_da_parte} />
            <LabelledList title="Datas e valores identificados" items={report.analise_por_tipo_documental.comprovantes_pagamento.datas_valores_identificados} />
            <LabelledList title="Sinais de edicao ou layout incompativel" items={report.analise_por_tipo_documental.comprovantes_pagamento.sinais_de_edicao_ou_layout_incompativel} />
            <LabelledList title="Pontos de atencao" items={report.analise_por_tipo_documental.comprovantes_pagamento.pontos_de_atencao} />
          </SoftPanel>
          <SoftPanel title="Prints de tela">
            <InfoLine label="Existem" value={report.analise_por_tipo_documental.prints_tela.existem ? "Sim" : "Nao"} />
            <InfoLine label="Compatibilidade com a plataforma alegada" value={report.analise_por_tipo_documental.prints_tela.compatibilidade_com_plataforma_alegada} />
            <div className="flex flex-wrap gap-2">
              <Badge variant={qualidadePrintVariant(report.analise_por_tipo_documental.prints_tela["qualidade_probat\u00f3ria"])}>
                {qualidadePrintLabel(report.analise_por_tipo_documental.prints_tela["qualidade_probat\u00f3ria"])}
              </Badge>
            </div>
            <LabelledList title="Sinais de edicao ou recorte" items={report.analise_por_tipo_documental.prints_tela.sinais_de_edicao_ou_recorte} />
            <LabelledList title="Pontos de atencao" items={report.analise_por_tipo_documental.prints_tela.pontos_de_atencao} />
          </SoftPanel>
          <SoftPanel title="Outros documentos">
            {report.analise_por_tipo_documental.outros_documentos.length ? (
              <div className="space-y-3">
                {report.analise_por_tipo_documental.outros_documentos.map((item) => (
                  <div key={`${item.tipo_ou_descricao}-${item.observacoes}`} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{item.tipo_ou_descricao}</p>
                      <Badge variant={pesoProbatorioVariant(item.peso_probatorio)}>{pesoProbatorioLabel(item.peso_probatorio)}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{item.observacoes}</p>
                  </div>
                ))}
              </div>
            ) : (
              <NeutralState message="Nenhum outro documento estruturado foi informado." />
            )}
          </SoftPanel>
        </div>
      </details>

      <div className="grid gap-5 2xl:grid-cols-2">
        <SectionCard title="Cadeia negocial e canal documental" description="Quem aparece materialmente na relacao e quais canais tem prova.">
          <InfoLine label="Quem comprou" value={report.cadeia_negocial.quem_comprou ?? "Nao identificado"} />
          <InfoLine label="Quem pagou" value={report.cadeia_negocial.quem_pagou ?? "Nao identificado"} />
          <InfoLine label="Quem viajou ou seria beneficiario" value={report.cadeia_negocial.quem_viajou_ou_seria_beneficiario ?? "Nao identificado"} />
          <InfoLine label="Quem reclamou ou solicitou suporte" value={report.cadeia_negocial.quem_reclamou_ou_solicitou_suporte ?? "Nao identificado"} />
          <InfoLine label="Quem recebeu ou deveria receber estorno" value={report.cadeia_negocial.quem_recebeu_ou_deveria_receber_estorno ?? "Nao identificado"} />
          <LabelledList title="Divergencias entre pessoas" items={report.cadeia_negocial.divergencias_entre_pessoas} />
          <LabelledList title="Alegacoes vs canais comprovados" items={report.compatibilidade_canal_documento.alegacoes_vs_canais_comprovados} />
          <LabelledList title="Prova de contratacao" items={report.compatibilidade_canal_documento.prova_de_contratacao} />
          <LabelledList title="Prova de tentativa" items={report.compatibilidade_canal_documento.prova_de_tentativa} />
        </SectionCard>

        <SectionCard title="Representacao, espacialidade e integridade" description="Riscos auxiliares de consistencia processual e tecnica.">
          <div className="flex flex-wrap gap-2">
            <Badge variant={regularidadeVariant(report.representacao_processual.regularidade_aparente)}>
              {regularidadeLabel(report.representacao_processual.regularidade_aparente)}
            </Badge>
          </div>
          <LabelledList title="Pontos de atencao da representacao" items={report.representacao_processual.pontos_de_atencao} />
          <LabelledList title="Autores sem procuracao ou documento" items={report.representacao_processual.autores_sem_procuracao_ou_documento} />
          <LabelledList title="Cidades e enderecos identificados" items={report.espacialidade.cidades_enderecos_identificados} />
          <LabelledList title="Inconsistencias territoriais" items={report.espacialidade.inconsistencias_territoriais} />
          <LabelledList title="Sinais possiveis de manipulacao" items={report.integridade_tecnica_arquivos.sinais_possiveis_de_manipulacao} />
          <LabelledList title="Limitacoes da analise" items={report.integridade_tecnica_arquivos.limitacoes_da_analise} />
        </SectionCard>
      </div>

      <div className="grid gap-5 2xl:grid-cols-2">
        <SectionCard title="Documentos internos recomendados" description="Materiais internos que podem robustecer a defesa.">
          <StringList items={report.documentos_internos_recomendados_para_defesa} />
        </SectionCard>
        <SectionCard title="Alertas e nao conclusao" description="Campos prudenciais e pontos dependentes de validacao humana.">
          <StringList items={report.alertas_de_nao_conclusao} />
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Necessita validacao humana: {report.integridade_tecnica_arquivos.necessita_validacao_humana ? "Sim" : "Nao"}
          </p>
        </SectionCard>
      </div>

      <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer list-none">
          <SectionHeader title="Markdown persistido" description="Representacao textual salva do laudo atual." />
        </summary>
        <div className="mt-4">
          {markdown ? (
            <pre className="whitespace-pre-wrap text-xs leading-6 text-slate-600">{markdown}</pre>
          ) : (
            <NeutralState message="Nao ha markdown persistido para esta versao." />
          )}
        </div>
      </details>
    </div>
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

function SectionCard({
  title,
  description,
  children,
  emphasis = false
}: {
  title: string;
  description?: string;
  children: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-sm",
        emphasis
          ? "border-slate-300 bg-[linear-gradient(135deg,rgba(241,245,249,1),rgba(255,255,255,1))]"
          : "border-slate-200 bg-white"
      )}
    >
      <SectionHeader title={title} description={description} />
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <p className="font-semibold text-slate-900">{title}</p>
      {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
    </div>
  );
}

function SoftPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function QuickChip({ label }: { label: string }) {
  return <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">{label}</span>;
}

function StringList({ items }: { items: string[] }) {
  return items.length ? (
    <ul className="space-y-2 text-sm leading-6 text-slate-700">
      {items.map((item) => (
        <li key={item} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          {item}
        </li>
      ))}
    </ul>
  ) : (
    <NeutralState message="Sem elementos suficientes nesta secao." />
  );
}

function LabelledList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <StringList items={items} />
    </div>
  );
}

function LabelChips({ items, emptyMessage }: { items: string[]; emptyMessage: string }) {
  return items.length ? (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item} variant="outline">
          {item}
        </Badge>
      ))}
    </div>
  ) : (
    <p className="mt-3 text-sm text-slate-500">{emptyMessage}</p>
  );
}

function NeutralState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 px-3 py-3 text-sm text-slate-500">
      {message}
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function TextBlock({ text }: { text: string }) {
  return <p className="text-sm leading-6 text-slate-700">{text}</p>;
}

function ConclusionRow({
  label,
  value
}: {
  label: string;
  value: "sim" | "parcialmente" | "nao" | "inconclusivo";
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <Badge variant={conclusionVariant(value)}>{conclusionLabel(value)}</Badge>
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

function conclusionLabel(value: "sim" | "parcialmente" | "nao" | "inconclusivo") {
  if (value === "sim") return "SIM";
  if (value === "parcialmente") return "PARCIALMENTE";
  if (value === "nao") return "NAO";
  return "INCONCLUSIVO";
}

function conclusionVariant(value: "sim" | "parcialmente" | "nao" | "inconclusivo") {
  if (value === "sim") return "success";
  if (value === "parcialmente") return "outline";
  if (value === "nao") return "destructive";
  return "secondary";
}

function suficienciaLabel(value: "suficiente" | "parcial" | "insuficiente" | "inconclusiva") {
  if (value === "suficiente") return "SUFICIENTE";
  if (value === "parcial") return "PARCIAL";
  if (value === "insuficiente") return "INSUFICIENTE";
  return "INCONCLUSIVA";
}

function suficienciaVariant(value: "suficiente" | "parcial" | "insuficiente" | "inconclusiva") {
  if (value === "suficiente") return "success";
  if (value === "parcial") return "outline";
  if (value === "insuficiente") return "destructive";
  return "secondary";
}

function qualidadePrintLabel(value: "forte" | "media" | "fraca" | "inconclusiva") {
  if (value === "forte") return "FORTE";
  if (value === "media") return "MEDIA";
  if (value === "fraca") return "FRACA";
  return "INCONCLUSIVA";
}

function qualidadePrintVariant(value: "forte" | "media" | "fraca" | "inconclusiva") {
  if (value === "forte") return "success";
  if (value === "media") return "outline";
  if (value === "fraca") return "destructive";
  return "secondary";
}

function assinaturaLabel(value: "compativel" | "incompativel" | "indicio_de_inconsistencia" | "nao_verificavel") {
  if (value === "compativel") return "Compativel";
  if (value === "incompativel") return "Incompativel";
  if (value === "indicio_de_inconsistencia") return "Indicio de inconsistencias";
  return "Nao verificavel";
}

function pesoProbatorioLabel(value: "forte" | "medio" | "fraco" | "inconclusivo" | "contraditorio") {
  if (value === "forte") return "PESO FORTE";
  if (value === "medio") return "PESO MEDIO";
  if (value === "fraco") return "PESO FRACO";
  if (value === "contraditorio") return "CONTRADITORIO";
  return "INCONCLUSIVO";
}

function pesoProbatorioVariant(value: "forte" | "medio" | "fraco" | "inconclusivo" | "contraditorio") {
  if (value === "forte") return "success";
  if (value === "medio") return "outline";
  if (value === "fraco" || value === "contraditorio") return "destructive";
  return "secondary";
}

function prioridadeLabel(value: "urgente" | "importante" | "relevante" | "considerar") {
  if (value === "urgente") return "URGENTE";
  if (value === "importante") return "IMPORTANTE";
  if (value === "relevante") return "RELEVANTE";
  return "CONSIDERAR";
}

function prioridadeVariant(value: "urgente" | "importante" | "relevante" | "considerar") {
  if (value === "urgente") return "destructive";
  if (value === "importante") return "outline";
  if (value === "relevante") return "secondary";
  return "secondary";
}

function relevanciaLabel(value: "baixa" | "media" | "alta" | "critica") {
  if (value === "critica") return "RELEVANCIA CRITICA";
  if (value === "alta") return "RELEVANCIA ALTA";
  if (value === "media") return "RELEVANCIA MEDIA";
  return "RELEVANCIA BAIXA";
}

function relevanciaVariant(value: "baixa" | "media" | "alta" | "critica") {
  if (value === "critica") return "destructive";
  if (value === "alta") return "outline";
  if (value === "media") return "secondary";
  return "secondary";
}

function explorabilidadeLabel(value: "baixa" | "media" | "alta") {
  if (value === "alta") return "EXPLORABILIDADE ALTA";
  if (value === "media") return "EXPLORABILIDADE MEDIA";
  return "EXPLORABILIDADE BAIXA";
}

function explorabilidadeVariant(value: "baixa" | "media" | "alta") {
  if (value === "alta") return "success";
  if (value === "media") return "outline";
  return "secondary";
}

function regularidadeLabel(value: "regular" | "parcial" | "irregular" | "inconclusiva") {
  if (value === "regular") return "REGULAR";
  if (value === "parcial") return "PARCIAL";
  if (value === "irregular") return "IRREGULAR";
  return "INCONCLUSIVA";
}

function regularidadeVariant(value: "regular" | "parcial" | "irregular" | "inconclusiva") {
  if (value === "regular") return "success";
  if (value === "parcial") return "outline";
  if (value === "irregular") return "destructive";
  return "secondary";
}

function vinculoLabel(value: "autor_direto" | "terceiro" | "nao_identificado" | "divergente") {
  if (value === "autor_direto") return "Autor direto";
  if (value === "terceiro") return "Terceiro";
  if (value === "divergente") return "Divergente";
  return "Nao identificado";
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
