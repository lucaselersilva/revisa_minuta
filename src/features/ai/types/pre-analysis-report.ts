import { z } from "zod";

const yesPartialNoSchema = z.enum(["sim", "parcialmente", "nao", "inconclusivo"]);
const pesoProbatorioSchema = z.enum(["forte", "medio", "fraco", "inconclusivo", "contraditorio"]);
const prioridadeEstrategicaSchema = z.enum(["urgente", "importante", "relevante", "considerar"]);
const vinculoSubjetivoSchema = z.enum(["autor_direto", "terceiro", "nao_identificado", "divergente"]);

const confrontoSchema = z.object({
  o_que_autor_narra: z.array(z.string()),
  o_que_documentos_provam: z.array(z.string()),
  o_que_documentos_nao_provam: z.array(z.string()),
  o_que_pode_ser_explorado_pela_defesa: z.array(z.string())
});

const narrativaConclusaoSchema = z.object({
  conclusao: yesPartialNoSchema,
  justificativa: z.string(),
  pontos_fortes: z.array(z.string()),
  lacunas: z.array(z.string())
});

const pedidosConclusaoSchema = z.object({
  conclusao: yesPartialNoSchema,
  justificativa: z.string(),
  pedidos_sustentados: z.array(z.string()),
  pedidos_nao_sustentados_ou_fracos: z.array(z.string())
});

const individualizacaoSchema = z.object({
  nome_autor: z.string(),
  documentos_vinculados: z.array(z.string()),
  pedidos_vinculados: z.array(z.string()),
  danos_individualizados: z.array(z.string()),
  lacunas_individualizacao: z.array(z.string()),
  observacoes: z.string()
});

const cronologiaEventoSchema = z.object({
  data: z.string().nullable(),
  evento: z.string(),
  fonte_documental: z.string().nullable(),
  observacao: z.string()
});

const mapaDocumentalItemSchema = z.object({
  documento_referencia: z.string(),
  tipo_documento: z.string(),
  titular_ou_emitente: z.string().nullable(),
  vinculo_subjetivo: vinculoSubjetivoSchema,
  peso_probatorio: pesoProbatorioSchema,
  achados_principais: z.array(z.string()),
  impacto_para_defesa: z.string(),
  pontos_de_atencao: z.array(z.string()),
  referencia_trecho_ou_contexto: z.string().nullable()
});

const priorizacaoItemSchema = z.object({
  titulo: z.string(),
  prioridade: prioridadeEstrategicaSchema,
  motivo: z.string(),
  acao_sugerida: z.string(),
  referencia_documental: z.array(z.string())
});

const fatoSupervenienteSchema = z.object({
  descricao: z.string(),
  impacto_para_defesa: z.string(),
  exige_enfrentamento_especifico: z.boolean(),
  referencia_documental: z.array(z.string())
});

export const preAnalysisReportSchema = z.object({
  resumo_executivo: z.string(),
  matriz_final_confronto: confrontoSchema,
  analise_narrativa_vs_documentos: z.object({
    documentos_embasam_narrativa: narrativaConclusaoSchema,
    documentos_embasam_pedidos: pedidosConclusaoSchema
  }),
  analise_individualizada_por_autor: z.array(individualizacaoSchema),
  cadeia_negocial: z.object({
    quem_comprou: z.string().nullable(),
    quem_pagou: z.string().nullable(),
    quem_viajou_ou_seria_beneficiario: z.string().nullable(),
    quem_reclamou_ou_solicitou_suporte: z.string().nullable(),
    quem_recebeu_ou_deveria_receber_estorno: z.string().nullable(),
    divergencias_entre_pessoas: z.array(z.string())
  }),
  cronologia: z.object({
    eventos_identificados: z.array(cronologiaEventoSchema),
    inconsistencias_temporais: z.array(z.string()),
    eventos_sem_prova_temporal: z.array(z.string())
  }),
  coerencia_entre_documentos: z.object({
    nomes_divergentes: z.array(z.string()),
    datas_divergentes: z.array(z.string()),
    valores_divergentes: z.array(z.string()),
    codigos_localizadores_divergentes: z.array(z.string()),
    emails_telefones_ou_identificadores_divergentes: z.array(z.string()),
    observacoes: z.string()
  }),
  analise_por_tipo_documental: z.object({
    procuracao: z.object({
      existe: z.boolean(),
      regularidade_formal: z.string(),
      assinatura_compatibilidade: z.enum(["compativel", "incompativel", "indicio_de_inconsistencia", "nao_verificavel"]),
      pontos_de_atencao: z.array(z.string())
    }),
    documento_identidade: z.object({
      existe: z.boolean(),
      compatibilidade_com_parte: z.string(),
      sinais_de_edicao_ou_layout_incompativel: z.array(z.string()),
      pontos_de_atencao: z.array(z.string())
    }),
    comprovante_endereco: z.object({
      existe: z.boolean(),
      aderencia_ao_nome_da_parte: z.string(),
      aderencia_ao_endereco_da_inicial: z.string(),
      sinais_de_edicao_ou_layout_incompativel: z.array(z.string()),
      pontos_de_atencao: z.array(z.string())
    }),
    comprovantes_pagamento: z.object({
      existem: z.boolean(),
      aderencia_ao_nome_da_parte: z.string(),
      datas_valores_identificados: z.array(z.string()),
      sinais_de_edicao_ou_layout_incompativel: z.array(z.string()),
      pontos_de_atencao: z.array(z.string())
    }),
    prints_tela: z.object({
      existem: z.boolean(),
      compatibilidade_com_plataforma_alegada: z.string(),
      ["qualidade_probat\u00f3ria"]: z.enum(["forte", "media", "fraca", "inconclusiva"]),
      sinais_de_edicao_ou_recorte: z.array(z.string()),
      pontos_de_atencao: z.array(z.string())
    }),
    outros_documentos: z.array(
      z.object({
        tipo_ou_descricao: z.string(),
        peso_probatorio: pesoProbatorioSchema,
        observacoes: z.string()
      })
    )
  }),
  mapa_documental_autor: z.array(mapaDocumentalItemSchema),
  priorizacao_estrategica: z.array(priorizacaoItemSchema),
  fatos_supervenientes_ou_da_emenda: z.array(fatoSupervenienteSchema),
  suficiencia_probatoria: z.object({
    conclusao: z.enum(["suficiente", "parcial", "insuficiente", "inconclusiva"]),
    provas_fortes: z.array(z.string()),
    provas_fracas_ou_unilaterais: z.array(z.string()),
    documentos_chave_ausentes: z.array(z.string()),
    observacoes: z.string()
  }),
  pedido_indenizatorio: z.object({
    dano_material_tem_prova_minima: yesPartialNoSchema,
    valor_pedido_tem_suporte_documental: yesPartialNoSchema,
    dano_moral_tem_base_fatica_individualizada: yesPartialNoSchema,
    despesas_extraordinarias_comprovadas: z.array(z.string()),
    lacunas: z.array(z.string())
  }),
  compatibilidade_canal_documento: z.object({
    alegacoes_vs_canais_comprovados: z.array(z.string()),
    prova_de_contratacao: z.array(z.string()),
    prova_de_tentativa: z.array(z.string()),
    prova_de_oferta_ou_pre_reserva: z.array(z.string()),
    mera_consulta_ou_print_inconclusivo: z.array(z.string())
  }),
  integridade_tecnica_arquivos: z.object({
    sinais_possiveis_de_manipulacao: z.array(z.string()),
    limitacoes_da_analise: z.array(z.string()),
    necessita_validacao_humana: z.boolean()
  }),
  representacao_processual: z.object({
    regularidade_aparente: z.enum(["regular", "parcial", "irregular", "inconclusiva"]),
    pontos_de_atencao: z.array(z.string()),
    autores_sem_procuracao_ou_documento: z.array(z.string())
  }),
  espacialidade: z.object({
    cidades_enderecos_identificados: z.array(z.string()),
    inconsistencias_territoriais: z.array(z.string()),
    observacoes: z.string()
  }),
  indicios_litigancia_padronizada: z.object({
    indicios: z.array(z.string()),
    elementos_recorrentes: z.array(z.string()),
    observacoes: z.string()
  }),
  pontos_exploraveis_defesa: z.array(
    z.object({
      ponto: z.string(),
      categoria: z.enum([
        "legitimidade",
        "autenticidade",
        "dano_material",
        "dano_moral",
        "nexo_causal",
        "representacao",
        "prova_insuficiente",
        "cronologia",
        "outro"
      ]),
      relevancia: z.enum(["baixa", "media", "alta", "critica"]),
      explorabilidade: z.enum(["baixa", "media", "alta"]),
      necessita_validacao_humana: z.boolean(),
      justificativa: z.string()
    })
  ),
  documentos_internos_recomendados_para_defesa: z.array(z.string()),
  alertas_de_nao_conclusao: z.array(z.string())
});

