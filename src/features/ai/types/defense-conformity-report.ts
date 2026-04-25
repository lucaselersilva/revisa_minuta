import { z } from "zod";

const conformityStatusSchema = z.enum(["CONFORME", "INCOMPLETO", "AUSENTE", "N/A"]);
const documentalRiskSchema = z.enum(["BAIXO", "MEDIO", "ALTO", "ATENCAO"]);
const recommendationPrioritySchema = z.enum(["URGENTE", "IMPORTANTE", "RELEVANTE", "CONSIDERAR"]);
const scoreRiskSchema = z.enum(["BAIXO", "MEDIO", "ALTO"]);

const criterionAnalysisSchema = z.object({
  criterio: z.string(),
  status: conformityStatusSchema,
  observacao: z.string(),
  trechos_autor_relevantes: z.array(z.string()),
  trechos_defesa_relevantes: z.array(z.string()),
  justificativa_status: z.string()
});

const unrebuttedRequestSchema = z.object({
  pedido: z.string(),
  situacao: z.string(),
  referencia_inicial: z.array(z.string()),
  referencia_defesa: z.array(z.string())
});

const documentaryAnalysisItemSchema = z.object({
  documento_referencia: z.string(),
  grupo_documental: z.enum([
    "documento_identidade",
    "comprovante_endereco",
    "print_sistema",
    "documento_financeiro",
    "procuracao",
    "outro"
  ]),
  achado: z.string(),
  risco: documentalRiskSchema,
  observacao: z.string(),
  potencial_uso_pela_defesa: z.string()
});

const recommendationItemSchema = z.object({
  prioridade: recommendationPrioritySchema,
  titulo: z.string(),
  descricao: z.string(),
  fundamento: z.string(),
  acao_sugerida: z.string()
});

export const defenseConformityReportSchema = z.object({
  header: z.object({
    titulo: z.string(),
    subtitulo: z.string(),
    processo: z.string().nullable(),
    juizo: z.string().nullable(),
    cliente: z.string().nullable(),
    escritorio: z.string().nullable(),
    gerado_em: z.string().nullable(),
    aviso: z.string()
  }),
  conformidade_contestacao: z.object({
    dados_formais: z.array(criterionAnalysisSchema),
    preliminares: z.array(criterionAnalysisSchema),
    merito: z.array(criterionAnalysisSchema),
    formato_do_escritorio: z.array(criterionAnalysisSchema)
  }),
  pedidos_da_inicial_nao_integralmente_rebatidos: z.array(unrebuttedRequestSchema),
  analise_autenticidade_documental: z.object({
    documentos_identidade: z.array(documentaryAnalysisItemSchema),
    comprovantes_endereco: z.array(documentaryAnalysisItemSchema),
    prints_sistema: z.array(documentaryAnalysisItemSchema),
    documentos_financeiros: z.array(documentaryAnalysisItemSchema),
    procuracoes: z.array(documentaryAnalysisItemSchema),
    outros: z.array(documentaryAnalysisItemSchema)
  }),
  pontuacao_geral: z.object({
    contestacao: z.object({
      conformes: z.number().int().nonnegative(),
      incompletos: z.number().int().nonnegative(),
      ausentes: z.number().int().nonnegative()
    }),
    documentacao_autor: z.object({
      sem_indicios: z.number().int().nonnegative(),
      risco_medio: z.number().int().nonnegative(),
      risco_alto: z.number().int().nonnegative(),
      atencao: z.number().int().nonnegative()
    }),
    pontuacao_geral: z.number().min(0).max(100),
    risco_geral: scoreRiskSchema
  }),
  recomendacoes_prioritarias: z.array(recommendationItemSchema),
  disclaimers: z.array(z.string())
});

export type DefenseConformityReportOutput = z.infer<typeof defenseConformityReportSchema>;

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

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((item) => cleanText(item)).filter(Boolean))];
}

function toInteger(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function toScore(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Number(value.toFixed(2))));
  }

  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Number(parsed.toFixed(2)))) : 0;
}

function normalizeStatus(value: unknown): z.infer<typeof conformityStatusSchema> {
  const text = cleanText(value).toUpperCase();
  if (text === "CONFORME" || text === "INCOMPLETO" || text === "AUSENTE" || text === "N/A") {
    return text;
  }

  if (text === "NA") {
    return "N/A";
  }

  return "INCOMPLETO";
}

function normalizeRisk(value: unknown): z.infer<typeof documentalRiskSchema> {
  const text = cleanText(value).toUpperCase();
  if (text === "BAIXO" || text === "MEDIO" || text === "ALTO" || text === "ATENCAO") {
    return text;
  }

  return "ATENCAO";
}

function normalizePriority(value: unknown): z.infer<typeof recommendationPrioritySchema> {
  const text = cleanText(value).toUpperCase();
  if (text === "URGENTE" || text === "IMPORTANTE" || text === "RELEVANTE" || text === "CONSIDERAR") {
    return text;
  }

  return "RELEVANTE";
}

function normalizeScoreRisk(value: unknown): z.infer<typeof scoreRiskSchema> {
  const text = cleanText(value).toUpperCase();
  if (text === "BAIXO" || text === "MEDIO" || text === "ALTO") {
    return text;
  }

  return "MEDIO";
}

function normalizeCriterionItem(value: unknown) {
  const record = isRecord(value) ? value : {};

  return {
    criterio: cleanText(record.criterio) || "Criterio nao identificado",
    status: normalizeStatus(record.status),
    observacao: cleanText(record.observacao),
    trechos_autor_relevantes: toStringArray(record.trechos_autor_relevantes),
    trechos_defesa_relevantes: toStringArray(record.trechos_defesa_relevantes),
    justificativa_status: cleanText(record.justificativa_status)
  };
}

