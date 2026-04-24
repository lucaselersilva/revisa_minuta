"use client";

import {
  FileText,
  Loader2,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { acknowledgePreAnalysisReportAction, generatePreAnalysisReportAction } from "@/features/ai/actions/pre-analysis-actions";
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
    if (!selectedReport?.report_json) {
      return null;
    }

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
    if (!latestCompletedReportId) {
      return;
    }

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

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
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
            <CardDescription>Arquivos suportados, sem OCR nesta fase.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot?.eligibleDocuments.length ? (
              snapshot.eligibleDocuments.map((item) => (
                <div key={item.document.id} className="rounded-lg border bg-white p-4">
                  {(() => {
                    const documentAnalysis = item.ingestion ? extractStructuredDocumentAnalysis(item.ingestion.metadata) : null;
                    const analysisStatus = item.ingestion ? getDocumentAnalysisStatus(item.ingestion.metadata) : null;

                    return (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold">{item.document.file_name ?? "Documento sem nome"}</p>
                            <p className="text-xs text-muted-foreground">
                              {documentTypeLabels[item.document.document_type]} - {item.document.mime_type ?? "mime desconhecido"}
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
                            {documentAnalysis.key_findings.length ? (
                              <ul className="mt-3 space-y-2 text-sm">
                                {documentAnalysis.key_findings.slice(0, 3).map((finding) => (
                                  <li key={`${finding.title}-${finding.evidence}`} className="rounded-md bg-white px-3 py-2">
                                    <span className="font-medium">{finding.title}</span> [{riskLabel(finding.severity)}] -{" "}
                                    {finding.evidence}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        ) : analysisStatus === "failed" ? (
                          <p className="mt-3 text-xs text-destructive">
                            Analise estruturada falhou: {String(item.ingestion?.metadata.analysis_error_message ?? "sem detalhe")}
                          </p>
                        ) : null}
                        {item.ingestion?.error_message ? (
                          <p className="mt-3 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm">
                            {item.ingestion.error_message}
                          </p>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              ))
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

      <div className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
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

        <Card className="border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,252,1)_100%)]">
          <CardHeader>
            <CardTitle>Visualizacao do laudo</CardTitle>
            <CardDescription>Leitura operacional da versao selecionada.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedReport && selectedReport.status === "completed" && selectedReportJson ? (
              <PreAnalysisReportView report={selectedReportJson} snapshot={snapshot} markdown={selectedReport.report_markdown} />
            ) : selectedReport?.status === "failed" ? (
              <div className="space-y-4">
                <EmptyState
                  icon={ShieldAlert}
                  title="Geracao falhou"
                  description="Revise o motivo abaixo, ajuste o contexto se necessario e tente gerar uma nova versao do laudo."
                />
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

function PreAnalysisReportView({
  report,
  snapshot,
  markdown
}: {
  report: PreAnalysisReportOutput;
  snapshot: PreAnalysisSnapshot | null;
  markdown: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.08),transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.04),rgba(255,255,255,1))] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pre-analise defensiva</p>
            <p className="max-w-3xl text-sm leading-6 text-slate-700">{report.resumo_executivo}</p>
          </div>
          <Badge variant={suficienciaVariant(report.suficiencia_probatoria.conclusao)}>
            {suficienciaLabel(report.suficiencia_probatoria.conclusao)}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Suficiencia" value={suficienciaLabel(report.suficiencia_probatoria.conclusao)} />
        <Metric label="Pontos defesa" value={String(report.pontos_exploraveis_defesa.length)} />
        <Metric label="Eventos" value={String(report.cronologia.eventos_identificados.length)} />
        <Metric label="Docs processados" value={String(snapshot?.metrics.processedCount ?? 0)} />
      </div>

      <ReportSection
        title="Matriz final de confronto"
        emphasis
        content={
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
        }
      />

      <AccordionCard
        title="Narrativa x documentos"
        summary={report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.justificativa}
        defaultOpen
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <SoftPanel title="Narrativa">
            <div className="space-y-3">
              <ConclusionBadgeRow
                label="Documentos embasam a narrativa"
                badge={<ConclusionBadge value={report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.conclusao} />}
              />
              <p className="text-sm leading-6 text-slate-700">
                {report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.justificativa}
              </p>
              <LabelledList
                title="Pontos fortes"
                items={report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.pontos_fortes}
              />
              <LabelledList title="Lacunas" items={report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.lacunas} />
            </div>
          </SoftPanel>

          <SoftPanel title="Pedidos">
            <div className="space-y-3">
              <ConclusionBadgeRow
                label="Documentos embasam os pedidos"
                badge={<ConclusionBadge value={report.analise_narrativa_vs_documentos.documentos_embasam_pedidos.conclusao} />}
              />
              <p className="text-sm leading-6 text-slate-700">
                {report.analise_narrativa_vs_documentos.documentos_embasam_pedidos.justificativa}
              </p>
              <LabelledList
                title="Pedidos sustentados"
                items={report.analise_narrativa_vs_documentos.documentos_embasam_pedidos.pedidos_sustentados}
              />
              <LabelledList
                title="Pedidos nao sustentados ou fracos"
                items={report.analise_narrativa_vs_documentos.documentos_embasam_pedidos.pedidos_nao_sustentados_ou_fracos}
              />
            </div>
          </SoftPanel>
        </div>
      </AccordionCard>

      <AccordionCard title="Pontos exploraveis para defesa" summary="Achados objetivos com foco em relevancia e explorabilidade." defaultOpen>
        <div className="space-y-3">
          {report.pontos_exploraveis_defesa.length ? (
            report.pontos_exploraveis_defesa.map((item) => (
              <div key={`${item.ponto}-${item.justificativa}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-900">{item.ponto}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{categoriaLabel(item.categoria)}</Badge>
                      <RelevanciaBadge value={item.relevancia} />
                      <ExplorabilidadeBadge value={item.explorabilidade} />
                      {item.necessita_validacao_humana ? <Badge variant="outline">validacao humana</Badge> : null}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{item.justificativa}</p>
              </div>
            ))
          ) : (
            <NeutralState message="Nenhum ponto estruturado foi retornado nesta versao do laudo." />
          )}
        </div>
      </AccordionCard>

      <AccordionCard title="Suficiencia probatoria" summary={report.suficiencia_probatoria.observacoes} defaultOpen>
        <div className="grid gap-3 lg:grid-cols-2">
          <SoftPanel title="Leitura geral">
            <div className="space-y-3">
              <Badge variant={suficienciaVariant(report.suficiencia_probatoria.conclusao)}>
                {suficienciaLabel(report.suficiencia_probatoria.conclusao)}
              </Badge>
              <p className="text-sm leading-6 text-slate-700">{report.suficiencia_probatoria.observacoes}</p>
            </div>
          </SoftPanel>
          <SoftPanel title="Base probatoria">
            <LabelledList title="Provas fortes" items={report.suficiencia_probatoria.provas_fortes} />
            <LabelledList
              title="Provas fracas ou unilaterais"
              items={report.suficiencia_probatoria.provas_fracas_ou_unilaterais}
            />
            <LabelledList
              title="Documentos-chave ausentes"
              items={report.suficiencia_probatoria.documentos_chave_ausentes}
            />
          </SoftPanel>
        </div>
      </AccordionCard>

      <AccordionCard title="Cronologia" summary="Linha do tempo consolidada a partir dos documentos disponiveis." defaultOpen>
        <div className="space-y-3">
          {report.cronologia.eventos_identificados.length ? (
            report.cronologia.eventos_identificados.map((item, index) => (
              <div key={`${item.data}-${item.evento}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.evento}</p>
                  <Badge variant="outline">{item.data ?? "data nao identificada"}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">Fonte: {item.fonte_documental ?? "nao informada"}</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{item.observacao}</p>
              </div>
            ))
          ) : (
            <NeutralState message="Nenhum evento temporal estruturado foi identificado." />
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            <SoftPanel title="Inconsistencias temporais">
              <StringList items={report.cronologia.inconsistencias_temporais} />
            </SoftPanel>
            <SoftPanel title="Eventos sem prova temporal">
              <StringList items={report.cronologia.eventos_sem_prova_temporal} />
            </SoftPanel>
          </div>
        </div>
      </AccordionCard>

      <AccordionCard title="Analise por tipo documental" summary="Leitura tecnica resumida por categoria documental.">
        <div className="grid gap-3 lg:grid-cols-2">
          <DocumentTypePanel title="Procuracao">
            <BooleanLine label="Existe" value={report.analise_por_tipo_documental.procuracao.existe} />
            <TextLine label="Regularidade formal" value={report.analise_por_tipo_documental.procuracao.regularidade_formal} />
            <TextLine
              label="Assinatura e compatibilidade"
              value={assinaturaLabel(report.analise_por_tipo_documental.procuracao.assinatura_compatibilidade)}
            />
            <LabelledList title="Pontos de atencao" items={report.analise_por_tipo_documental.procuracao.pontos_de_atencao} />
          </DocumentTypePanel>

          <DocumentTypePanel title="Documento de identidade">
            <BooleanLine label="Existe" value={report.analise_por_tipo_documental.documento_identidade.existe} />
            <TextLine label="Compatibilidade com a parte" value={report.analise_por_tipo_documental.documento_identidade.compatibilidade_com_parte} />
            <LabelledList
              title="Sinais de edicao ou layout incompativel"
              items={report.analise_por_tipo_documental.documento_identidade.sinais_de_edicao_ou_layout_incompativel}
            />
            <LabelledList title="Pontos de atencao" items={report.analise_por_tipo_documental.documento_identidade.pontos_de_atencao} />
          </DocumentTypePanel>

          <DocumentTypePanel title="Comprovante de endereco">
            <BooleanLine label="Existe" value={report.analise_por_tipo_documental.comprovante_endereco.existe} />
            <TextLine label="Aderencia ao nome da parte" value={report.analise_por_tipo_documental.comprovante_endereco.aderencia_ao_nome_da_parte} />
            <TextLine label="Aderencia ao endereco da inicial" value={report.analise_por_tipo_documental.comprovante_endereco.aderencia_ao_endereco_da_inicial} />
            <LabelledList
              title="Sinais de edicao ou layout incompativel"
              items={report.analise_por_tipo_documental.comprovante_endereco.sinais_de_edicao_ou_layout_incompativel}
            />
            <LabelledList title="Pontos de atencao" items={report.analise_por_tipo_documental.comprovante_endereco.pontos_de_atencao} />
          </DocumentTypePanel>

          <DocumentTypePanel title="Comprovantes de pagamento">
            <BooleanLine label="Existem" value={report.analise_por_tipo_documental.comprovantes_pagamento.existem} />
            <TextLine label="Aderencia ao nome da parte" value={report.analise_por_tipo_documental.comprovantes_pagamento.aderencia_ao_nome_da_parte} />
            <LabelledList
              title="Datas e valores identificados"
              items={report.analise_por_tipo_documental.comprovantes_pagamento.datas_valores_identificados}
            />
            <LabelledList
              title="Sinais de edicao ou layout incompativel"
              items={report.analise_por_tipo_documental.comprovantes_pagamento.sinais_de_edicao_ou_layout_incompativel}
            />
            <LabelledList title="Pontos de atencao" items={report.analise_por_tipo_documental.comprovantes_pagamento.pontos_de_atencao} />
          </DocumentTypePanel>

          <DocumentTypePanel title="Prints de tela">
            <BooleanLine label="Existem" value={report.analise_por_tipo_documental.prints_tela.existem} />
            <TextLine
              label="Compatibilidade com a plataforma alegada"
              value={report.analise_por_tipo_documental.prints_tela.compatibilidade_com_plataforma_alegada}
            />
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Qualidade probatoria</p>
              <Badge variant={qualidadePrintVariant(report.analise_por_tipo_documental.prints_tela["qualidade_probatória"])}>
                {qualidadePrintLabel(report.analise_por_tipo_documental.prints_tela["qualidade_probatória"])}
              </Badge>
            </div>
            <LabelledList
              title="Sinais de edicao ou recorte"
              items={report.analise_por_tipo_documental.prints_tela.sinais_de_edicao_ou_recorte}
            />
            <LabelledList title="Pontos de atencao" items={report.analise_por_tipo_documental.prints_tela.pontos_de_atencao} />
          </DocumentTypePanel>
        </div>

        <SoftPanel title="Outros documentos" className="mt-3">
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
      </AccordionCard>

      <AccordionCard title="Individualizacao por autor" summary="Separacao de autores, documentos e danos individualizados.">
        {report.analise_individualizada_por_autor.length ? (
          <div className="space-y-3">
            {report.analise_individualizada_por_autor.map((item) => (
              <SoftPanel key={item.nome_autor} title={item.nome_autor}>
                <LabelledList title="Documentos vinculados" items={item.documentos_vinculados} />
                <LabelledList title="Pedidos vinculados" items={item.pedidos_vinculados} />
                <LabelledList title="Danos individualizados" items={item.danos_individualizados} />
                <LabelledList title="Lacunas de individualizacao" items={item.lacunas_individualizacao} />
                <TextLine label="Observacoes" value={item.observacoes} />
              </SoftPanel>
            ))}
          </div>
        ) : (
          <NeutralState message="Nao houve individualizacao estruturada por autor nesta versao." />
        )}
      </AccordionCard>

      <AccordionCard title="Cadeia negocial" summary="Identificacao objetiva dos polos materiais da relacao.">
        <div className="grid gap-3 lg:grid-cols-2">
          <SoftPanel title="Papeis identificados">
            <IdentityLine label="Quem comprou" value={report.cadeia_negocial.quem_comprou} />
            <IdentityLine label="Quem pagou" value={report.cadeia_negocial.quem_pagou} />
            <IdentityLine
              label="Quem viajou ou seria beneficiario"
              value={report.cadeia_negocial.quem_viajou_ou_seria_beneficiario}
            />
            <IdentityLine
              label="Quem reclamou ou solicitou suporte"
              value={report.cadeia_negocial.quem_reclamou_ou_solicitou_suporte}
            />
            <IdentityLine
              label="Quem recebeu ou deveria receber estorno"
              value={report.cadeia_negocial.quem_recebeu_ou_deveria_receber_estorno}
            />
          </SoftPanel>
          <SoftPanel title="Divergencias entre pessoas">
            <StringList items={report.cadeia_negocial.divergencias_entre_pessoas} />
          </SoftPanel>
        </div>
      </AccordionCard>

      <AccordionCard title="Pedido indenizatorio" summary="Aderencia documental minima aos pedidos economicos e extrapatrimoniais.">
        <div className="grid gap-3 lg:grid-cols-2">
          <SoftPanel title="Conclusoes">
            <ConclusionLine label="Dano material tem prova minima" value={report.pedido_indenizatorio.dano_material_tem_prova_minima} />
            <ConclusionLine
              label="Valor pedido tem suporte documental"
              value={report.pedido_indenizatorio.valor_pedido_tem_suporte_documental}
            />
            <ConclusionLine
              label="Dano moral tem base fatica individualizada"
              value={report.pedido_indenizatorio.dano_moral_tem_base_fatica_individualizada}
            />
          </SoftPanel>
          <SoftPanel title="Apoio documental">
            <LabelledList title="Despesas extraordinarias comprovadas" items={report.pedido_indenizatorio.despesas_extraordinarias_comprovadas} />
            <LabelledList title="Lacunas" items={report.pedido_indenizatorio.lacunas} />
          </SoftPanel>
        </div>
      </AccordionCard>

      <AccordionCard title="Compatibilidade canal x documento" summary="Confronto entre o canal alegado e o tipo de prova apresentado.">
        <div className="grid gap-3 lg:grid-cols-2">
          <SoftPanel title="Alegacoes e contratacao">
            <LabelledList title="Alegacoes vs canais comprovados" items={report.compatibilidade_canal_documento.alegacoes_vs_canais_comprovados} />
            <LabelledList title="Prova de contratacao" items={report.compatibilidade_canal_documento.prova_de_contratacao} />
            <LabelledList title="Prova de tentativa" items={report.compatibilidade_canal_documento.prova_de_tentativa} />
          </SoftPanel>
          <SoftPanel title="Oferta e material inconclusivo">
            <LabelledList
              title="Prova de oferta ou pre-reserva"
              items={report.compatibilidade_canal_documento.prova_de_oferta_ou_pre_reserva}
            />
            <LabelledList
              title="Mera consulta ou print inconclusivo"
              items={report.compatibilidade_canal_documento.mera_consulta_ou_print_inconclusivo}
            />
          </SoftPanel>
        </div>
      </AccordionCard>

      <AccordionCard title="Coerencia, representacao e integridade" summary="Bloco auxiliar para validacao defensiva e cautelas da analise.">
        <div className="grid gap-3 lg:grid-cols-3">
          <SoftPanel title="Coerencia entre documentos">
            <LabelledList title="Nomes divergentes" items={report.coerencia_entre_documentos.nomes_divergentes} />
            <LabelledList title="Datas divergentes" items={report.coerencia_entre_documentos.datas_divergentes} />
            <LabelledList title="Valores divergentes" items={report.coerencia_entre_documentos.valores_divergentes} />
            <LabelledList
              title="Codigos localizadores divergentes"
              items={report.coerencia_entre_documentos.codigos_localizadores_divergentes}
            />
            <LabelledList
              title="Emails, telefones ou identificadores divergentes"
              items={report.coerencia_entre_documentos.emails_telefones_ou_identificadores_divergentes}
            />
            <TextLine label="Observacoes" value={report.coerencia_entre_documentos.observacoes} />
          </SoftPanel>

          <SoftPanel title="Representacao processual">
            <div className="space-y-2">
              <Badge variant={regularidadeVariant(report.representacao_processual.regularidade_aparente)}>
                {regularidadeLabel(report.representacao_processual.regularidade_aparente)}
              </Badge>
            </div>
            <LabelledList title="Pontos de atencao" items={report.representacao_processual.pontos_de_atencao} />
            <LabelledList
              title="Autores sem procuracao ou documento"
              items={report.representacao_processual.autores_sem_procuracao_ou_documento}
            />
          </SoftPanel>

          <SoftPanel title="Integridade tecnica dos arquivos">
            <LabelledList
              title="Sinais possiveis de manipulacao"
              items={report.integridade_tecnica_arquivos.sinais_possiveis_de_manipulacao}
            />
            <LabelledList
              title="Limitacoes da analise"
              items={report.integridade_tecnica_arquivos.limitacoes_da_analise}
            />
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Necessita validacao humana: {report.integridade_tecnica_arquivos.necessita_validacao_humana ? "Sim" : "Nao"}
            </div>
          </SoftPanel>
        </div>
      </AccordionCard>

      <AccordionCard title="Espacialidade e litigancia padronizada" summary="Elementos auxiliares de consistencia territorial e recorrencia interna do caso.">
        <div className="grid gap-3 lg:grid-cols-2">
          <SoftPanel title="Espacialidade">
            <LabelledList title="Cidades e enderecos identificados" items={report.espacialidade.cidades_enderecos_identificados} />
            <LabelledList title="Inconsistencias territoriais" items={report.espacialidade.inconsistencias_territoriais} />
            <TextLine label="Observacoes" value={report.espacialidade.observacoes} />
          </SoftPanel>
          <SoftPanel title="Indicios de litigancia padronizada">
            <LabelledList title="Indicios" items={report.indicios_litigancia_padronizada.indicios} />
            <LabelledList title="Elementos recorrentes" items={report.indicios_litigancia_padronizada.elementos_recorrentes} />
            <TextLine label="Observacoes" value={report.indicios_litigancia_padronizada.observacoes} />
          </SoftPanel>
        </div>
      </AccordionCard>

      <AccordionCard title="Documentos internos recomendados" summary="Materiais internos que podem robustecer a defesa.">
        <StringList items={report.documentos_internos_recomendados_para_defesa} />
      </AccordionCard>

      <AccordionCard title="Alertas e limitacoes" summary="Campos de nao conclusao e cautelas tecnicas da leitura.">
        <div className="grid gap-3 lg:grid-cols-2">
          <SoftPanel title="Alertas de nao conclusao">
            <StringList items={report.alertas_de_nao_conclusao} />
          </SoftPanel>
          <SoftPanel title="Markdown persistido">
            {markdown ? (
              <pre className="whitespace-pre-wrap text-xs leading-6 text-slate-600">{markdown}</pre>
            ) : (
              <NeutralState message="Nao ha markdown persistido para esta versao." />
            )}
          </SoftPanel>
        </div>
      </AccordionCard>
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

function ReportSection({ title, content, emphasis = false }: { title: string; content: ReactNode; emphasis?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        emphasis
          ? "border-slate-300 bg-[linear-gradient(135deg,rgba(241,245,249,1),rgba(255,255,255,1))] shadow-sm"
          : "border-slate-200 bg-white"
      )}
    >
      <p className="mb-3 text-base font-semibold text-slate-900">{title}</p>
      {content}
    </div>
  );
}

function AccordionCard({
  title,
  summary,
  children,
  defaultOpen = false
}: {
  title: string;
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">{summary}</p>
          </div>
          <Badge variant="outline" className="group-open:bg-slate-100">
            abrir
          </Badge>
        </div>
      </summary>
      <div className="mt-4 space-y-3">{children}</div>
    </details>
  );
}

function SoftPanel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-slate-50/70 p-4", className)}>
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function DocumentTypePanel({ title, children }: { title: string; children: ReactNode }) {
  return <SoftPanel title={title}>{children}</SoftPanel>;
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

function NeutralState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 px-3 py-3 text-sm text-slate-500">
      {message}
    </div>
  );
}

function TextLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function BooleanLine({ label, value }: { label: string; value: boolean }) {
  return <TextLine label={label} value={value ? "Sim" : "Nao"} />;
}

function IdentityLine({ label, value }: { label: string; value: string | null }) {
  return <TextLine label={label} value={value ?? "Nao foi possivel verificar com os documentos disponiveis."} />;
}

function ConclusionLine({
  label,
  value
}: {
  label: string;
  value: "sim" | "parcialmente" | "nao" | "inconclusivo";
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <ConclusionBadge value={value} />
    </div>
  );
}

function ConclusionBadgeRow({ label, badge }: { label: string; badge: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <span className="text-sm text-slate-700">{label}</span>
      {badge}
    </div>
  );
}

function ConclusionBadge({ value }: { value: "sim" | "parcialmente" | "nao" | "inconclusivo" }) {
  return <Badge variant={conclusionVariant(value)}>{conclusionLabel(value)}</Badge>;
}

function RelevanciaBadge({ value }: { value: "baixa" | "media" | "alta" | "critica" }) {
  return <Badge variant={relevanciaVariant(value)}>{relevanciaLabel(value)}</Badge>;
}

function ExplorabilidadeBadge({ value }: { value: "baixa" | "media" | "alta" }) {
  return <Badge variant={explorabilidadeVariant(value)}>{explorabilidadeLabel(value)}</Badge>;
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

function categoriaLabel(
  value:
    | "legitimidade"
    | "autenticidade"
    | "dano_material"
    | "dano_moral"
    | "nexo_causal"
    | "representacao"
    | "prova_insuficiente"
    | "cronologia"
    | "outro"
) {
  return value.replaceAll("_", " ");
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