export type PreAnalysisReportOutput = z.infer<typeof preAnalysisReportSchema>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

function cleanNullableText(value: unknown): string | null {
  const text = cleanText(value);
  return text || null;
}

const GENERIC_REPETITIVE_TEXTS = new Set([
  "Nao ha elementos suficientes registrados.",
  "Nao foi possivel verificar com os documentos disponiveis.",
  "Inconclusivo com o material atual.",
  "Registro convertido para a estrutura atual."
]);

function pickFirstText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = cleanText(record[key]);
    if (value) {
      return value;
    }
  }

  return "";
}

function prudentialText(value: unknown, fallback = "") {
  const text = cleanText(value);
  return text || fallback;
}

function uniqueCleanStrings(items: string[]) {
  return [...new Set(items.map((item) => cleanText(item)).filter(Boolean))];
}

function compactGenericList(items: string[]) {
  const uniqueItems = uniqueCleanStrings(items);
  const genericItems = uniqueItems.filter((item) => GENERIC_REPETITIVE_TEXTS.has(item));
  const specificItems = uniqueItems.filter((item) => !GENERIC_REPETITIVE_TEXTS.has(item));

  if (specificItems.length > 0) {
    return specificItems;
  }

  return genericItems.slice(0, 1);
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return compactGenericList(
      value
      .map((item) => {
        if (typeof item === "string") {
          return cleanText(item);
        }

        if (isRecord(item)) {
          return pickFirstText(item, [
            "item",
            "texto",
            "descricao",
            "observacao",
            "titulo",
            "evento",
            "documento",
            "pedido",
            "ponto",
            "descricao_curta"
          ]);
        }

        return "";
      })
      .filter(Boolean)
    );
  }

  if (isRecord(value)) {
    const nestedArray = Object.values(value).find(Array.isArray);
    if (nestedArray) {
      return toStringArray(nestedArray);
    }

    const single = pickFirstText(value, ["item", "texto", "descricao", "observacao", "titulo"]);
    return single ? [single] : [];
  }

  const single = cleanText(value);
  return single ? compactGenericList([single]) : [];
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = cleanText(value).toLowerCase();
  return ["sim", "true", "1", "yes", "existe", "existem", "presente"].includes(normalized);
}

function normalizeYesPartialNo(value: unknown): z.infer<typeof yesPartialNoSchema> {
  const normalized = cleanText(value).toLowerCase();

  if (["sim", "yes", "comprovado", "comprovada", "sustentado", "sustentada"].includes(normalized)) {
    return "sim";
  }

  if (["parcial", "parcialmente", "em parte"].includes(normalized)) {
    return "parcialmente";
  }

  if (["nao", "não", "ausente", "fraco", "insuficiente"].includes(normalized)) {
    return "nao";
  }

  return "inconclusivo";
}

function normalizePesoProbatorio(value: unknown): z.infer<typeof pesoProbatorioSchema> {
  const normalized = cleanText(value).toLowerCase();

  if (["forte", "alto", "alta"].includes(normalized)) return "forte";
  if (["medio", "médio", "media", "média", "regular"].includes(normalized)) return "medio";
  if (["fraco", "fraca", "baixo", "baixa"].includes(normalized)) return "fraco";
  if (normalized.includes("contradit")) return "contraditorio";
  return "inconclusivo";
}

function normalizePrioridade(value: unknown): z.infer<typeof prioridadeEstrategicaSchema> {
  const normalized = cleanText(value).toLowerCase();

  if (["urgente", "urgent", "critico", "critica"].includes(normalized)) return "urgente";
  if (["importante", "important"].includes(normalized)) return "importante";
  if (["relevante", "relevant", "medio", "médio", "media", "média"].includes(normalized)) return "relevante";
  return "considerar";
}

function normalizeVinculoSubjetivo(value: unknown): z.infer<typeof vinculoSubjetivoSchema> {
  const normalized = cleanText(value).toLowerCase();

  if (normalized.includes("autor") || normalized.includes("direto")) return "autor_direto";
  if (normalized.includes("terceiro")) return "terceiro";
  if (normalized.includes("diverg")) return "divergente";
  return "nao_identificado";
}

function normalizeQualidadePrint(value: unknown): "forte" | "media" | "fraca" | "inconclusiva" {
  const normalized = cleanText(value).toLowerCase();

  if (["forte", "alta", "alto"].includes(normalized)) return "forte";
  if (["media", "média", "medio", "médio", "regular"].includes(normalized)) return "media";
  if (["fraca", "fraco", "baixa", "baixo"].includes(normalized)) return "fraca";
  return "inconclusiva";
}

