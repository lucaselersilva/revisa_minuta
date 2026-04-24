import type { PreAnalysisReportOutput } from "@/features/ai/types/pre-analysis-report";

function pushList(lines: string[], items: string[], emptyMessage = "Nao ha elementos suficientes registrados.") {
  if (!items.length) {
    lines.push(`- ${emptyMessage}`);
    return;
  }

  for (const item of items) {
    lines.push(`- ${item}`);
  }
}

function yesPartialNoLabel(value: "sim" | "parcialmente" | "nao" | "inconclusivo") {
  if (value === "sim") return "SIM";
  if (value === "parcialmente") return "PARCIALMENTE";
  if (value === "nao") return "NAO";
  return "INCONCLUSIVO";
}

function suficienciaLabel(value: "suficiente" | "parcial" | "insuficiente" | "inconclusiva") {
  if (value === "suficiente") return "SUFICIENTE";
  if (value === "parcial") return "PARCIAL";
  if (value === "insuficiente") return "INSUFICIENTE";
  return "INCONCLUSIVA";
}

export function renderPreAnalysisMarkdown(report: PreAnalysisReportOutput) {
  const lines: string[] = [];

  lines.push("# Laudo previo operacional");
  lines.push("");
  lines.push("## Resumo executivo");
  lines.push(report.resumo_executivo);
  lines.push("");
  lines.push("## Matriz final de confronto");
  lines.push("### O que o autor narra");
  pushList(lines, report.matriz_final_confronto.o_que_autor_narra);
  lines.push("");
  lines.push("### O que os documentos provam");
  pushList(lines, report.matriz_final_confronto.o_que_documentos_provam);
  lines.push("");
  lines.push("### O que os documentos nao provam");
  pushList(lines, report.matriz_final_confronto.o_que_documentos_nao_provam);
  lines.push("");
  lines.push("### O que pode ser explorado pela defesa");
  pushList(lines, report.matriz_final_confronto.o_que_pode_ser_explorado_pela_defesa);
  lines.push("");
  lines.push("## Narrativa x documentos");
  lines.push(
    `- Documentos embasam a narrativa: ${yesPartialNoLabel(report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.conclusao)}`
  );
  lines.push(`- Justificativa: ${report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.justificativa}`);
  lines.push("- Pontos fortes:");
  pushList(lines, report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.pontos_fortes);
  lines.push("- Lacunas:");
  pushList(lines, report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.lacunas);
  lines.push("");
  lines.push(
    `- Documentos embasam os pedidos: ${yesPartialNoLabel(report.analise_narrativa_vs_documentos.documentos_embasam_pedidos.conclusao)}`
  );
  lines.push(`- Justificativa: ${report.analise_narrativa_vs_documentos.documentos_embasam_pedidos.justificativa}`);
  lines.push("- Pedidos sustentados:");
  pushList(lines, report.analise_narrativa_vs_documentos.documentos_embasam_pedidos.pedidos_sustentados);
  lines.push("- Pedidos nao sustentados ou fracos:");
  pushList(lines, report.analise_narrativa_vs_documentos.documentos_embasam_pedidos.pedidos_nao_sustentados_ou_fracos);
  lines.push("");
  lines.push("## Individualizacao por autor");
  if (!report.analise_individualizada_por_autor.length) {
    lines.push("- Nao ha individualizacao suficiente registrada.");
  } else {
    for (const item of report.analise_individualizada_por_autor) {
      lines.push(`### ${item.nome_autor}`);
      lines.push("- Documentos vinculados:");
      pushList(lines, item.documentos_vinculados);
      lines.push("- Pedidos vinculados:");
      pushList(lines, item.pedidos_vinculados);
      lines.push("- Danos individualizados:");
      pushList(lines, item.danos_individualizados);
      lines.push("- Lacunas de individualizacao:");
      pushList(lines, item.lacunas_individualizacao);
      lines.push(`- Observacoes: ${item.observacoes}`);
      lines.push("");
    }
  }
  lines.push("## Cadeia negocial");
  lines.push(`- Quem comprou: ${report.cadeia_negocial.quem_comprou ?? "Nao identificado"}`);
  lines.push(`- Quem pagou: ${report.cadeia_negocial.quem_pagou ?? "Nao identificado"}`);
  lines.push(
    `- Quem viajou ou seria beneficiario: ${report.cadeia_negocial.quem_viajou_ou_seria_beneficiario ?? "Nao identificado"}`
  );
  lines.push(
    `- Quem reclamou ou solicitou suporte: ${report.cadeia_negocial.quem_reclamou_ou_solicitou_suporte ?? "Nao identificado"}`
  );
  lines.push(
    `- Quem recebeu ou deveria receber estorno: ${report.cadeia_negocial.quem_recebeu_ou_deveria_receber_estorno ?? "Nao identificado"}`
  );
  lines.push("- Divergencias entre pessoas:");
  pushList(lines, report.cadeia_negocial.divergencias_entre_pessoas);
  lines.push("");
  lines.push("## Cronologia");
  if (!report.cronologia.eventos_identificados.length) {
    lines.push("- Nenhum evento temporal estruturado foi registrado.");
  } else {
    for (const item of report.cronologia.eventos_identificados) {
      lines.push(
        `- ${item.data ?? "Data nao identificada"} | ${item.evento} | Fonte: ${item.fonte_documental ?? "Nao informada"} | ${item.observacao}`
      );
    }
  }
  lines.push("- Inconsistencias temporais:");
  pushList(lines, report.cronologia.inconsistencias_temporais);
  lines.push("- Eventos sem prova temporal:");
  pushList(lines, report.cronologia.eventos_sem_prova_temporal);
  lines.push("");
  lines.push("## Coerencia entre documentos");
  lines.push("- Nomes divergentes:");
  pushList(lines, report.coerencia_entre_documentos.nomes_divergentes);
  lines.push("- Datas divergentes:");
  pushList(lines, report.coerencia_entre_documentos.datas_divergentes);
  lines.push("- Valores divergentes:");
  pushList(lines, report.coerencia_entre_documentos.valores_divergentes);
  lines.push("- Codigos localizadores divergentes:");
  pushList(lines, report.coerencia_entre_documentos.codigos_localizadores_divergentes);
  lines.push("- Emails, telefones ou identificadores divergentes:");
  pushList(lines, report.coerencia_entre_documentos.emails_telefones_ou_identificadores_divergentes);
  lines.push(`- Observacoes: ${report.coerencia_entre_documentos.observacoes}`);
  lines.push("");
  lines.push("## Analise por tipo documental");
  lines.push("### Procuracao");
  lines.push(`- Existe: ${report.analise_por_tipo_documental.procuracao.existe ? "Sim" : "Nao"}`);
  lines.push(`- Regularidade formal: ${report.analise_por_tipo_documental.procuracao.regularidade_formal}`);
  lines.push(
    `- Assinatura e compatibilidade: ${report.analise_por_tipo_documental.procuracao.assinatura_compatibilidade}`
  );
  pushList(lines, report.analise_por_tipo_documental.procuracao.pontos_de_atencao, "Sem pontos adicionais registrados.");
  lines.push("");
  lines.push("### Documento de identidade");
  lines.push(`- Existe: ${report.analise_por_tipo_documental.documento_identidade.existe ? "Sim" : "Nao"}`);
  lines.push(`- Compatibilidade com a parte: ${report.analise_por_tipo_documental.documento_identidade.compatibilidade_com_parte}`);
  lines.push("- Sinais de edicao ou layout incompativel:");
  pushList(lines, report.analise_por_tipo_documental.documento_identidade.sinais_de_edicao_ou_layout_incompativel);
  lines.push("- Pontos de atencao:");
  pushList(lines, report.analise_por_tipo_documental.documento_identidade.pontos_de_atencao);
  lines.push("");
  lines.push("### Comprovante de endereco");
  lines.push(`- Existe: ${report.analise_por_tipo_documental.comprovante_endereco.existe ? "Sim" : "Nao"}`);
  lines.push(`- Aderencia ao nome da parte: ${report.analise_por_tipo_documental.comprovante_endereco.aderencia_ao_nome_da_parte}`);
  lines.push(`- Aderencia ao endereco da inicial: ${report.analise_por_tipo_documental.comprovante_endereco.aderencia_ao_endereco_da_inicial}`);
  lines.push("- Sinais de edicao ou layout incompativel:");
  pushList(lines, report.analise_por_tipo_documental.comprovante_endereco.sinais_de_edicao_ou_layout_incompativel);
  lines.push("- Pontos de atencao:");
  pushList(lines, report.analise_por_tipo_documental.comprovante_endereco.pontos_de_atencao);
  lines.push("");
  lines.push("### Comprovantes de pagamento");
  lines.push(`- Existem: ${report.analise_por_tipo_documental.comprovantes_pagamento.existem ? "Sim" : "Nao"}`);
  lines.push(`- Aderencia ao nome da parte: ${report.analise_por_tipo_documental.comprovantes_pagamento.aderencia_ao_nome_da_parte}`);
  lines.push("- Datas e valores identificados:");
  pushList(lines, report.analise_por_tipo_documental.comprovantes_pagamento.datas_valores_identificados);
  lines.push("- Sinais de edicao ou layout incompativel:");
  pushList(lines, report.analise_por_tipo_documental.comprovantes_pagamento.sinais_de_edicao_ou_layout_incompativel);
  lines.push("- Pontos de atencao:");
  pushList(lines, report.analise_por_tipo_documental.comprovantes_pagamento.pontos_de_atencao);
  lines.push("");
  lines.push("### Prints de tela");
  lines.push(`- Existem: ${report.analise_por_tipo_documental.prints_tela.existem ? "Sim" : "Nao"}`);
  lines.push(`- Compatibilidade com a plataforma alegada: ${report.analise_por_tipo_documental.prints_tela.compatibilidade_com_plataforma_alegada}`);
  lines.push(`- Qualidade probatoria: ${report.analise_por_tipo_documental.prints_tela["qualidade_probatória"]}`);
  lines.push("- Sinais de edicao ou recorte:");
  pushList(lines, report.analise_por_tipo_documental.prints_tela.sinais_de_edicao_ou_recorte);
  lines.push("- Pontos de atencao:");
  pushList(lines, report.analise_por_tipo_documental.prints_tela.pontos_de_atencao);
  lines.push("");
  lines.push("### Outros documentos");
  if (!report.analise_por_tipo_documental.outros_documentos.length) {
    lines.push("- Nenhum outro documento estruturado.");
  } else {
    for (const item of report.analise_por_tipo_documental.outros_documentos) {
      lines.push(`- ${item.tipo_ou_descricao} [${item.peso_probatorio}] - ${item.observacoes}`);
    }
  }
  lines.push("");
  lines.push("## Suficiencia probatoria");
  lines.push(`- Conclusao: ${suficienciaLabel(report.suficiencia_probatoria.conclusao)}`);
  lines.push("- Provas fortes:");
  pushList(lines, report.suficiencia_probatoria.provas_fortes);
  lines.push("- Provas fracas ou unilaterais:");
  pushList(lines, report.suficiencia_probatoria.provas_fracas_ou_unilaterais);
  lines.push("- Documentos-chave ausentes:");
  pushList(lines, report.suficiencia_probatoria.documentos_chave_ausentes);
  lines.push(`- Observacoes: ${report.suficiencia_probatoria.observacoes}`);
  lines.push("");
  lines.push("## Pedido indenizatorio");
  lines.push(`- Dano material tem prova minima: ${yesPartialNoLabel(report.pedido_indenizatorio.dano_material_tem_prova_minima)}`);
  lines.push(
    `- Valor pedido tem suporte documental: ${yesPartialNoLabel(report.pedido_indenizatorio.valor_pedido_tem_suporte_documental)}`
  );
  lines.push(
    `- Dano moral tem base fatica individualizada: ${yesPartialNoLabel(report.pedido_indenizatorio.dano_moral_tem_base_fatica_individualizada)}`
  );
  lines.push("- Despesas extraordinarias comprovadas:");
  pushList(lines, report.pedido_indenizatorio.despesas_extraordinarias_comprovadas);
  lines.push("- Lacunas:");
  pushList(lines, report.pedido_indenizatorio.lacunas);
  lines.push("");
  lines.push("## Pontos exploraveis para defesa");
  if (!report.pontos_exploraveis_defesa.length) {
    lines.push("- Nao ha pontos estruturados adicionais.");
  } else {
    for (const item of report.pontos_exploraveis_defesa) {
      lines.push(
        `- ${item.ponto} | categoria: ${item.categoria} | relevancia: ${item.relevancia} | explorabilidade: ${item.explorabilidade} | validacao humana: ${item.necessita_validacao_humana ? "sim" : "nao"}`
      );
      lines.push(`  Justificativa: ${item.justificativa}`);
    }
  }
  lines.push("");
  lines.push("## Documentos internos recomendados");
  pushList(lines, report.documentos_internos_recomendados_para_defesa);
  lines.push("");
  lines.push("## Alertas e limitacoes");
  pushList(lines, report.alertas_de_nao_conclusao);
  lines.push("- Limitacoes da analise tecnica:");
  pushList(lines, report.integridade_tecnica_arquivos.limitacoes_da_analise);
  lines.push(
    `- Necessita validacao humana: ${report.integridade_tecnica_arquivos.necessita_validacao_humana ? "Sim" : "Nao"}`
  );

  return lines.join("\n");
}
