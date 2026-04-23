import type { PreAnalysisReportOutput } from "@/features/ai/types/pre-analysis-report";

export function renderPreAnalysisMarkdown(report: PreAnalysisReportOutput) {
  const list = (items: string[]) => items.map((item) => `- ${item}`).join("\n");

  return [
    "# Laudo previo",
    "",
    "## Resumo estruturado do caso",
    report.resumo_estruturado_do_caso,
    "",
    "## Pedidos identificados",
    list(report.pedidos_identificados.map((item) => item.observacao ? `${item.item} - ${item.observacao}` : item.item)),
    "",
    "## Principais inconsistencias documentais",
    list(
      report.principais_inconsistencias_documentais.map((item) =>
        `${item.item} [${item.severidade}]${item.fundamento_documental ? ` - ${item.fundamento_documental}` : ""}`
      )
    ),
    "",
    "## Pontos de atencao para a defesa",
    list(report.pontos_de_atencao_para_a_defesa.map((item) => `${item.item} [${item.severidade}]`)),
    "",
    "## Documentos recomendados",
    list(report.documentos_recomendados.map((item) => item.justificativa ? `${item.item} - ${item.justificativa}` : item.item)),
    "",
    "## Riscos preliminares",
    list(report.riscos_preliminares.map((item) => `${item.item} [${item.severidade}]${item.observacao ? ` - ${item.observacao}` : ""}`)),
    "",
    "## Observacoes gerais",
    list(report.observacoes_gerais)
  ].join("\n");
}
