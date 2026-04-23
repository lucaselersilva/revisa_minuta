"use client";

import { FileText, Loader2, RefreshCw, ScanSearch, ShieldAlert, ShieldCheck } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { acknowledgePreAnalysisReportAction, generatePreAnalysisReportAction } from "@/features/ai/actions/pre-analysis-actions";
import type { PreAnalysisReportOutput } from "@/features/ai/types/pre-analysis-report";
import { processCaseInitialDocumentsAction } from "@/features/document-ingestion/actions/document-ingestion-actions";
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
  const selectedReportJson = selectedReport?.report_json as PreAnalysisReportOutput | null;
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{item.document.file_name ?? "Documento sem nome"}</p>
                      <p className="text-xs text-muted-foreground">
                        {documentTypeLabels[item.document.document_type]} • {item.document.mime_type ?? "mime desconhecido"}
                      </p>
                    </div>
                    <Badge variant={statusVariant(item.ingestion?.status ?? "pending")}>
                      {item.ingestion?.status ?? "pending"}
                    </Badge>
                  </div>
                  {item.ingestion?.error_message ? (
                    <p className="mt-3 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm">
                      {item.ingestion.error_message}
                    </p>
                  ) : null}
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
                <ReportBlock title="Resumo estruturado do caso" content={<p className="text-sm leading-6">{selectedReportJson.resumo_estruturado_do_caso}</p>} />
                <ReportListBlock title="Pedidos identificados" items={selectedReportJson.pedidos_identificados.map((item) => item.observacao ? `${item.item} - ${item.observacao}` : item.item)} />
                <ReportListBlock title="Principais inconsistencias documentais" items={selectedReportJson.principais_inconsistencias_documentais.map((item) => `${item.item} [${item.severidade}]${item.fundamento_documental ? ` - ${item.fundamento_documental}` : ""}`)} />
                <ReportListBlock title="Pontos de atencao para a defesa" items={selectedReportJson.pontos_de_atencao_para_a_defesa.map((item) => `${item.item} [${item.severidade}]`)} />
                <ReportListBlock title="Documentos recomendados" items={selectedReportJson.documentos_recomendados.map((item) => item.justificativa ? `${item.item} - ${item.justificativa}` : item.item)} />
                <ReportListBlock title="Riscos preliminares" items={selectedReportJson.riscos_preliminares.map((item) => `${item.item} [${item.severidade}]${item.observacao ? ` - ${item.observacao}` : ""}`)} />
                <ReportListBlock title="Observacoes gerais" items={selectedReportJson.observacoes_gerais} />
                {selectedReport.report_markdown ? (
                  <div className="rounded-lg border bg-muted/25 p-4">
                    <p className="mb-2 text-sm font-semibold">Markdown persistido</p>
                    <pre className="whitespace-pre-wrap text-xs leading-6 text-muted-foreground">{selectedReport.report_markdown}</pre>
                  </div>
                ) : null}
              </div>
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
