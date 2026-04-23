import { z } from "zod";

export const preAnalysisSeveritySchema = z.enum(["low", "medium", "high"]);

export const preAnalysisReportSchema = z.object({
  resumo_estruturado_do_caso: z.string().min(10),
  pedidos_identificados: z.array(
    z.object({
      item: z.string().min(2),
      observacao: z.string().optional()
    })
  ),
  principais_inconsistencias_documentais: z.array(
    z.object({
      item: z.string().min(2),
      severidade: preAnalysisSeveritySchema,
      fundamento_documental: z.string().optional()
    })
  ),
  pontos_de_atencao_para_a_defesa: z.array(
    z.object({
      item: z.string().min(2),
      severidade: preAnalysisSeveritySchema
    })
  ),
  documentos_recomendados: z.array(
    z.object({
      item: z.string().min(2),
      justificativa: z.string().optional()
    })
  ),
  riscos_preliminares: z.array(
    z.object({
      item: z.string().min(2),
      severidade: preAnalysisSeveritySchema,
      observacao: z.string().optional()
    })
  ),
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

function normalizeSeverity(value: unknown): "low" | "medium" | "high" {
  const normalized = cleanText(value).toLowerCase();

  if (["high", "alta", "alto", "grave", "critica", "crítico", "crítico", "critico"].includes(normalized)) {
    return "high";
  }

  if (["medium", "media", "média", "moderada", "moderado"].includes(normalized)) {
    return "medium";
  }

  return "low";
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return cleanText(item);
        }

        if (isRecord(item)) {
          return pickFirstText(item, ["item", "texto", "descricao", "descrição", "observacao", "observação"]);
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

    const single = pickFirstText(value, ["itens", "items", "lista", "texto", "descricao", "descrição", "observacao", "observação"]);
    return single ? [single] : [];
  }

  const single = cleanText(value);
  return single ? [single] : [];
}

function toItemWithOptionalTextArray(
  value: unknown,
  extraKeyCandidates: string[]
): Array<{ item: string; extraText?: string }> {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          const text = cleanText(item);
          return text ? { item: text } : null;
        }

        if (!isRecord(item)) {
          return null;
        }

        const mainItem = pickFirstText(item, ["item", "titulo", "título", "nome", "texto", "descricao", "descrição"]);
        const extraText = pickFirstText(item, extraKeyCandidates);
        const fallbackItem = mainItem || extraText;

        return fallbackItem ? { item: fallbackItem, extraText: extraText || undefined } : null;
      })
      .filter((item): item is { item: string; extraText?: string } => Boolean(item));
  }

  if (isRecord(value)) {
    const nestedArray = Object.values(value).find(Array.isArray);
    if (nestedArray) {
      return toItemWithOptionalTextArray(nestedArray, extraKeyCandidates);
    }

    const mainItem = pickFirstText(value, ["item", "titulo", "título", "nome", "texto", "descricao", "descrição"]);
    const extraText = pickFirstText(value, extraKeyCandidates);
    const fallbackItem = mainItem || extraText;

    return fallbackItem ? [{ item: fallbackItem, extraText: extraText || undefined }] : [];
  }

  const single = cleanText(value);
  return single ? [{ item: single }] : [];
}

function toSeverityItemArray(
  value: unknown,
  detailKeyCandidates: string[]
): Array<{ item: string; severidade: "low" | "medium" | "high"; detail?: string }> {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          const text = cleanText(item);
          return text ? { item: text, severidade: "medium" as const } : null;
        }

        if (!isRecord(item)) {
          return null;
        }

        const mainItem = pickFirstText(item, ["item", "titulo", "título", "nome", "texto", "descricao", "descrição"]);
        const detail = pickFirstText(item, detailKeyCandidates);
        const fallbackItem = mainItem || detail;

        return fallbackItem
          ? {
              item: fallbackItem,
              severidade: normalizeSeverity(item.severidade ?? item.severity ?? item.nivel ?? item.nível),
              detail: detail || undefined
            }
          : null;
      })
      .filter((item): item is { item: string; severidade: "low" | "medium" | "high"; detail?: string } => Boolean(item));
  }

  if (isRecord(value)) {
    const nestedArray = Object.values(value).find(Array.isArray);
    if (nestedArray) {
      return toSeverityItemArray(nestedArray, detailKeyCandidates);
    }

    const mainItem = pickFirstText(value, ["item", "titulo", "título", "nome", "texto", "descricao", "descrição"]);
    const detail = pickFirstText(value, detailKeyCandidates);
    const fallbackItem = mainItem || detail;

    return fallbackItem
      ? [
          {
            item: fallbackItem,
            severidade: normalizeSeverity(value.severidade ?? value.severity ?? value.nivel ?? value.nível),
            detail: detail || undefined
          }
        ]
      : [];
  }

  const single = cleanText(value);
  return single ? [{ item: single, severidade: "medium" }] : [];
}

export function normalizePreAnalysisReportPayload(payload: unknown): PreAnalysisReportOutput {
  const source = isRecord(payload) ? payload : {};

  const normalizedPayload = {
    resumo_estruturado_do_caso: (() => {
      if (typeof source.resumo_estruturado_do_caso === "string") {
        return cleanText(source.resumo_estruturado_do_caso);
      }

      if (isRecord(source.resumo_estruturado_do_caso)) {
        return pickFirstText(source.resumo_estruturado_do_caso, [
          "texto",
          "resumo",
          "conteudo",
          "conteúdo",
          "descricao",
          "descrição"
        ]);
      }

      return "";
    })(),
    pedidos_identificados: toItemWithOptionalTextArray(source.pedidos_identificados, [
      "observacao",
      "observação",
      "detalhe",
      "detalhes"
    ]).map((item) => ({
      item: item.item,
      observacao: item.extraText
    })),
    principais_inconsistencias_documentais: toSeverityItemArray(source.principais_inconsistencias_documentais, [
      "fundamento_documental",
      "fundamento",
      "justificativa",
      "detalhe",
      "detalhes"
    ]).map((item) => ({
      item: item.item,
      severidade: item.severidade,
      fundamento_documental: item.detail
    })),
    pontos_de_atencao_para_a_defesa: toSeverityItemArray(source.pontos_de_atencao_para_a_defesa, [
      "detalhe",
      "detalhes",
      "justificativa"
    ]).map((item) => ({
      item: item.item,
      severidade: item.severidade
    })),
    documentos_recomendados: toItemWithOptionalTextArray(source.documentos_recomendados, [
      "justificativa",
      "motivo",
      "detalhe",
      "detalhes"
    ]).map((item) => ({
      item: item.item,
      justificativa: item.extraText
    })),
    riscos_preliminares: toSeverityItemArray(source.riscos_preliminares, [
      "observacao",
      "observação",
      "detalhe",
      "detalhes"
    ]).map((item) => ({
      item: item.item,
      severidade: item.severidade,
      observacao: item.detail
    })),
    observacoes_gerais: toStringArray(source.observacoes_gerais)
  };

  return preAnalysisReportSchema.parse(normalizedPayload);
}
