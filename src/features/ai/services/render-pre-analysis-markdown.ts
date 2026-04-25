import type { PreAnalysisReportOutput } from "@/features/ai/types/pre-analysis-report";

function pushSection(lines: string[], title: string, value: string | null | undefined) {
  const text = value?.trim();
  if (!text) {
    return;
  }

  lines.push(title);
  lines.push(text);
  lines.push("");
}

function pushListSection(lines: string[], title: string, items: string[]) {
  if (!items.length) {
    return;
  }

  lines.push(title);
  for (const item of items) {
    lines.push(`- ${item}`);
  }
  lines.push("");
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

  pushSection(lines, "## Resumo executivo", report.resumo_executivo);

  lines.push("## Matriz final de confronto");
  pushListSection(lines, "### O que o autor narra", report.matriz_final_confronto.o_que_autor_narra);
  pushListSection(lines, "### O que os documentos provam", report.matriz_final_confronto.o_que_documentos_provam);
  pushListSection(lines, "### O que os documentos nao provam", report.matriz_final_confronto.o_que_documentos_nao_provam);
  pushListSection(
    lines,
    "### O que pode ser explorado pela defesa",
    report.matriz_final_confronto.o_que_pode_ser_explorado_pela_defesa
  );

  lines.push("## Narrativa x documentos");
  lines.push(
    `- Documentos embasam a narrativa: ${yesPartialNoLabel(report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.conclusao)}`
  );
  lines.push(`- Justificativa: ${report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.justificativa}`);
  pushListSection(lines, "- Pontos fortes", report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.pontos_fortes);
  pushListSection(lines, "- Lacunas", report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.lacunas);
  lines.push(
    `- Documentos embasam os pedidos: ${yesPartialNoLabel(report.analise_narrativa_vs_documentos.documentos_embasam_pedidos.conclusao)}`
  );
  lines.push(`- Justificativa: ${report.analise_narrativa_vs_documentos.documentos_embasam_pedidos.justificativa}`);
  pushListSection(lines, "- Pedidos sustentados", report.analise_narrativa_vs_documentos.documentos_embasam_pedidos.pedidos_sustentados);
  pushListSection(
    lines,
    "- Pedidos nao sustentados ou fracos",
    report.analise_narrativa_vs_documentos.documentos_embasam_pedidos.pedidos_nao_sustentados_ou_fracos
  );

  if (report.analise_individualizada_por_autor.length) {
    lines.push("## Individualizacao por autor");
    for (const item of report.analise_individualizada_por_autor) {
      lines.push(`### ${item.nome_autor}`);
      pushListSection(lines, "- Documentos vinculados", item.documentos_vinculados);
      pushListSection(lines, "- Pedidos vincululados", item.pedidos_vinculados);
      pushListSection(lines, "- Danos individualizados", item.danos_individualizados);
      pushListSection(lines, "- Lacunas de individualizacao", item.lacunas_individualizacao);
      if (item.observacoes.trim()) {
        lines.push(`- Observacoes: ${item.observacoes}`);
        lines.push("");
      }
    }
  }

  lines.push("## Cadeia negocial");
  if (report.cadeia_negocial.quem_comprou) lines.push(`- Quem comprou: ${report.cadeia_negocial.quem_comprou}`);
  if (report.cadeia_negocial.quem_pagou) lines.push(`- Quem pagou: ${report.cadeia_negocial.quem_pagou}`);
  if (report.cadeia_negocial.quem_viajou_ou_seria_beneficiario) {
    lines.push(`- Quem viajou ou seria beneficiario: ${report.cadeia_negocial.quem_viajou_ou_seria_beneficiario}`);
  }
  if (report.cadeia_negocial.quem_reclamou_ou_solicitou_suporte) {
    lines.push(`- Quem reclamou ou solicitou suporte: ${report.cadeia_negocial.quem_reclamou_ou_solicitou_suporte}`);
  }
  if (report.cadeia_negocial.quem_recebeu_ou_deveria_receber_estorno) {
    lines.push(`- Quem recebeu ou deveria receber estorno: ${report.cadeia_negocial.quem_recebeu_ou_deveria_receber_estorno}`);
  }
  pushListSection(lines, "- Divergencias entre pessoas", report.cadeia_negocial.divergencias_entre_pessoas);

  lines.push("## Cronologia");
  for (const item of report.cronologia.eventos_identificados) {
    const observation = item.observacao?.trim() ? ` | ${item.observacao}` : "";
    lines.push(
      `- ${item.data ?? "Data nao identificada"} | ${item.evento} | Fonte: ${item.fonte_documental ?? "Nao informada"}${observation}`
    );
  }
  pushListSection(lines, "- Inconsistencias temporais", report.cronologia.inconsistencias_temporais);
  pushListSection(lines, "- Eventos sem prova temporal", report.cronologia.eventos_sem_prova_temporal);
  lines.push("");

  lines.push("## Coerencia entre documentos");
  pushListSection(lines, "- Nomes divergentes", report.coerencia_entre_documentos.nomes_divergentes);
  pushListSection(lines, "- Datas divergentes", report.coerencia_entre_documentos.datas_divergentes);
  pushListSection(lines, "- Valores divergentes", report.coerencia_entre_documentos.valores_divergentes);
  pushListSection(lines, "- Codigos localizadores divergentes", report.coerencia_entre_documentos.codigos_localizadores_divergentes);
  pushListSection(
    lines,
    "- Emails, telefones ou identificadores divergentes",
    report.coerencia_entre_documentos.emails_telefones_ou_identificadores_divergentes
  );
  if (report.coerencia_entre_documentos.observacoes.trim()) {
    lines.push(`- Observacoes: ${report.coerencia_entre_documentos.observacoes}`);
    lines.push("");
  }

  lines.push("## Analise por tipo documental");
  lines.push("### Procuracao");
  lines.push(`- Existe: ${report.analise_por_tipo_documental.procuracao.existe ? "Sim" : "Nao"}`);
  lines.push(`- Regularidade formal: ${report.analise_por_tipo_documental.procuracao.regularidade_formal}`);
  lines.push(`- Assinatura e compatibilidade: ${report.analise_por_tipo_documental.procuracao.assinatura_compatibilidade}`);
  pushListSection(lines, "- Pontos de atencao", report.analise_por_tipo_documental.procuracao.pontos_de_atencao);
  lines.push("### Documento de identidade");
  lines.push(`- Existe: ${report.analise_por_tipo_documental.documento_identidade.existe ? "Sim" : "Nao"}`);
  lines.push(`- Compatibilidade com a parte: ${report.analise_por_tipo_documental.documento_identidade.compatibilidade_com_parte}`);
  pushListSection(
    lines,
    "- Sinais de edicao ou layout incompativel",
    report.analise_por_tipo_documental.documento_identidade.sinais_de_edicao_ou_layout_incompativel
  );
  pushListSection(lines, "- Pontos de atencao", report.analise_por_tipo_documental.documento_identidade.pontos_de_atencao);
  lines.push("### Comprovante de endereco");
  lines.push(`- Existe: ${report.analise_por_tipo_documental.comprovante_endereco.existe ? "Sim" : "Nao"}`);
  lines.push(`- Aderencia ao nome da parte: ${report.analise_por_tipo_documental.comprovante_endereco.aderencia_ao_nome_da_parte}`);
  lines.push(`- Aderencia ao endereco da inicial: ${report.analise_por_tipo_documental.comprovante_endereco.aderencia_ao_endereco_da_inicial}`);
  pushListSection(
    lines,
    "- Sinais de edicao ou layout incompativel",
    report.analise_por_tipo_documental.comprovante_endereco.sinais_de_edicao_ou_layout_incompativel
  );
  pushListSection(lines, "- Pontos de atencao", report.analise_por_tipo_documental.comprovante_endereco.pontos_de_atencao);
  lines.push("### Comprovantes de pagamento");
  lines.push(`- Existem: ${report.analise_por_tipo_documental.comprovantes_pagamento.existem ? "Sim" : "Nao"}`);
  lines.push(`- Aderencia ao nome da parte: ${report.analise_por_tipo_documental.comprovantes_pagamento.aderencia_ao_nome_da_parte}`);
  pushListSection(lines, "- Datas e valores identificados", report.analise_por_tipo_documental.comprovantes_pagamento.datas_valores_identificados);
  pushListSection(
    lines,
    "- Sinais de edicao ou layout incompativel",
    report.analise_por_tipo_documental.comprovantes_pagamento.sinais_de_edicao_ou_layout_incompativel
  );
  pushListSection(lines, "- Pontos de atencao", report.analise_por_tipo_documental.comprovantes_pagamento.pontos_de_atencao);
  lines.push("### Prints de tela");
  lines.push(`- Existem: ${report.analise_por_tipo_documental.prints_tela.existem ? "Sim" : "Nao"}`);
  lines.push(`- Compatibilidade com a plataforma alegada: ${report.analise_por_tipo_documental.prints_tela.compatibilidade_com_plataforma_alegada}`);
  lines.push(`- Qualidade probatoria: ${report.analise_por_tipo_documental.prints_tela["qualidade_probat\u00f3ria"]}`);
  pushListSection(lines, "- Sinais de edicao ou recorte", report.analise_por_tipo_documental.prints_tela.sinais_de_edicao_ou_recorte);
  pushListSection(lines, "- Pontos de atencao", report.analise_por_tipo_documental.prints_tela.pontos_de_atencao);

  if (report.analise_por_tipo_documental.outros_documentos.length) {
    lines.push("### Outros documentos");
    for (const item of report.analise_por_tipo_documental.outros_documentos) {
      lines.push(`- ${item.tipo_ou_descricao} [${item.peso_probatorio}] - ${item.observacoes}`);
    }
    lines.push("");
  }

  if (report.mapa_documental_autor.length) {
    lines.push("## Mapa documental do autor");
    for (const item of report.mapa_documental_autor) {
      lines.push(`### ${item.documento_referencia}`);
      lines.push(`- Tipo documental: ${item.tipo_documento}`);
      if (item.titular_ou_emitente) lines.push(`- Titular ou emitente: ${item.titular_ou_emitente}`);
      lines.push(`- Vinculo subjetivo: ${item.vinculo_subjetivo}`);
      lines.push(`- Peso probatorio: ${item.peso_probatorio}`);
      lines.push(`- Impacto para defesa: ${item.impacto_para_defesa}`);
      pushListSection(lines, "- Achados principais", item.achados_principais);
      pushListSection(lines, "- Pontos de atencao", item.pontos_de_atencao);
      if (item.referencia_trecho_ou_contexto) {
        lines.push(`- Referencia de trecho ou contexto: ${item.referencia_trecho_ou_contexto}`);
        lines.push("");
      }
    }
  }

  if (report.priorizacao_estrategica.length) {
    lines.push("## Priorizacao estrategica");
    for (const item of report.priorizacao_estrategica) {
      lines.push(`- [${item.prioridade.toUpperCase()}] ${item.titulo}`);
      lines.push(`  Motivo: ${item.motivo}`);
      lines.push(`  Acao sugerida: ${item.acao_sugerida}`);
      if (item.referencia_documental.length) {
        lines.push(`  Referencia documental: ${item.referencia_documental.join(", ")}`);
      }
    }
    lines.push("");
  }

  if (report.fatos_supervenientes_ou_da_emenda.length) {
    lines.push("## Fatos supervenientes ou da emenda");
    for (const item of report.fatos_supervenientes_ou_da_emenda) {
      lines.push(`- ${item.descricao}`);
      lines.push(`  Impacto para defesa: ${item.impacto_para_defesa}`);
      lines.push(`  Exige enfrentamento especifico: ${item.exige_enfrentamento_especifico ? "Sim" : "Nao"}`);
      if (item.referencia_documental.length) {
        lines.push(`  Referencia documental: ${item.referencia_documental.join(", ")}`);
      }
    }
    lines.push("");
  }

  lines.push("## Suficiencia probatoria");
  lines.push(`- Conclusao: ${suficienciaLabel(report.suficiencia_probatoria.conclusao)}`);
  pushListSection(lines, "- Provas fortes", report.suficiencia_probatoria.provas_fortes);
  pushListSection(lines, "- Provas fracas ou unilaterais", report.suficiencia_probatoria.provas_fracas_ou_unilaterais);
  pushListSection(lines, "- Documentos-chave ausentes", report.suficiencia_probatoria.documentos_chave_ausentes);
  lines.push(`- Observacoes: ${report.suficiencia_probatoria.observacoes}`);
  lines.push("");

  lines.push("## Pedido indenizatorio");
  lines.push(`- Dano material tem prova minima: ${yesPartialNoLabel(report.pedido_indenizatorio.dano_material_tem_prova_minima)}`);
  lines.push(`- Valor pedido tem suporte documental: ${yesPartialNoLabel(report.pedido_indenizatorio.valor_pedido_tem_suporte_documental)}`);
  lines.push(`- Dano moral tem base fatica individualizada: ${yesPartialNoLabel(report.pedido_indenizatorio.dano_moral_tem_base_fatica_individualizada)}`);
  pushListSection(lines, "- Despesas extraordinarias comprovadas", report.pedido_indenizatorio.despesas_extraordinarias_comprovadas);
  pushListSection(lines, "- Lacunas", report.pedido_indenizatorio.lacunas);

  if (report.pontos_exploraveis_defesa.length) {
    lines.push("## Pontos exploraveis para defesa");
    for (const item of report.pontos_exploraveis_defesa) {
      lines.push(
        `- ${item.ponto} | categoria: ${item.categoria} | relevancia: ${item.relevancia} | explorabilidade: ${item.explorabilidade} | validacao humana: ${item.necessita_validacao_humana ? "sim" : "nao"}`
      );
      lines.push(`  Justificativa: ${item.justificativa}`);
    }
    lines.push("");
  }

  pushListSection(lines, "## Documentos internos recomendados", report.documentos_internos_recomendados_para_defesa);

  const alertasConsolidados = [...new Set([...report.alertas_de_nao_conclusao, ...report.integridade_tecnica_arquivos.limitacoes_da_analise])];
  if (alertasConsolidados.length || report.integridade_tecnica_arquivos.necessita_validacao_humana) {
    lines.push("## Alertas e limitacoes");
    for (const item of alertasConsolidados) {
      lines.push(`- ${item}`);
    }
    lines.push(`- Necessita validacao humana: ${report.integridade_tecnica_arquivos.necessita_validacao_humana ? "Sim" : "Nao"}`);
  }

  return lines.join("\n").trim();
}
