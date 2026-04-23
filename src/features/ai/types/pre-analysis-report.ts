import { z } from "zod";

export const preAnalysisRiskSchema = z.enum(["low", "medium", "high"]);
export const preAnalysisPrioritySchema = z.enum(["urgent", "important", "relevant", "consider"]);

const preAnalysisHeaderSchema = z.object({
  titulo_relatorio: z.string().min(5),
  subtitulo: z.string().min(5),
  aviso: z.string().min(10)
});

const preAnalysisDiagnosticSchema = z.object({
  resumo_executivo: z.string().min(10),
  pedidos_identificados: z.array(
    z.object({
      pedido: z.string().min(2),
      observacao: z.string().optional()
    })
  ),
  fatos_relevantes: z.array(z.string().min(2)),
  lacunas_iniciais: z.array(z.string().min(2))
});

const preAnalysisDocumentFindingSchema = z.object({
  documento: z.string().min(2),
  achado: z.string().min(2),
  risco: preAnalysisRiskSchema,
  observacao: z.string().min(2)
});

const preAnalysisDocumentSectionSchema = z.object({
  secao: z.string().min(2),
  descricao: z.string().optional(),
  itens: z.array(preAnalysisDocumentFindingSchema)
});

const preAnalysisDefenseAttentionSchema = z.object({
  titulo: z.string().min(2),
  prioridade: preAnalysisPrioritySchema,
  explicacao: z.string().min(2),
  fundamento_documental: z.string().optional(),
  impacto_para_defesa: z.string().optional()
});

const preAnalysisRecommendedDocumentSchema = z.object({
  documento: z.string().min(2),
  prioridade: preAnalysisPrioritySchema,
  justificativa: z.string().min(2)
});

const preAnalysisRiskItemSchema = z.object({
  titulo: z.string().min(2),
  severidade: preAnalysisRiskSchema,
  observacao: z.string().min(2)
});

const preAnalysisSummarySchema = z.object({
  nivel_geral_de_alerta: preAnalysisRiskSchema,
  sintese_final: z.string().min(10)
});

export const preAnalysisReportSchema = z.object({
  cabecalho_relatorio: preAnalysisHeaderSchema,
  quadro_resumo: preAnalysisSummarySchema,
  diagnostico_inicial: preAnalysisDiagnosticSchema,
  analise_documental_do_autor: z.array(preAnalysisDocumentSectionSchema),
  pontos_de_atencao_para_a_defesa: z.array(preAnalysisDefenseAttentionSchema),
  documentos_recomendados: z.array(preAnalysisRecommendedDocumentSchema),
  riscos_preliminares: z.array(preAnalysisRiskItemSchema),
  observacoes_gerais: z.array(z.string().min(2))
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

function pickFirstText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = cleanText(record[key]);
    if (value) {
      return value;
    }
  }

  return "";
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return cleanText(item);
        }

        if (isRecord(item)) {
          return pickFirstText(item, ["item", "texto", "descricao", "descricao_curta", "observacao"]);
        }

        return "";
      })
      .filter((item) => item.length >= 2);
  }

  if (isRecord(value)) {
    const nestedArray = Object.values(value).find(Array.isArray);
    if (nestedArray) {
      return toStringArray(nestedArray);
    }

    const single = pickFirstText(value, ["item", "texto", "descricao", "observacao"]);
    return single ? [single] : [];
  }

  const single = cleanText(value);
  return single ? [single] : [];
}

function normalizeRisk(value: unknown): "low" | "medium" | "high" {
  const normalized = cleanText(value).toLowerCase();

  if (["high", "alta", "alto", "grave", "critico", "critica", "urgente"].includes(normalized)) {
    return "high";
  }

  if (["medium", "media", "medio", "moderado", "moderada", "importante", "relevante"].includes(normalized)) {
    return "medium";
  }

  return "low";
}

function normalizePriority(value: unknown): "urgent" | "important" | "relevant" | "consider" {
  const normalized = cleanText(value).toLowerCase();

  if (["urgent", "urgente", "critico", "critica"].includes(normalized)) {
    return "urgent";
  }

  if (["important", "importante", "alto"].includes(normalized)) {
    return "important";
  }

  if (["relevant", "relevante", "medio", "media", "moderado", "moderada"].includes(normalized)) {
    return "relevant";
  }

  return "consider";
}

function toPedidoArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          const pedido = cleanText(item);
          return pedido ? { pedido } : null;
        }

        if (!isRecord(item)) {
          return null;
        }

        const pedido = pickFirstText(item, ["pedido", "item", "titulo", "texto", "descricao"]);
        const observacao = pickFirstText(item, ["observacao", "detalhe", "detalhes"]);
        return pedido ? { pedido, observacao: observacao || undefined } : null;
      })
      .filter((item): item is { pedido: string; observacao?: string } => Boolean(item));
  }

  if (isRecord(value)) {
    const nestedArray = Object.values(value).find(Array.isArray);
    if (nestedArray) {
      return toPedidoArray(nestedArray);
    }

    const pedido = pickFirstText(value, ["pedido", "item", "titulo", "texto", "descricao"]);
    const observacao = pickFirstText(value, ["observacao", "detalhe", "detalhes"]);
    return pedido ? [{ pedido, observacao: observacao || undefined }] : [];
  }

  const pedido = cleanText(value);
  return pedido ? [{ pedido }] : [];
}

function toDocumentFindingArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          const achado = cleanText(item);
          return achado
            ? {
                documento: "Documento nao especificado",
                achado,
                risco: "medium" as const,
                observacao: achado
              }
            : null;
        }

        if (!isRecord(item)) {
          return null;
        }

        const documento = pickFirstText(item, ["documento", "arquivo", "fonte", "evidencia"]);
        const achado = pickFirstText(item, ["achado", "item", "titulo", "texto", "descricao"]);
        const observacao = pickFirstText(item, [
          "observacao",
          "fundamento_documental",
          "fundamento",
          "detalhe",
          "detalhes",
          "justificativa"
        ]);

        const resolvedAchado = achado || observacao;
        if (!resolvedAchado) {
          return null;
        }

        return {
          documento: documento || "Documento nao especificado",
          achado: resolvedAchado,
          risco: normalizeRisk(item.risco ?? item.severidade ?? item.severity),
          observacao: observacao || resolvedAchado
        };
      })
      .filter(
        (
          item
        ): item is {
          documento: string;
          achado: string;
          risco: "low" | "medium" | "high";
          observacao: string;
        } => Boolean(item)
      );
  }

  if (isRecord(value)) {
    const nestedArray = Object.values(value).find(Array.isArray);
    if (nestedArray) {
      return toDocumentFindingArray(nestedArray);
    }

    return toDocumentFindingArray([value]);
  }

  const achado = cleanText(value);
  return achado
    ? [
        {
          documento: "Documento nao especificado",
          achado,
          risco: "medium",
          observacao: achado
        }
      ]
    : [];
}

function toDocumentSectionArray(value: unknown, source: Record<string, unknown>) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!isRecord(item)) {
          const findings = toDocumentFindingArray(item);
          return findings.length
            ? {
                secao: "Achados documentais",
                itens: findings
              }
            : null;
        }

        const secao = pickFirstText(item, ["secao", "titulo", "nome", "categoria"]);
        const descricao = pickFirstText(item, ["descricao", "subtitulo", "observacao"]);
        const itens = toDocumentFindingArray(item.itens ?? item.achados ?? item.documentos ?? item.lista);

        if (!itens.length) {
          return null;
        }

        return {
          secao: secao || "Achados documentais",
          descricao: descricao || undefined,
          itens
        };
      })
      .filter(
        (
          item
        ): item is {
          secao: string;
          descricao?: string;
          itens: Array<{
            documento: string;
            achado: string;
            risco: "low" | "medium" | "high";
            observacao: string;
          }>;
        } => Boolean(item)
      );
  }

  if (isRecord(value)) {
    const nestedArray = Object.values(value).find(Array.isArray);
    if (nestedArray) {
      return toDocumentSectionArray(nestedArray, source);
    }
  }

  const legacyFindings = toDocumentFindingArray(
    source.principais_inconsistencias_documentais ?? source.achados_documentais ?? source.inconsistencias_documentais
  );

  return legacyFindings.length
    ? [
        {
          secao: "Achados documentais prioritarios",
          descricao: "Leitura inicial dos documentos juntados pelo autor.",
          itens: legacyFindings
        }
      ]
    : [];
}