function normalizeAssinaturaCompatibilidade(
  value: unknown
): "compativel" | "incompativel" | "indicio_de_inconsistencia" | "nao_verificavel" {
  const normalized = cleanText(value).toLowerCase();

  if (normalized.includes("compativ")) return "compativel";
  if (normalized.includes("incompativ")) return "incompativel";
  if (normalized.includes("indicio") || normalized.includes("inconsist")) return "indicio_de_inconsistencia";
  return "nao_verificavel";
}

function normalizeSuficiencia(value: unknown): "suficiente" | "parcial" | "insuficiente" | "inconclusiva" {
  const normalized = cleanText(value).toLowerCase();

  if (normalized.includes("suficiente")) return "suficiente";
  if (normalized.includes("parcial")) return "parcial";
  if (normalized.includes("insuf")) return "insuficiente";
  return "inconclusiva";
}

function normalizeRegularidade(value: unknown): "regular" | "parcial" | "irregular" | "inconclusiva" {
  const normalized = cleanText(value).toLowerCase();

  if (normalized.includes("regular")) return "regular";
  if (normalized.includes("parcial")) return "parcial";
  if (normalized.includes("irregular")) return "irregular";
  return "inconclusiva";
}

function normalizeCategoria(
  value: unknown
): "legitimidade" | "autenticidade" | "dano_material" | "dano_moral" | "nexo_causal" | "representacao" | "prova_insuficiente" | "cronologia" | "outro" {
  const normalized = cleanText(value).toLowerCase();

  if (normalized.includes("legitim")) return "legitimidade";
  if (normalized.includes("autentic")) return "autenticidade";
  if (normalized.includes("material")) return "dano_material";
  if (normalized.includes("moral")) return "dano_moral";
  if (normalized.includes("nexo")) return "nexo_causal";
  if (normalized.includes("represent")) return "representacao";
  if (normalized.includes("cronolog") || normalized.includes("tempo")) return "cronologia";
  if (normalized.includes("prova") || normalized.includes("insuf")) return "prova_insuficiente";
  return "outro";
}

function normalizeRelevancia(value: unknown): "baixa" | "media" | "alta" | "critica" {
  const normalized = cleanText(value).toLowerCase();

  if (normalized.includes("crit")) return "critica";
  if (normalized.includes("alta") || normalized.includes("alto")) return "alta";
  if (normalized.includes("media") || normalized.includes("média") || normalized.includes("medio") || normalized.includes("médio")) return "media";
  return "baixa";
}

function normalizeExplorabilidade(value: unknown): "baixa" | "media" | "alta" {
  const normalized = cleanText(value).toLowerCase();

  if (normalized.includes("alta") || normalized.includes("alto")) return "alta";
  if (normalized.includes("media") || normalized.includes("média") || normalized.includes("medio") || normalized.includes("médio")) return "media";
  return "baixa";
}