function normalizeUnrebuttedRequestItem(value: unknown) {
  const record = isRecord(value) ? value : {};

  return {
    pedido: cleanText(record.pedido) || "Pedido nao identificado",
    situacao: cleanText(record.situacao),
    referencia_inicial: toStringArray(record.referencia_inicial),
    referencia_defesa: toStringArray(record.referencia_defesa)
  };
}

function normalizeDocumentaryAnalysisItem(value: unknown) {
  const record = isRecord(value) ? value : {};
  const normalizedGroup = (() => {
    const group = cleanText(record.grupo_documental);
    if (
      group === "documento_identidade" ||
      group === "comprovante_endereco" ||
      group === "print_sistema" ||
      group === "documento_financeiro" ||
      group === "procuracao" ||
      group === "outro"
    ) {
      return group;
    }

    return "outro";
  })();

  return {
    documento_referencia: cleanText(record.documento_referencia) || "Documento nao identificado",
    grupo_documental: normalizedGroup,
    achado: cleanText(record.achado),
    risco: normalizeRisk(record.risco),
    observacao: cleanText(record.observacao),
    potencial_uso_pela_defesa: cleanText(record.potencial_uso_pela_defesa)
  };
}

function normalizeRecommendationItem(value: unknown) {
  const record = isRecord(value) ? value : {};

  return {
    prioridade: normalizePriority(record.prioridade),
    titulo: cleanText(record.titulo) || "Recomendacao operacional",
    descricao: cleanText(record.descricao),
    fundamento: cleanText(record.fundamento),
    acao_sugerida: cleanText(record.acao_sugerida)
  };
}

function normalizeCriterionList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => normalizeCriterionItem(item)) : [];
}

function normalizeDocumentaryList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => normalizeDocumentaryAnalysisItem(item)) : [];
}

export function normalizeDefenseConformityReportPayload(payload: unknown): DefenseConformityReportOutput {
  const source = isRecord(payload) ? payload : {};
  const header = isRecord(source.header) ? source.header : {};
  const conformity = isRecord(source.conformidade_contestacao) ? source.conformidade_contestacao : {};
  const documentary = isRecord(source.analise_autenticidade_documental) ? source.analise_autenticidade_documental : {};
  const scoring = isRecord(source.pontuacao_geral) ? source.pontuacao_geral : {};
  const scoringDefense = isRecord(scoring.contestacao) ? scoring.contestacao : {};
  const scoringAuthorDocs = isRecord(scoring.documentacao_autor) ? scoring.documentacao_autor : {};

  return defenseConformityReportSchema.parse({
    header: {
      titulo: cleanText(header.titulo) || "RELATORIO DE CONFORMIDADE DA DEFESA",
      subtitulo:
        cleanText(header.subtitulo) || "Analise cruzada entre peticao inicial, emenda, documentos do autor e contestacao.",
      processo: cleanNullableText(header.processo),
      juizo: cleanNullableText(header.juizo),
      cliente: cleanNullableText(header.cliente),
      escritorio: cleanNullableText(header.escritorio),
      gerado_em: cleanNullableText(header.gerado_em),
      aviso:
        cleanText(header.aviso) ||
        "Este relatorio tem carater tecnico-juridico interno de apoio a defesa e nao substitui revisao humana qualificada."
    },
    conformidade_contestacao: {
      dados_formais: normalizeCriterionList(conformity.dados_formais),
      preliminares: normalizeCriterionList(conformity.preliminares),
      merito: normalizeCriterionList(conformity.merito),
      formato_do_escritorio: normalizeCriterionList(conformity.formato_do_escritorio)
    },
    pedidos_da_inicial_nao_integralmente_rebatidos: Array.isArray(source.pedidos_da_inicial_nao_integralmente_rebatidos)
      ? source.pedidos_da_inicial_nao_integralmente_rebatidos.map((item) => normalizeUnrebuttedRequestItem(item))
      : [],
    analise_autenticidade_documental: {
      documentos_identidade: normalizeDocumentaryList(documentary.documentos_identidade),
      comprovantes_endereco: normalizeDocumentaryList(documentary.comprovantes_endereco),
      prints_sistema: normalizeDocumentaryList(documentary.prints_sistema),
      documentos_financeiros: normalizeDocumentaryList(documentary.documentos_financeiros),
      procuracoes: normalizeDocumentaryList(documentary.procuracoes),
      outros: normalizeDocumentaryList(documentary.outros)
    },
    pontuacao_geral: {
      contestacao: {
        conformes: toInteger(scoringDefense.conformes),
        incompletos: toInteger(scoringDefense.incompletos),
        ausentes: toInteger(scoringDefense.ausentes)
      },
      documentacao_autor: {
        sem_indicios: toInteger(scoringAuthorDocs.sem_indicios),
        risco_medio: toInteger(scoringAuthorDocs.risco_medio),
        risco_alto: toInteger(scoringAuthorDocs.risco_alto),
        atencao: toInteger(scoringAuthorDocs.atencao)
      },
      pontuacao_geral: toScore(scoring.pontuacao_geral),
      risco_geral: normalizeScoreRisk(scoring.risco_geral)
    },
    recomendacoes_prioritarias: Array.isArray(source.recomendacoes_prioritarias)
      ? source.recomendacoes_prioritarias.map((item) => normalizeRecommendationItem(item))
      : [],
    disclaimers: toStringArray(source.disclaimers)
  });
}