function toAttentionArray(value: unknown, source: Record<string, unknown>) {
  const rawValue =
    value ?? source.pontos_de_atencao_para_a_defesa ?? source.achados_prioritarios ?? source.recomendacoes_prioritarias;

  if (Array.isArray(rawValue)) {
    return rawValue
      .map((item) => {
        if (typeof item === "string") {
          const titulo = cleanText(item);
          return titulo
            ? {
                titulo,
                prioridade: "relevant" as const,
                explicacao: titulo
              }
            : null;
        }

        if (!isRecord(item)) {
          return null;
        }

        const titulo = pickFirstText(item, ["titulo", "item", "nome", "achado", "texto", "pedido"]);
        const explicacao = pickFirstText(item, ["explicacao", "observacao", "detalhe", "detalhes", "justificativa"]);
        const fundamento = pickFirstText(item, ["fundamento_documental", "fundamento", "evidencia"]);
        const impacto = pickFirstText(item, ["impacto_para_defesa", "impacto", "acao_recomendada", "recomendacao"]);

        const resolvedTitulo = titulo || explicacao;
        if (!resolvedTitulo) {
          return null;
        }

        return {
          titulo: resolvedTitulo,
          prioridade: normalizePriority(item.prioridade ?? item.severidade ?? item.severity),
          explicacao: explicacao || resolvedTitulo,
          fundamento_documental: fundamento || undefined,
          impacto_para_defesa: impacto || undefined
        };
      })
      .filter(
        (
          item
        ): item is {
          titulo: string;
          prioridade: "urgent" | "important" | "relevant" | "consider";
          explicacao: string;
          fundamento_documental?: string;
          impacto_para_defesa?: string;
        } => Boolean(item)
      );
  }

  if (isRecord(rawValue)) {
    const nestedArray = Object.values(rawValue).find(Array.isArray);
    if (nestedArray) {
      return toAttentionArray(nestedArray, source);
    }

    return toAttentionArray([rawValue], source);
  }

  const single = cleanText(rawValue);
  return single
    ? [
        {
          titulo: single,
          prioridade: "relevant",
          explicacao: single
        }
      ]
    : [];
}

function toRecommendedDocumentArray(value: unknown, source: Record<string, unknown>) {
  const rawValue = value ?? source.documentos_recomendados;

  if (Array.isArray(rawValue)) {
    return rawValue
      .map((item) => {
        if (typeof item === "string") {
          const documento = cleanText(item);
          return documento
            ? {
                documento,
                prioridade: "relevant" as const,
                justificativa: "Documento recomendado para robustecer a defesa."
              }
            : null;
        }

        if (!isRecord(item)) {
          return null;
        }

        const documento = pickFirstText(item, ["documento", "item", "nome", "titulo", "texto"]);
        const justificativa = pickFirstText(item, ["justificativa", "observacao", "detalhe", "detalhes", "motivo"]);

        return documento
          ? {
              documento,
              prioridade: normalizePriority(item.prioridade ?? item.severidade ?? item.severity),
              justificativa: justificativa || "Documento recomendado para robustecer a defesa."
            }
          : null;
      })
      .filter(
        (
          item
        ): item is {
          documento: string;
          prioridade: "urgent" | "important" | "relevant" | "consider";
          justificativa: string;
        } => Boolean(item)
      );
  }

  if (isRecord(rawValue)) {
    const nestedArray = Object.values(rawValue).find(Array.isArray);
    if (nestedArray) {
      return toRecommendedDocumentArray(nestedArray, source);
    }

    return toRecommendedDocumentArray([rawValue], source);
  }

  const documento = cleanText(rawValue);
  return documento
    ? [
        {
          documento,
          prioridade: "relevant",
          justificativa: "Documento recomendado para robustecer a defesa."
        }
      ]
    : [];
}

function toRiskArray(value: unknown, source: Record<string, unknown>) {
  const rawValue = value ?? source.riscos_preliminares;

  if (Array.isArray(rawValue)) {
    return rawValue
      .map((item) => {
        if (typeof item === "string") {
          const titulo = cleanText(item);
          return titulo
            ? {
                titulo,
                severidade: "medium" as const,
                observacao: titulo
              }
            : null;
        }

        if (!isRecord(item)) {
          return null;
        }

        const titulo = pickFirstText(item, ["titulo", "item", "nome", "texto", "descricao"]);
        const observacao = pickFirstText(item, ["observacao", "detalhe", "detalhes", "justificativa"]);
        const resolvedTitulo = titulo || observacao;

        return resolvedTitulo
          ? {
              titulo: resolvedTitulo,
              severidade: normalizeRisk(item.severidade ?? item.severity ?? item.risco),
              observacao: observacao || resolvedTitulo
            }
          : null;
      })
      .filter(
        (
          item
        ): item is {
          titulo: string;
          severidade: "low" | "medium" | "high";
          observacao: string;
        } => Boolean(item)
      );
  }

  if (isRecord(rawValue)) {
    const nestedArray = Object.values(rawValue).find(Array.isArray);
    if (nestedArray) {
      return toRiskArray(nestedArray, source);
    }

    return toRiskArray([rawValue], source);
  }

  const titulo = cleanText(rawValue);
  return titulo
    ? [
        {
          titulo,
          severidade: "medium",
          observacao: titulo
        }
      ]
    : [];
}