function containsKeyword(value: string | null | undefined, keywords: string[]) {
  const normalized = cleanText(value).toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function deriveDocumentFlags(report: PreAnalysisReportOutput) {
  const mapItems = report.mapa_documental_autor;
  const allTexts = mapItems.flatMap((item) => [
    item.documento_referencia,
    item.tipo_documento,
    item.titular_ou_emitente ?? "",
    item.impacto_para_defesa,
    item.referencia_trecho_ou_contexto ?? "",
    ...item.achados_principais,
    ...item.pontos_de_atencao
  ]);

  const hasAny = (keywords: string[]) => allTexts.some((text) => containsKeyword(text, keywords));

  return {
    hasProcuracao: hasAny(["procuracao", "procuração", "zapsign", "outorgante", "outorgado"]),
    hasIdentidade: hasAny(["identidade", "rg", "cnh", "senatran", "documento de identificacao", "documento de identificação"]),
    hasEndereco: hasAny(["comprovante de endereco", "comprovante de endereço", "condominio", "condomínio", "endereco", "endereço", "boleto"]),
    hasPagamento: hasAny(["comprovante de pagamento", "pagamento", "recibo", "boleto", "r$", "booking", "voucher"]),
    hasPrints: hasAny(["print", "captura", "screenshot", "tela", "hotsite", "aplicativo", "email", "e-mail"]),
    hasReserva: hasAny(["booking", "reserva", "hospedagem", "hotel"]),
    hasDeclaracao: hasAny(["declaracao", "declaração", "contingencia", "contingência"])
  };
}

function deriveResumoExecutivo(report: PreAnalysisReportOutput) {
  const provas = report.matriz_final_confronto.o_que_documentos_provam.slice(0, 2);
  const lacunas = report.matriz_final_confronto.o_que_documentos_nao_provam.slice(0, 2);
  const pontos = report.pontos_exploraveis_defesa.slice(0, 2).map((item) => item.ponto);

  const parts = [
    provas.length ? `Ha suporte documental para ${provas.join("; ").toLowerCase()}.` : "",
    lacunas.length ? `Persistem lacunas em ${lacunas.join("; ").toLowerCase()}.` : "",
    pontos.length ? `A pre-defesa deve priorizar ${pontos.join("; ").toLowerCase()}.` : ""
  ].filter(Boolean);

  return parts.join(" ");
}

function deriveMatrizFromReport(report: PreAnalysisReportOutput) {
  const fromMapa = report.mapa_documental_autor.flatMap((item) => item.achados_principais);
  const fromPontos = report.pontos_exploraveis_defesa.map((item) => item.ponto);
  const fromPriorizacao = report.priorizacao_estrategica.map((item) => item.titulo);

  return {
    o_que_autor_narra: compactGenericList([
      ...report.matriz_final_confronto.o_que_autor_narra,
      ...report.cronologia.eventos_identificados.map((item) => item.evento)
    ]),
    o_que_documentos_provam: compactGenericList([
      ...report.matriz_final_confronto.o_que_documentos_provam,
      ...fromMapa.slice(0, 4)
    ]),
    o_que_documentos_nao_provam: compactGenericList([
      ...report.matriz_final_confronto.o_que_documentos_nao_provam,
      ...report.suficiencia_probatoria.documentos_chave_ausentes,
      ...report.pedido_indenizatorio.lacunas
    ]),
    o_que_pode_ser_explorado_pela_defesa: compactGenericList([
      ...report.matriz_final_confronto.o_que_pode_ser_explorado_pela_defesa,
      ...fromPontos,
      ...fromPriorizacao
    ])
  };
}

function enrichIndividualizacao(report: PreAnalysisReportOutput) {
  if (!report.analise_individualizada_por_autor.length) {
    return report.analise_individualizada_por_autor;
  }

  const directDocuments = report.mapa_documental_autor
    .filter((item) => item.vinculo_subjetivo === "autor_direto")
    .map((item) => item.documento_referencia);

  const danos = compactGenericList([
    ...report.pedido_indenizatorio.despesas_extraordinarias_comprovadas,
    ...report.pedido_indenizatorio.lacunas
  ]);

  const pedidos = compactGenericList([
    ...report.analise_narrativa_vs_documentos.documentos_embasam_pedidos.pedidos_sustentados,
    ...report.analise_narrativa_vs_documentos.documentos_embasam_pedidos.pedidos_nao_sustentados_ou_fracos
  ]);

  return report.analise_individualizada_por_autor.map((item) => ({
    ...item,
    documentos_vinculados: item.documentos_vinculados.length ? item.documentos_vinculados : directDocuments,
    pedidos_vinculados: item.pedidos_vinculados.length ? item.pedidos_vinculados : pedidos,
    danos_individualizados: item.danos_individualizados.length ? item.danos_individualizados : danos,
    observacoes:
      item.observacoes === "Analise sem observacoes adicionais." && directDocuments.length
        ? "Documentos e pedidos vinculados a partir da rastreabilidade documental identificada."
        : item.observacoes
  }));
}

function enrichCronologia(report: PreAnalysisReportOutput) {
  if (report.cronologia.eventos_identificados.length) {
    return report.cronologia;
  }

  const events = compactGenericList([
    ...report.matriz_final_confronto.o_que_autor_narra,
    ...report.priorizacao_estrategica.map((item) => item.titulo)
  ]).slice(0, 6);

  return {
    eventos_identificados: events.map((evento) => ({
      data: null,
      evento,
      fonte_documental: null,
      observacao: "Marco sintetizado a partir da narrativa e da priorizacao defensiva."
    })),
    inconsistencias_temporais: report.cronologia.inconsistencias_temporais,
    eventos_sem_prova_temporal: report.cronologia.eventos_sem_prova_temporal
  };
}

function enrichAnalisePorTipoDocumental(report: PreAnalysisReportOutput) {
  const flags = deriveDocumentFlags(report);

  return {
    ...report.analise_por_tipo_documental,
    procuracao: {
      ...report.analise_por_tipo_documental.procuracao,
      existe: report.analise_por_tipo_documental.procuracao.existe || flags.hasProcuracao
    },
    documento_identidade: {
      ...report.analise_por_tipo_documental.documento_identidade,
      existe: report.analise_por_tipo_documental.documento_identidade.existe || flags.hasIdentidade
    },
    comprovante_endereco: {
      ...report.analise_por_tipo_documental.comprovante_endereco,
      existe: report.analise_por_tipo_documental.comprovante_endereco.existe || flags.hasEndereco
    },
    comprovantes_pagamento: {
      ...report.analise_por_tipo_documental.comprovantes_pagamento,
      existem: report.analise_por_tipo_documental.comprovantes_pagamento.existem || flags.hasPagamento || flags.hasReserva
    },
    prints_tela: {
      ...report.analise_por_tipo_documental.prints_tela,
      existem: report.analise_por_tipo_documental.prints_tela.existem || flags.hasPrints
    },
    outros_documentos: report.analise_por_tipo_documental.outros_documentos.length
      ? report.analise_por_tipo_documental.outros_documentos
      : report.mapa_documental_autor
          .filter((item) => !containsKeyword(item.tipo_documento, ["procuracao", "identidade", "endereco", "pagamento", "print"]))
          .slice(0, 4)
          .map((item) => ({
            tipo_ou_descricao: item.documento_referencia,
            peso_probatorio: item.peso_probatorio,
            observacoes: item.impacto_para_defesa
          }))
  };
}

function enrichSuficienciaProbatoria(report: PreAnalysisReportOutput) {
  return {
    ...report.suficiencia_probatoria,
    provas_fortes: compactGenericList([
      ...report.suficiencia_probatoria.provas_fortes,
      ...report.mapa_documental_autor.filter((item) => item.peso_probatorio === "forte").map((item) => item.documento_referencia)
    ]),
    provas_fracas_ou_unilaterais: compactGenericList([
      ...report.suficiencia_probatoria.provas_fracas_ou_unilaterais,
      ...report.mapa_documental_autor
        .filter((item) => item.peso_probatorio === "fraco" || item.peso_probatorio === "inconclusivo")
        .map((item) => item.documento_referencia)
    ]),
    documentos_chave_ausentes: compactGenericList([
      ...report.suficiencia_probatoria.documentos_chave_ausentes,
      ...report.pedido_indenizatorio.lacunas
    ])
  };
}

function enrichPedidoIndenizatorio(report: PreAnalysisReportOutput) {
  const hasAnyExpense = report.pedido_indenizatorio.despesas_extraordinarias_comprovadas.length > 0;
  const hasLacunas = report.pedido_indenizatorio.lacunas.length > 0;

  return {
    ...report.pedido_indenizatorio,
    dano_material_tem_prova_minima:
      report.pedido_indenizatorio.dano_material_tem_prova_minima === "inconclusivo" && (hasAnyExpense || hasLacunas)
        ? "parcialmente"
        : report.pedido_indenizatorio.dano_material_tem_prova_minima,
    valor_pedido_tem_suporte_documental:
      report.pedido_indenizatorio.valor_pedido_tem_suporte_documental === "inconclusivo" && hasLacunas
        ? "parcialmente"
        : report.pedido_indenizatorio.valor_pedido_tem_suporte_documental,
    dano_moral_tem_base_fatica_individualizada:
      report.pedido_indenizatorio.dano_moral_tem_base_fatica_individualizada === "inconclusivo" &&
      report.analise_individualizada_por_autor.some((item) => item.danos_individualizados.length > 0)
        ? "parcialmente"
        : report.pedido_indenizatorio.dano_moral_tem_base_fatica_individualizada
  };
}

function enrichNarrativaVsDocumentos(report: PreAnalysisReportOutput) {
  const matriz = deriveMatrizFromReport(report);
  const narrativaTemBase = matriz.o_que_documentos_provam.length > 0;
  const pedidosTemLacuna = report.pedido_indenizatorio.lacunas.length > 0;

  return {
    documentos_embasam_narrativa: {
      ...report.analise_narrativa_vs_documentos.documentos_embasam_narrativa,
      conclusao:
        report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.conclusao === "inconclusivo" && narrativaTemBase
          ? "parcialmente"
          : report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.conclusao,
      pontos_fortes: compactGenericList([
        ...report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.pontos_fortes,
        ...matriz.o_que_documentos_provam.slice(0, 3)
      ]),
      lacunas: compactGenericList([
        ...report.analise_narrativa_vs_documentos.documentos_embasam_narrativa.lacunas,
        ...matriz.o_que_documentos_nao_provam.slice(0, 3)
      ])
    },
    documentos_embasam_pedidos: {
      ...report.analise_narrativa_vs_documentos.documentos_embasam_pedidos,
      conclusao:
        report.analise_narrativa_vs_documentos.documentos_embasam_pedidos.conclusao === "inconclusivo" &&
        (report.pedido_indenizatorio.despesas_extraordinarias_comprovadas.length > 0 || pedidosTemLacuna)
          ? "parcialmente"
          : report.analise_narrativa_vs_documentos.documentos_embasam_pedidos.conclusao,
      pedidos_nao_sustentados_ou_fracos: compactGenericList([
        ...report.analise_narrativa_vs_documentos.documentos_embasam_pedidos.pedidos_nao_sustentados_ou_fracos,
        ...report.pedido_indenizatorio.lacunas
      ])
    }
  };
}

function enrichPreAnalysisReport(report: PreAnalysisReportOutput): PreAnalysisReportOutput {
  const matriz = deriveMatrizFromReport(report);
  const individualizacao = enrichIndividualizacao(report);
  const cronologia = enrichCronologia({ ...report, matriz_final_confronto: matriz, analise_individualizada_por_autor: individualizacao });
  const analisePorTipoDocumental = enrichAnalisePorTipoDocumental(report);
  const suficienciaProbatoria = enrichSuficienciaProbatoria(report);
  const pedidoIndenizatorio = enrichPedidoIndenizatorio({
    ...report,
    analise_individualizada_por_autor: individualizacao
  });
  const narrativaVsDocumentos = enrichNarrativaVsDocumentos({
    ...report,
    matriz_final_confronto: matriz,
    pedido_indenizatorio: pedidoIndenizatorio
  });

  const enriched: PreAnalysisReportOutput = {
    ...report,
    resumo_executivo:
      report.resumo_executivo === "Analise pre-defensiva gerada a partir do material processado nesta etapa."
        ? deriveResumoExecutivo({
            ...report,
            matriz_final_confronto: matriz,
            pontos_exploraveis_defesa: report.pontos_exploraveis_defesa
          }) || report.resumo_executivo
        : report.resumo_executivo,
    matriz_final_confronto: matriz,
    analise_narrativa_vs_documentos: narrativaVsDocumentos,
    analise_individualizada_por_autor: individualizacao,
    cronologia,
    analise_por_tipo_documental: analisePorTipoDocumental,
    suficiencia_probatoria: suficienciaProbatoria,
    pedido_indenizatorio: pedidoIndenizatorio,
    alertas_de_nao_conclusao: compactGenericList(report.alertas_de_nao_conclusao),
    documentos_internos_recomendados_para_defesa: compactGenericList(report.documentos_internos_recomendados_para_defesa)
  };

  return preAnalysisReportSchema.parse(enriched);
}

function buildLegacySummary(source: Record<string, unknown>) {
  const diagnostico = isRecord(source.diagnostico_inicial) ? source.diagnostico_inicial : {};
  const quadro = isRecord(source.quadro_resumo) ? source.quadro_resumo : {};

  return (
    pickFirstText(source, ["resumo_executivo"]) ||
    pickFirstText(diagnostico, ["resumo_executivo", "resumo", "texto", "descricao"]) ||
    pickFirstText(quadro, ["sintese_final", "resumo_final", "conclusao"]) ||
    "Laudo pre-analitico convertido para a estrutura atual com base no conteudo persistido."
  );
}

function buildLegacyFindings(source: Record<string, unknown>) {
  return toStringArray(
    source.analise_documental_do_autor ??
      source.principais_inconsistencias_documentais ??
      source.achados_documentais ??
      source.inconsistencias_documentais
  );
}

function buildLegacyAttention(source: Record<string, unknown>) {
  return toStringArray(
    source.pontos_de_atencao_para_a_defesa ?? source.achados_prioritarios ?? source.recomendacoes_prioritarias
  );
}

function buildLegacyRecommendedDocuments(source: Record<string, unknown>) {
  return toStringArray(source.documentos_recomendados);
}

function normalizeIndividualAuthors(value: unknown, source: Record<string, unknown>) {
  if (Array.isArray(value) && value.length) {
    return value
      .map((item) => {
        if (!isRecord(item)) {
          const text = cleanText(item);
          return text
            ? {
                nome_autor: text,
                documentos_vinculados: [],
                pedidos_vinculados: [],
                danos_individualizados: [],
                lacunas_individualizacao: [],
                observacoes: "Registro convertido para a estrutura atual."
              }
            : null;
        }

        return {
          nome_autor: pickFirstText(item, ["nome_autor", "autor", "nome", "parte"]) || "Autor nao identificado",
          documentos_vinculados: toStringArray(item.documentos_vinculados ?? item.documentos ?? item.vinculos_documentais),
          pedidos_vinculados: toStringArray(item.pedidos_vinculados ?? item.pedidos),
          danos_individualizados: toStringArray(item.danos_individualizados ?? item.danos),
          lacunas_individualizacao: toStringArray(item.lacunas_individualizacao ?? item.lacunas),
          observacoes: prudentialText(item.observacoes ?? item.observacao, "Analise sem observacoes adicionais.")
        };
      })
      .filter(Boolean) as PreAnalysisReportOutput["analise_individualizada_por_autor"];
  }

  const parties = Array.isArray(source.partes) ? source.partes : [];
  return parties
    .map((item) => {
      if (!isRecord(item)) return null;
      const role = cleanText(item.role ?? item.tipo ?? item.papel).toLowerCase();
      if (!role.includes("author") && !role.includes("autor")) return null;

      return {
        nome_autor: pickFirstText(item, ["name", "nome", "parte"]) || "Autor nao identificado",
        documentos_vinculados: [],
        pedidos_vinculados: [],
        danos_individualizados: [],
        lacunas_individualizacao: [],
        observacoes: "Entrada gerada a partir dos metadados de partes."
      };
    })
    .filter(Boolean) as PreAnalysisReportOutput["analise_individualizada_por_autor"];
}

function normalizeCronologia(value: unknown, source: Record<string, unknown>) {
  const raw = isRecord(value) ? value : {};
  const eventos = Array.isArray(raw.eventos_identificados)
    ? raw.eventos_identificados
        .map((item) => {
          if (!isRecord(item)) {
            const text = cleanText(item);
            return text
              ? {
                  data: null,
                  evento: text,
                  fonte_documental: null,
                  observacao: "Evento convertido para a estrutura atual."
                }
              : null;
          }

          const evento = pickFirstText(item, ["evento", "descricao", "titulo", "item"]);
          if (!evento) return null;

          return {
            data: cleanNullableText(item.data),
            evento,
            fonte_documental: cleanNullableText(item.fonte_documental ?? item.fonte ?? item.documento),
            observacao: prudentialText(item.observacao ?? item.nota ?? item.detalhe)
          };
        })
        .filter(Boolean) as PreAnalysisReportOutput["cronologia"]["eventos_identificados"]
    : [];

  if (eventos.length) {
    return {
      eventos_identificados: eventos,
      inconsistencias_temporais: toStringArray(raw.inconsistencias_temporais),
      eventos_sem_prova_temporal: toStringArray(raw.eventos_sem_prova_temporal)
    };
  }

  const dates = toStringArray(source.datas_relevantes ?? source.datas ?? source.timeline);
  return {
    eventos_identificados: dates.map((date) => ({
      data: date,
      evento: "Marco temporal identificado em relatorio legado",
      fonte_documental: null,
      observacao: "Conversao automatica do formato anterior."
    })),
    inconsistencias_temporais: [],
    eventos_sem_prova_temporal: []
  };
}

function normalizeOutrosDocumentos(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isRecord(item)) {
        const text = cleanText(item);
        return text
          ? {
              tipo_ou_descricao: text,
              peso_probatorio: "inconclusivo" as const,
              observacoes: "Registro convertido para a estrutura atual."
            }
          : null;
      }

      return {
        tipo_ou_descricao: pickFirstText(item, ["tipo_ou_descricao", "tipo", "descricao", "documento", "titulo"]) || "Documento nao identificado",
        peso_probatorio: normalizePesoProbatorio(item.peso_probatorio ?? item.peso ?? item.qualidade),
        observacoes: prudentialText(item.observacoes ?? item.observacao)
      };
    })
    .filter(Boolean) as PreAnalysisReportOutput["analise_por_tipo_documental"]["outros_documentos"];
}

