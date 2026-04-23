import type { PreAnalysisReportOutput } from "@/features/ai/types/pre-analysis-report";

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

export function renderPreAnalysisMarkdown(report: PreAnalysisReportOutput) {
  const lines: string[] = [];

  lines.push(`# ${report.cabecalho_relatorio.titulo_relatorio}`);
  lines.push("");
  lines.push(report.cabecalho_relatorio.subtitulo);
  lines.push("");
  lines.push(`Aviso: ${report.cabecalho_relatorio.aviso}`);
  lines.push("");
  lines.push("## 1. Quadro resumo");
  lines.push(`- Nivel geral de alerta: ${riskLabel(report.quadro_resumo.nivel_geral_de_alerta)}`);
  lines.push(`- Sintese final: ${report.quadro_resumo.sintese_final}`);
  lines.push("");
  lines.push("## 2. Diagnostico inicial");
  lines.push(report.diagnostico_inicial.resumo_executivo);
  lines.push("");
  lines.push("### 2.1 Pedidos identificados");
  for (const item of report.diagnostico_inicial.pedidos_identificados) {
    lines.push(`- ${item.pedido}${item.observacao ? ` - ${item.observacao}` : ""}`);
  }
  lines.push("");
  lines.push("### 2.2 Fatos relevantes");
  for (const item of report.diagnostico_inicial.fatos_relevantes) {
    lines.push(`- ${item}`);
  }
  lines.push("");
  lines.push("### 2.3 Lacunas iniciais");
  for (const item of report.diagnostico_inicial.lacunas_iniciais) {
    lines.push(`- ${item}`);
  }
  lines.push("");
  lines.push("## 3. Analise documental do autor");
  for (const section of report.analise_documental_do_autor) {
    lines.push(`### ${section.secao}`);
    if (section.descricao) {
      lines.push(section.descricao);
    }
    lines.push("");
    for (const item of section.itens) {
      lines.push(`- Documento: ${item.documento}`);
      lines.push(`  - Achado: ${item.achado}`);
      lines.push(`  - Risco: ${riskLabel(item.risco)}`);
      lines.push(`  - Observacao: ${item.observacao}`);
    }
    lines.push("");
  }
  lines.push("## 4. Pontos de atencao para a defesa");
  for (const item of report.pontos_de_atencao_para_a_defesa) {
    lines.push(`- [${priorityLabel(item.prioridade)}] ${item.titulo}`);
    lines.push(`  - Explicacao: ${item.explicacao}`);
    if (item.fundamento_documental) {
      lines.push(`  - Fundamento documental: ${item.fundamento_documental}`);
    }
    if (item.impacto_para_defesa) {
      lines.push(`  - Impacto para a defesa: ${item.impacto_para_defesa}`);
    }
  }
  lines.push("");
  lines.push("## 5. Documentos recomendados");
  for (const item of report.documentos_recomendados) {
    lines.push(`- [${priorityLabel(item.prioridade)}] ${item.documento} - ${item.justificativa}`);
  }
  lines.push("");
  lines.push("## 6. Riscos preliminares");
  for (const item of report.riscos_preliminares) {
    lines.push(`- [${riskLabel(item.severidade)}] ${item.titulo} - ${item.observacao}`);
  }
  lines.push("");
  lines.push("## 7. Observacoes gerais");
  for (const item of report.observacoes_gerais) {
    lines.push(`- ${item}`);
  }

  return lines.join("\n");
}