function deriveOverallAlertLevel(source: {
  analise_documental_do_autor: Array<{ itens: Array<{ risco: string }> }>;
  pontos_de_atencao_para_a_defesa: Array<{ prioridade: string }>;
  riscos_preliminares: Array<{ severidade: string }>;
}) {
  const hasHighRisk =
    source.analise_documental_do_autor.some((section) => section.itens.some((item) => item.risco === "high")) ||
    source.riscos_preliminares.some((item) => item.severidade === "high") ||
    source.pontos_de_atencao_para_a_defesa.some((item) => item.prioridade === "urgent");

  if (hasHighRisk) {
    return "high" as const;
  }

  const hasMediumRisk =
    source.analise_documental_do_autor.some((section) => section.itens.some((item) => item.risco === "medium")) ||
    source.riscos_preliminares.some((item) => item.severidade === "medium") ||
    source.pontos_de_atencao_para_a_defesa.some((item) => item.prioridade === "important" || item.prioridade === "relevant");

  return hasMediumRisk ? ("medium" as const) : ("low" as const);
}

export function normalizePreAnalysisReportPayload(payload: unknown): PreAnalysisReportOutput {
  const source = isRecord(payload) ? payload : {};
  const headerSource = isRecord(source.cabecalho_relatorio) ? source.cabecalho_relatorio : {};
  const diagnosticSource = isRecord(source.diagnostico_inicial) ? source.diagnostico_inicial : {};
  const summarySource = isRecord(source.quadro_resumo) ? source.quadro_resumo : {};

  const normalizedPayload = {
    cabecalho_relatorio: {
      titulo_relatorio:
        pickFirstText(headerSource, ["titulo_relatorio", "titulo", "nome"]) || "Laudo previo operacional",
      subtitulo:
        pickFirstText(headerSource, ["subtitulo", "escopo", "descricao"]) ||
        "Analise inicial da demanda com foco em documentos do autor e preparacao da defesa.",
      aviso:
        pickFirstText(headerSource, ["aviso", "disclaimer", "nota"]) ||
        "Este laudo tem carater tecnico-operacional e deve ser revisado pelo advogado responsavel antes de qualquer estrategia defensiva."
    },
    diagnostico_inicial: {
      resumo_executivo:
        pickFirstText(diagnosticSource, ["resumo_executivo", "resumo", "texto", "descricao"]) ||
        (() => {
          if (typeof source.resumo_estruturado_do_caso === "string") {
            return cleanText(source.resumo_estruturado_do_caso);
          }

          if (isRecord(source.resumo_estruturado_do_caso)) {
            return pickFirstText(source.resumo_estruturado_do_caso, ["texto", "resumo", "descricao", "conteudo"]);
          }

          return "";
        })(),
      pedidos_identificados: toPedidoArray(diagnosticSource.pedidos_identificados ?? source.pedidos_identificados),
      fatos_relevantes: toStringArray(diagnosticSource.fatos_relevantes ?? source.fatos_relevantes),
      lacunas_iniciais: toStringArray(diagnosticSource.lacunas_iniciais ?? source.lacunas_iniciais)
    },
    analise_documental_do_autor: toDocumentSectionArray(source.analise_documental_do_autor, source),
    pontos_de_atencao_para_a_defesa: toAttentionArray(source.pontos_de_atencao_para_a_defesa, source),
    documentos_recomendados: toRecommendedDocumentArray(source.documentos_recomendados, source),
    riscos_preliminares: toRiskArray(source.riscos_preliminares, source),
    observacoes_gerais: toStringArray(source.observacoes_gerais)
  };

  const derivedAlertLevel = deriveOverallAlertLevel(normalizedPayload);

  const fullPayload = {
    ...normalizedPayload,
    quadro_resumo: {
      nivel_geral_de_alerta: cleanText(
        summarySource.nivel_geral_de_alerta || summarySource.risco_geral || summarySource.alerta_geral
      )
        ? normalizeRisk(summarySource.nivel_geral_de_alerta || summarySource.risco_geral || summarySource.alerta_geral)
        : derivedAlertLevel,
      sintese_final:
        pickFirstText(summarySource, ["sintese_final", "resumo_final", "conclusao", "texto"]) ||
        normalizedPayload.diagnostico_inicial.resumo_executivo
    }
  };

  return preAnalysisReportSchema.parse(fullPayload);
}