function normalizeMapaDocumental(value: unknown, source: Record<string, unknown>) {
  if (Array.isArray(value) && value.length) {
    return value
      .map((item) => {
        if (!isRecord(item)) {
          const text = cleanText(item);
          return text
            ? {
                documento_referencia: text,
                tipo_documento: "nao identificado",
                titular_ou_emitente: null,
                vinculo_subjetivo: "nao_identificado" as const,
                peso_probatorio: "inconclusivo" as const,
                achados_principais: [],
                impacto_para_defesa: "Registro convertido para a estrutura atual.",
                pontos_de_atencao: [],
                referencia_trecho_ou_contexto: null
              }
            : null;
        }

        return {
          documento_referencia:
            pickFirstText(item, ["documento_referencia", "documento", "arquivo", "fonte", "id_documento"]) ||
            "Documento nao identificado",
          tipo_documento: pickFirstText(item, ["tipo_documento", "tipo", "categoria"]) || "nao identificado",
          titular_ou_emitente: cleanNullableText(item.titular_ou_emitente ?? item.emitente ?? item.titular),
          vinculo_subjetivo: normalizeVinculoSubjetivo(item.vinculo_subjetivo ?? item.vinculo),
          peso_probatorio: normalizePesoProbatorio(item.peso_probatorio ?? item.peso),
          achados_principais: toStringArray(item.achados_principais ?? item.achados),
          impacto_para_defesa: prudentialText(item.impacto_para_defesa ?? item.impacto),
          pontos_de_atencao: toStringArray(item.pontos_de_atencao),
          referencia_trecho_ou_contexto: cleanNullableText(
            item.referencia_trecho_ou_contexto ?? item.referencia ?? item.contexto
          )
        };
      })
      .filter(Boolean) as PreAnalysisReportOutput["mapa_documental_autor"];
  }

  const legacyFindings = buildLegacyFindings(source);
  return legacyFindings.slice(0, 6).map((finding, index) => ({
    documento_referencia: `Achado documental ${index + 1}`,
    tipo_documento: "nao identificado",
    titular_ou_emitente: null,
    vinculo_subjetivo: "nao_identificado",
    peso_probatorio: "inconclusivo",
    achados_principais: [finding],
    impacto_para_defesa: "Achado legado convertido para rastreabilidade sintetica.",
    pontos_de_atencao: [],
    referencia_trecho_ou_contexto: null
  }));
}

