import type { DefenseConformityReportOutput } from "@/features/ai/types/defense-conformity-report";

function pushList(lines: string[], items: string[]) {
  for (const item of items) {
    lines.push(`- ${item}`);
  }
}

function pushCriteriaSection(
  lines: string[],
  title: string,
  items: DefenseConformityReportOutput["conformidade_contestacao"]["dados_formais"]
) {
  lines.push(title);

  if (!items.length) {
    lines.push("- Nenhum item relevante identificado.");
    return;
  }

  for (const item of items) {
    lines.push(`- ${item.criterio}: ${item.status}`);
    lines.push(`  Observacao: ${item.observacao || "Sem observacao complementar."}`);
    lines.push(`  Justificativa: ${item.justificativa_status || "Sem justificativa complementar."}`);
    if (item.trechos_autor_relevantes.length) {
      lines.push("  Trechos do autor:");
      for (const trecho of item.trechos_autor_relevantes) {
        lines.push(`  - ${trecho}`);
      }
    }
    if (item.trechos_defesa_relevantes.length) {
      lines.push("  Trechos da defesa:");
      for (const trecho of item.trechos_defesa_relevantes) {
        lines.push(`  - ${trecho}`);
      }
    }
  }
}

function pushDocumentarySection(
  lines: string[],
  title: string,
  items: DefenseConformityReportOutput["analise_autenticidade_documental"]["documentos_identidade"]
) {
  lines.push(title);

  if (!items.length) {
    lines.push("- Nenhum achado relevante identificado.");
    return;
  }

  for (const item of items) {
    lines.push(`- ${item.documento_referencia} [${item.risco}]`);
    lines.push(`  Achado: ${item.achado || "Sem achado especificado."}`);
    lines.push(`  Observacao: ${item.observacao || "Sem observacao complementar."}`);
    lines.push(`  Uso pela defesa: ${item.potencial_uso_pela_defesa || "Sem direcionamento adicional."}`);
  }
}

export function renderDefenseConformityMarkdown(report: DefenseConformityReportOutput) {
  const lines: string[] = [];

  lines.push(report.header.titulo);
  lines.push(report.header.subtitulo);
  if (report.header.processo) lines.push(`Processo: ${report.header.processo}`);
  if (report.header.juizo) lines.push(`Juizo: ${report.header.juizo}`);
  if (report.header.cliente) lines.push(`Cliente: ${report.header.cliente}`);
  if (report.header.escritorio) lines.push(`Escritorio: ${report.header.escritorio}`);
  if (report.header.gerado_em) lines.push(`Gerado em: ${report.header.gerado_em}`);
  lines.push(`Aviso: ${report.header.aviso}`);
  lines.push("");

  lines.push("1. CONFORMIDADE DA CONTESTACAO");
  pushCriteriaSection(lines, "1.1 Dados formais", report.conformidade_contestacao.dados_formais);
  lines.push("");
  pushCriteriaSection(lines, "1.2 Preliminares", report.conformidade_contestacao.preliminares);
  lines.push("");
  pushCriteriaSection(lines, "1.3 Merito", report.conformidade_contestacao.merito);
  lines.push("");
  pushCriteriaSection(lines, "1.4 Formato do escritorio", report.conformidade_contestacao.formato_do_escritorio);
  lines.push("");
  lines.push("1.5 Pedidos da inicial nao integralmente rebatidos");
  if (report.pedidos_da_inicial_nao_integralmente_rebatidos.length) {
    for (const item of report.pedidos_da_inicial_nao_integralmente_rebatidos) {
      lines.push(`- ${item.pedido}: ${item.situacao}`);
    }
  } else {
    lines.push("- Nenhum pedido critico pendente de enfrentamento identificado.");
  }
  lines.push("");

  lines.push("2. ANALISE DE AUTENTICIDADE DOCUMENTAL");
  pushDocumentarySection(lines, "2.1 Documentos de identidade", report.analise_autenticidade_documental.documentos_identidade);
  lines.push("");
  pushDocumentarySection(lines, "2.2 Comprovantes de endereco", report.analise_autenticidade_documental.comprovantes_endereco);
  lines.push("");
  pushDocumentarySection(lines, "2.3 Prints do sistema", report.analise_autenticidade_documental.prints_sistema);
  lines.push("");
  pushDocumentarySection(lines, "2.4 Documentos financeiros", report.analise_autenticidade_documental.documentos_financeiros);
  lines.push("");
  pushDocumentarySection(lines, "2.5 Procuracoes", report.analise_autenticidade_documental.procuracoes);
  lines.push("");
  pushDocumentarySection(lines, "2.6 Outros documentos", report.analise_autenticidade_documental.outros);
  lines.push("");

  lines.push("3. PONTUACAO GERAL E RECOMENDACOES");
  lines.push(`Contestacao - Conformes: ${report.pontuacao_geral.contestacao.conformes}`);
  lines.push(`Contestacao - Incompletos: ${report.pontuacao_geral.contestacao.incompletos}`);
  lines.push(`Contestacao - Ausentes: ${report.pontuacao_geral.contestacao.ausentes}`);
  lines.push(`Documentacao do autor - Sem indicios: ${report.pontuacao_geral.documentacao_autor.sem_indicios}`);
  lines.push(`Documentacao do autor - Risco medio: ${report.pontuacao_geral.documentacao_autor.risco_medio}`);
  lines.push(`Documentacao do autor - Risco alto: ${report.pontuacao_geral.documentacao_autor.risco_alto}`);
  lines.push(`Documentacao do autor - Atencao: ${report.pontuacao_geral.documentacao_autor.atencao}`);
  lines.push(`Pontuacao geral: ${report.pontuacao_geral.pontuacao_geral}/100`);
  lines.push(`Risco geral: ${report.pontuacao_geral.risco_geral}`);
  lines.push("");
  lines.push("3.1 Recomendacoes prioritarias");
  if (report.recomendacoes_prioritarias.length) {
    for (const item of report.recomendacoes_prioritarias) {
      lines.push(`[${item.prioridade}] ${item.titulo}`);
      lines.push(item.descricao);
      if (item.fundamento) {
        lines.push(`Fundamento: ${item.fundamento}`);
      }
      if (item.acao_sugerida) {
        lines.push(`Acao sugerida: ${item.acao_sugerida}`);
      }
      lines.push("");
    }
  } else {
    lines.push("Nenhuma recomendacao adicional registrada.");
    lines.push("");
  }

  if (report.disclaimers.length) {
    lines.push("4. DISCLAIMERS");
    pushList(lines, report.disclaimers);
  }

  return lines.join("\n").trim();
}
