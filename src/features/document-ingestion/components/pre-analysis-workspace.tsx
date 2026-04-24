"use client";

import { FileText, Loader2, RefreshCw, ScanSearch, ShieldAlert, ShieldCheck } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
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
                        {documentTypeLabels[item.document.document_type]} • {item.document.mime_type ?? "mime desconhecido"}
                      </p>
                      {item.ingestion?.parser_type ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Parser: {formatParserType(item.ingestion.parser_type)}
                          {item.ingestion.extracted_text_length ? ` • ${item.ingestion.extracted_text_length} caracteres` : ""}
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
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedReportId === report.id ? "border-primary bg-primary/5" : "bg-white hover:bg-muted/35"}`}
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

        <Card>
          <CardHeader>
            <CardTitle>Visualizacao do laudo</CardTitle>
            <CardDescription>Leitura operacional da versao selecionada.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedReport && selectedReport.status === "completed" && selectedReportJson ? (
              <div className="space-y-4">
                <ReportBlock
                  title={selectedReportJson.cabecalho_relatorio.titulo_relatorio}
                  content={
                    <div className="space-y-3">
                      <p className="text-sm leading-6 text-muted-foreground">
                        {selectedReportJson.cabecalho_relatorio.subtitulo}
                      </p>
                      <div className="rounded-md border border-accent/25 bg-accent/10 px-3 py-2 text-sm">
                        {selectedReportJson.cabecalho_relatorio.aviso}
                      </div>
                    </div>
                  }
                />

                <div className="grid gap-3 md:grid-cols-4">
                  <Metric
                    label="Alerta geral"
                    value={riskLabel(selectedReportJson.quadro_resumo.nivel_geral_de_alerta)}
                  />
                  <Metric label="Achados doc." value={String(countDocumentFindings(selectedReportJson))} />
                  <Metric
                    label="Atencoes"
                    value={String(selectedReportJson.pontos_de_atencao_para_a_defesa.length)}
                  />
                  <Metric label="Docs processados" value={String(snapshot?.metrics.processedCount ?? 0)} />
                </div>

                <ReportBlock
                  title="Quadro resumo"
                  content={<p className="text-sm leading-6">{selectedReportJson.quadro_resumo.sintese_final}</p>}
                />

                <ReportBlock
                  title="Diagnostico inicial"
                  content={
                    <div className="space-y-4">
                      <p className="text-sm leading-6">{selectedReportJson.diagnostico_inicial.resumo_executivo}</p>
                      <DualListBlock
                        leftTitle="Pedidos identificados"
                        leftItems={selectedReportJson.diagnostico_inicial.pedidos_identificados.map((item) =>
                          item.observacao ? `${item.pedido} - ${item.observacao}` : item.pedido
                        )}
                        rightTitle="Fatos relevantes"
                        rightItems={selectedReportJson.diagnostico_inicial.fatos_relevantes}
                      />
                      <ReportListBlock
                        title="Lacunas iniciais"
                        items={selectedReportJson.diagnostico_inicial.lacunas_iniciais}
                      />
                    </div>
                  }
                />

                <ReportBlock
                  title="Analise documental do autor"
                  content={
                    <div className="space-y-4">
                      {selectedReportJson.analise_documental_do_autor.map((section) => (
                        <div key={section.secao} className="rounded-lg border bg-muted/20 p-4">
                          <div className="mb-3">
                            <p className="font-semibold">{section.secao}</p>
                            {section.descricao ? (
                              <p className="text-sm text-muted-foreground">{section.descricao}</p>
                            ) : null}
                          </div>
                          <div className="space-y-3">
                            {section.itens.map((item) => (
                              <div key={`${section.secao}-${item.documento}-${item.achado}`} className="rounded-md border bg-white p-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <p className="font-medium">{item.documento}</p>
                                  <RiskBadge value={item.risco} />
                                </div>
                                <p className="mt-2 text-sm font-medium">{item.achado}</p>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.observacao}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  }
                />

                <ReportBlock
                  title="Pontos de atencao para a defesa"
                  content={
                    <div className="space-y-3">
                      {selectedReportJson.pontos_de_atencao_para_a_defesa.map((item) => (
                        <div key={item.titulo} className="rounded-lg border bg-white p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="font-semibold">{item.titulo}</p>
                            <PriorityBadge value={item.prioridade} />
                          </div>
                          <p className="mt-2 text-sm leading-6">{item.explicacao}</p>
                          {item.fundamento_documental ? (
                            <p className="mt-2 text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">Fundamento documental:</span>{" "}
                              {item.fundamento_documental}
                            </p>
                          ) : null}
                          {item.impacto_para_defesa ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">Impacto para a defesa:</span>{" "}
                              {item.impacto_para_defesa}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  }
                />

                <DualListBlock
                  leftTitle="Documentos recomendados"
                  leftItems={selectedReportJson.documentos_recomendados.map(
                    (item) =>
                      `[${priorityLabel(item.prioridade)}] ${item.documento} - ${item.justificativa}`
                  )}
                  rightTitle="Riscos preliminares"
                  rightItems={selectedReportJson.riscos_preliminares.map(
                    (item) =>
                      `[${riskLabel(item.severidade)}] ${item.titulo} - ${item.observacao}`
                  )}
                />

                <ReportListBlock title="Observacoes gerais" items={selectedReportJson.observacoes_gerais} />
                {selectedReport.report_markdown ? (
                  <div className="rounded-lg border bg-muted/25 p-4">
                    <p className="mb-2 text-sm font-semibold">Markdown persistido</p>
                    <pre className="whitespace-pre-wrap text-xs leading-6 text-muted-foreground">{selectedReport.report_markdown}</pre>
                  </div>
                ) : null}
              </div>
            ) : selectedReport && selectedReport.status === "completed" ? (
              <EmptyState
                icon={ShieldAlert}
                title="Estrutura do laudo indisponivel"
                description="A versao selecionada nao esta no formato estruturado mais recente. Gere uma nova versao para ver o relatorio completo."
              />
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function riskLabel(value: "low" | "medium" | "high") {
  if (value === "high") return "ALTO";
  if (value === "medium") return "MEDIO";
  return "BAIXO";
}

function priorityLabel(value: "urgent" | "important" | "relevant" | "consider") {
  if (value === "urgent") return "URGENTE";
  if (value === "important") return "IMPORTANTE";
  if (value === "relevant") return "RELEVANTE";
  return "CONSIDERAR";
}

function countDocumentFindings(report: PreAnalysisReportOutput) {
  return report.analise_documental_do_autor.reduce((total, section) => total + section.itens.length, 0);
}

function formatParserType(value: string) {
  if (value === "pdf_text_based") return "PDF pesquisavel";
  if (value === "pdf_hybrid") return "PDF hibrido";
  if (value === "pdf_ocr") return "PDF visual com OCR";
  if (value === "image_ocr") return "Imagem com OCR";
  if (value === "txt_plain") return "TXT";
  return value;
}

function RiskBadge({ value }: { value: "low" | "medium" | "high" }) {
  const variant = value === "high" ? "destructive" : value === "medium" ? "outline" : "success";
  return <Badge variant={variant}>{riskLabel(value)}</Badge>;
}

function PriorityBadge({ value }: { value: "urgent" | "important" | "relevant" | "consider" }) {
  const variant =
    value === "urgent" ? "destructive" : value === "important" ? "outline" : value === "relevant" ? "secondary" : "secondary";
  return <Badge variant={variant}>{priorityLabel(value)}</Badge>;
}

function ReportBlock({ title, content }: { title: string; content: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="mb-2 font-semibold">{title}</p>
      {content}
    </div>
  );
}

function ReportListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <ReportBlock
      title={title}
      content={
        <ul className="space-y-2 text-sm leading-6">
          {items.map((item) => (
            <li key={item} className="rounded-md bg-muted/35 px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      }
    />
  );
}

function DualListBlock({
  leftTitle,
  leftItems,
  rightTitle,
  rightItems
}: {
  leftTitle: string;
  leftItems: string[];
  rightTitle: string;
  rightItems: string[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ReportListBlock title={leftTitle} items={leftItems} />
      <ReportListBlock title={rightTitle} items={rightItems} />
    </div>
  );
}