function normalizePriorizacao(value: unknown, source: Record<string, unknown>) {
  const raw = Array.isArray(value) ? value : buildLegacyAttention(source);

  return raw
    .map((item) => {
      if (typeof item === "string") {
        const text = cleanText(item);
        return text
          ? {
              titulo: text,
              prioridade: "relevante" as const,
              motivo: text,
              acao_sugerida: "Validar documentalmente e avaliar exploracao pela defesa.",
              referencia_documental: []
            }
          : null;
      }

      if (!isRecord(item)) return null;

      return {
        titulo: pickFirstText(item, ["titulo", "item", "nome", "ponto"]) || "Prioridade nao identificada",
        prioridade: normalizePrioridade(item.prioridade ?? item.severidade ?? item.relevancia),
        motivo: prudentialText(item.motivo ?? item.justificativa ?? item.explicacao ?? item.observacao),
        acao_sugerida: prudentialText(
          item.acao_sugerida ?? item.acao ?? item.recomendacao,
          "Conferir o conjunto documental e avaliar reflexo na estrategia defensiva."
        ),
        referencia_documental: toStringArray(item.referencia_documental ?? item.documentos ?? item.referencias)
      };
    })
    .filter(Boolean) as PreAnalysisReportOutput["priorizacao_estrategica"];
}

function normalizeFatosSupervenientes(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isRecord(item)) {
        const text = cleanText(item);
        return text
          ? {
              descricao: text,
              impacto_para_defesa: "Fato superveniente convertido para a estrutura atual.",
              exige_enfrentamento_especifico: true,
              referencia_documental: []
            }
          : null;
      }

      return {
        descricao: pickFirstText(item, ["descricao", "fato", "titulo", "item"]) || "Fato superveniente nao identificado",
        impacto_para_defesa: prudentialText(item.impacto_para_defesa ?? item.impacto),
        exige_enfrentamento_especifico: toBoolean(
          item.exige_enfrentamento_especifico ?? item.exige_enfrentamento ?? item.prioritario
        ),
        referencia_documental: toStringArray(item.referencia_documental ?? item.documentos ?? item.referencias)
      };
    })
    .filter(Boolean) as PreAnalysisReportOutput["fatos_supervenientes_ou_da_emenda"];
}

function normalizePontosExploraveis(value: unknown, source: Record<string, unknown>) {
  const raw = Array.isArray(value) ? value : buildLegacyAttention(source);

  return raw
    .map((item) => {
      if (typeof item === "string") {
        const text = cleanText(item);
        return text
          ? {
              ponto: text,
              categoria: "outro" as const,
              relevancia: "media" as const,
              explorabilidade: "media" as const,
              necessita_validacao_humana: false,
              justificativa: text
            }
          : null;
      }

      if (!isRecord(item)) return null;

      const titulo = pickFirstText(item, ["ponto", "titulo", "item", "nome", "achado"]);
      const justificativa = pickFirstText(item, ["justificativa", "explicacao", "observacao", "detalhe"]);

      if (!titulo && !justificativa) return null;

      return {
        ponto: titulo || justificativa,
        categoria: normalizeCategoria(item.categoria),
        relevancia: normalizeRelevancia(item.relevancia ?? item.prioridade ?? item.severidade),
        explorabilidade: normalizeExplorabilidade(item.explorabilidade ?? item.prioridade),
        necessita_validacao_humana: toBoolean(item.necessita_validacao_humana),
        justificativa: prudentialText(justificativa || titulo)
      };
    })
    .filter(Boolean) as PreAnalysisReportOutput["pontos_exploraveis_defesa"];
}

export function normalizePreAnalysisReportPayload(payload: unknown): PreAnalysisReportOutput {
  const source = isRecord(payload) ? payload : {};
  const narrativa = isRecord(source.analise_narrativa_vs_documentos) ? source.analise_narrativa_vs_documentos : {};
  const embasamNarrativa = isRecord(narrativa.documentos_embasam_narrativa) ? narrativa.documentos_embasam_narrativa : {};
  const embasamPedidos = isRecord(narrativa.documentos_embasam_pedidos) ? narrativa.documentos_embasam_pedidos : {};
  const matriz = isRecord(source.matriz_final_confronto) ? source.matriz_final_confronto : {};
  const coerencia = isRecord(source.coerencia_entre_documentos) ? source.coerencia_entre_documentos : {};
  const cadeia = isRecord(source.cadeia_negocial) ? source.cadeia_negocial : {};
  const tipoDocumental = isRecord(source.analise_por_tipo_documental) ? source.analise_por_tipo_documental : {};
  const procuracao = isRecord(tipoDocumental.procuracao) ? tipoDocumental.procuracao : {};
  const identidade = isRecord(tipoDocumental.documento_identidade) ? tipoDocumental.documento_identidade : {};
  const endereco = isRecord(tipoDocumental.comprovante_endereco) ? tipoDocumental.comprovante_endereco : {};
  const pagamentos = isRecord(tipoDocumental.comprovantes_pagamento) ? tipoDocumental.comprovantes_pagamento : {};
  const prints = isRecord(tipoDocumental.prints_tela) ? tipoDocumental.prints_tela : {};
  const suficiencia = isRecord(source.suficiencia_probatoria) ? source.suficiencia_probatoria : {};
  const pedidoIndenizatorio = isRecord(source.pedido_indenizatorio) ? source.pedido_indenizatorio : {};
  const canalDocumento = isRecord(source.compatibilidade_canal_documento) ? source.compatibilidade_canal_documento : {};
  const integridade = isRecord(source.integridade_tecnica_arquivos) ? source.integridade_tecnica_arquivos : {};
  const representacao = isRecord(source.representacao_processual) ? source.representacao_processual : {};
  const espacialidade = isRecord(source.espacialidade) ? source.espacialidade : {};
  const litigancia = isRecord(source.indicios_litigancia_padronizada) ? source.indicios_litigancia_padronizada : {};

  const legacySummary = buildLegacySummary(source);
  const legacyFindings = buildLegacyFindings(source);
  const legacyDocuments = buildLegacyRecommendedDocuments(source);

  const normalized = preAnalysisReportSchema.parse({
    resumo_executivo: prudentialText(
      source.resumo_executivo ?? legacySummary,
      "Analise pre-defensiva gerada a partir do material processado nesta etapa."
    ),
    matriz_final_confronto: {
      o_que_autor_narra: toStringArray(matriz.o_que_autor_narra ?? source.fatos_relevantes),
      o_que_documentos_provam: toStringArray(matriz.o_que_documentos_provam ?? legacyFindings),
      o_que_documentos_nao_provam: toStringArray(matriz.o_que_documentos_nao_provam ?? source.lacunas_iniciais),
      o_que_pode_ser_explorado_pela_defesa: toStringArray(
        matriz.o_que_pode_ser_explorado_pela_defesa ?? source.pontos_de_atencao_para_a_defesa
      )
    },
    analise_narrativa_vs_documentos: {
      documentos_embasam_narrativa: {
        conclusao: normalizeYesPartialNo(embasamNarrativa.conclusao),
        justificativa: prudentialText(
          embasamNarrativa.justificativa,
          "A aderencia entre narrativa e anexos ficou apenas parcialmente verificavel com o material atual."
        ),
        pontos_fortes: toStringArray(embasamNarrativa.pontos_fortes ?? legacyFindings.slice(0, 3)),
        lacunas: toStringArray(embasamNarrativa.lacunas ?? source.lacunas_iniciais)
      },
      documentos_embasam_pedidos: {
        conclusao: normalizeYesPartialNo(embasamPedidos.conclusao),
        justificativa: prudentialText(
          embasamPedidos.justificativa,
          "O suporte documental dos pedidos ficou apenas parcialmente verificavel com o material atual."
        ),
        pedidos_sustentados: toStringArray(embasamPedidos.pedidos_sustentados),
        pedidos_nao_sustentados_ou_fracos: toStringArray(
          embasamPedidos.pedidos_nao_sustentados_ou_fracos ?? source.lacunas_iniciais
        )
      }
    },
    analise_individualizada_por_autor: normalizeIndividualAuthors(source.analise_individualizada_por_autor, source),
    cadeia_negocial: {
      quem_comprou: cleanNullableText(cadeia.quem_comprou),
      quem_pagou: cleanNullableText(cadeia.quem_pagou),
      quem_viajou_ou_seria_beneficiario: cleanNullableText(cadeia.quem_viajou_ou_seria_beneficiario),
      quem_reclamou_ou_solicitou_suporte: cleanNullableText(cadeia.quem_reclamou_ou_solicitou_suporte),
      quem_recebeu_ou_deveria_receber_estorno: cleanNullableText(cadeia.quem_recebeu_ou_deveria_receber_estorno),
      divergencias_entre_pessoas: toStringArray(cadeia.divergencias_entre_pessoas)
    },
    cronologia: normalizeCronologia(source.cronologia, source),
    coerencia_entre_documentos: {
      nomes_divergentes: toStringArray(coerencia.nomes_divergentes),
      datas_divergentes: toStringArray(coerencia.datas_divergentes),
      valores_divergentes: toStringArray(coerencia.valores_divergentes),
      codigos_localizadores_divergentes: toStringArray(coerencia.codigos_localizadores_divergentes),
      emails_telefones_ou_identificadores_divergentes: toStringArray(
        coerencia.emails_telefones_ou_identificadores_divergentes
      ),
      observacoes: prudentialText(
        coerencia.observacoes,
        "Coerencia interna analisada a partir do material processado."
      )
    },
    analise_por_tipo_documental: {
      procuracao: {
        existe: toBoolean(procuracao.existe),
        regularidade_formal: prudentialText(procuracao.regularidade_formal, "Inconclusivo com o material atual."),
        assinatura_compatibilidade: normalizeAssinaturaCompatibilidade(procuracao.assinatura_compatibilidade),
        pontos_de_atencao: toStringArray(procuracao.pontos_de_atencao)
      },
      documento_identidade: {
        existe: toBoolean(identidade.existe),
        compatibilidade_com_parte: prudentialText(
          identidade.compatibilidade_com_parte,
          "Inconclusivo com o material atual."
        ),
        sinais_de_edicao_ou_layout_incompativel: toStringArray(identidade.sinais_de_edicao_ou_layout_incompativel),
        pontos_de_atencao: toStringArray(identidade.pontos_de_atencao)
      },
      comprovante_endereco: {
        existe: toBoolean(endereco.existe),
        aderencia_ao_nome_da_parte: prudentialText(
          endereco.aderencia_ao_nome_da_parte,
          "Inconclusivo com o material atual."
        ),
        aderencia_ao_endereco_da_inicial: prudentialText(
          endereco.aderencia_ao_endereco_da_inicial,
          "Inconclusivo com o material atual."
        ),
        sinais_de_edicao_ou_layout_incompativel: toStringArray(endereco.sinais_de_edicao_ou_layout_incompativel),
        pontos_de_atencao: toStringArray(endereco.pontos_de_atencao)
      },
      comprovantes_pagamento: {
        existem: toBoolean(pagamentos.existem),
        aderencia_ao_nome_da_parte: prudentialText(
          pagamentos.aderencia_ao_nome_da_parte,
          "Inconclusivo com o material atual."
        ),
        datas_valores_identificados: toStringArray(pagamentos.datas_valores_identificados),
        sinais_de_edicao_ou_layout_incompativel: toStringArray(pagamentos.sinais_de_edicao_ou_layout_incompativel),
        pontos_de_atencao: toStringArray(pagamentos.pontos_de_atencao)
      },
      prints_tela: {
        existem: toBoolean(prints.existem),
        compatibilidade_com_plataforma_alegada: prudentialText(
          prints.compatibilidade_com_plataforma_alegada,
          "Inconclusivo com o material atual."
        ),
        ["qualidade_probat\u00f3ria"]: normalizeQualidadePrint(prints["qualidade_probat\u00f3ria"] ?? prints.qualidade_probatoria),
        sinais_de_edicao_ou_recorte: toStringArray(prints.sinais_de_edicao_ou_recorte),
        pontos_de_atencao: toStringArray(prints.pontos_de_atencao)
      },
      outros_documentos: normalizeOutrosDocumentos(tipoDocumental.outros_documentos)
    },
    mapa_documental_autor: normalizeMapaDocumental(source.mapa_documental_autor, source),
    priorizacao_estrategica: normalizePriorizacao(source.priorizacao_estrategica, source),
    fatos_supervenientes_ou_da_emenda: normalizeFatosSupervenientes(source.fatos_supervenientes_ou_da_emenda),
    suficiencia_probatoria: {
      conclusao: normalizeSuficiencia(suficiencia.conclusao),
      provas_fortes: toStringArray(suficiencia.provas_fortes),
      provas_fracas_ou_unilaterais: toStringArray(suficiencia.provas_fracas_ou_unilaterais ?? legacyFindings),
      documentos_chave_ausentes: toStringArray(suficiencia.documentos_chave_ausentes ?? legacyDocuments),
      observacoes: prudentialText(
        suficiencia.observacoes,
        "A suficiencia probatoria foi estimada a partir do material processado nesta etapa."
      )
    },
    pedido_indenizatorio: {
      dano_material_tem_prova_minima: normalizeYesPartialNo(pedidoIndenizatorio.dano_material_tem_prova_minima),
      valor_pedido_tem_suporte_documental: normalizeYesPartialNo(pedidoIndenizatorio.valor_pedido_tem_suporte_documental),
      dano_moral_tem_base_fatica_individualizada: normalizeYesPartialNo(
        pedidoIndenizatorio.dano_moral_tem_base_fatica_individualizada
      ),
      despesas_extraordinarias_comprovadas: toStringArray(pedidoIndenizatorio.despesas_extraordinarias_comprovadas),
      lacunas: toStringArray(pedidoIndenizatorio.lacunas ?? source.lacunas_iniciais)
    },
    compatibilidade_canal_documento: {
      alegacoes_vs_canais_comprovados: toStringArray(canalDocumento.alegacoes_vs_canais_comprovados),
      prova_de_contratacao: toStringArray(canalDocumento.prova_de_contratacao),
      prova_de_tentativa: toStringArray(canalDocumento.prova_de_tentativa),
      prova_de_oferta_ou_pre_reserva: toStringArray(canalDocumento.prova_de_oferta_ou_pre_reserva),
      mera_consulta_ou_print_inconclusivo: toStringArray(canalDocumento.mera_consulta_ou_print_inconclusivo)
    },
    integridade_tecnica_arquivos: {
      sinais_possiveis_de_manipulacao: toStringArray(integridade.sinais_possiveis_de_manipulacao),
      limitacoes_da_analise: toStringArray(integridade.limitacoes_da_analise).length
        ? toStringArray(integridade.limitacoes_da_analise)
        : [
          "Analise restrita ao texto extraido e aos metadados disponibilizados.",
            "Ainda pode haver perda de detalhes visuais em documentos complexos."
          ],
      necessita_validacao_humana:
        typeof integridade.necessita_validacao_humana === "boolean"
          ? integridade.necessita_validacao_humana
          : true
    },
    representacao_processual: {
      regularidade_aparente: normalizeRegularidade(representacao.regularidade_aparente),
      pontos_de_atencao: toStringArray(representacao.pontos_de_atencao),
      autores_sem_procuracao_ou_documento: toStringArray(representacao.autores_sem_procuracao_ou_documento)
    },
    espacialidade: {
      cidades_enderecos_identificados: toStringArray(espacialidade.cidades_enderecos_identificados),
      inconsistencias_territoriais: toStringArray(espacialidade.inconsistencias_territoriais),
      observacoes: prudentialText(
        espacialidade.observacoes,
        "Elementos territoriais avaliados a partir do material processado."
      )
    },
    indicios_litigancia_padronizada: {
      indicios: toStringArray(litigancia.indicios),
      elementos_recorrentes: toStringArray(litigancia.elementos_recorrentes),
      observacoes: prudentialText(
        litigancia.observacoes,
        "Nao inferir padronizacao sem apoio concreto no proprio material do caso."
      )
    },
    pontos_exploraveis_defesa: normalizePontosExploraveis(source.pontos_exploraveis_defesa, source),
    documentos_internos_recomendados_para_defesa:
      toStringArray(source.documentos_internos_recomendados_para_defesa).length
        ? toStringArray(source.documentos_internos_recomendados_para_defesa)
        : legacyDocuments,
    alertas_de_nao_conclusao: toStringArray(source.alertas_de_nao_conclusao).length
      ? toStringArray(source.alertas_de_nao_conclusao)
      : [
          "Quando um elemento depender de analise visual, pericial ou documental complementar, a conclusao deve ser tratada como nao verificavel ou dependente de validacao humana."
        ]
  });

  return enrichPreAnalysisReport(normalized);
}
