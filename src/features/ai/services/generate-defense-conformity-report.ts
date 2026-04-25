import {
  buildDefenseConformitySystemPrompt,
  buildDefenseConformityUserPrompt,
  DEFENSE_CONFORMITY_PROMPT_VERSION
} from "@/features/ai/prompts/defense-conformity-prompt";
import { generateStructuredAnthropicResponse } from "@/features/ai/clients/anthropic-client";
import { renderDefenseConformityMarkdown } from "@/features/ai/services/render-defense-conformity-markdown";
import { normalizeDefenseConformityReportPayload } from "@/features/ai/types/defense-conformity-report";
import { getCaseById } from "@/features/cases/queries/get-cases";
import { buildDefenseConformityContext } from "@/features/document-ingestion/services/build-defense-conformity-context";
import type { Profile } from "@/types/database";

const DEFENSE_CONFORMITY_MAX_TOKENS = 7000;

function extractJsonPayload(text: string) {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("A resposta da IA nao trouxe JSON valido.");
  }

  return trimmed.slice(start, end + 1);
}

function tryParseJsonPayload(text: string) {
  return JSON.parse(extractJsonPayload(text));
}

async function repairDefenseConformityJson(rawText: string) {
  const repairResponse = await generateStructuredAnthropicResponse({
    systemPrompt: [
      "Voce atua como reparador tecnico de JSON.",
      "Recebera uma resposta que deveria ser um JSON estrito, mas veio com erro sintatico.",
      "Sua tarefa e devolver apenas um JSON valido.",
      "Nao resuma, nao explique, nao adicione markdown e nao altere o conteudo material alem do minimo necessario para corrigir a sintaxe.",
      "Preserve as mesmas chaves e a mesma estrutura sem inventar informacoes ausentes."
    ].join(" "),
    userPrompt: ["Converta o conteudo abaixo em JSON estrito valido.", "Retorne somente o JSON reparado.", rawText].join("\n\n"),
    maxTokens: DEFENSE_CONFORMITY_MAX_TOKENS
  });

  return tryParseJsonPayload(repairResponse.text);
}

async function parseDefenseConformityResponse(text: string) {
  try {
    return tryParseJsonPayload(text);
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    if (!error.message.includes("JSON")) {
      throw error;
    }

    return repairDefenseConformityJson(text);
  }
}

function formatDefenseConformityFailureMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Falha desconhecida ao gerar o relatorio de conformidade.";
  }

  const message = error.message;

  if (message.includes("ANTHROPIC_API_KEY")) {
    return "A chave da Anthropic nao esta configurada no ambiente.";
  }

  if (message.includes("Falha ao chamar Anthropic")) {
    return `A Anthropic recusou a geracao do relatorio. Detalhe tecnico: ${message}`;
  }

  if (message.includes("JSON valido") || message.includes("Expected") || message.includes("ZodError")) {
    return "A resposta da IA nao veio no formato estruturado esperado para o relatorio de conformidade.";
  }

  return message;
}

export async function generateDefenseConformityReport(caseId: string, profile: Profile) {
  const [caseItem, context] = await Promise.all([getCaseById(caseId), buildDefenseConformityContext(caseId)]);

  if (!caseItem || caseItem.office_id !== profile.office_id) {
    return { ok: false, message: "Processo nao encontrado." };
  }

  if (!context) {
    return { ok: false, message: "Ainda nao foi possivel montar o contexto do relatorio de conformidade." };
  }

  if (context.metrics.initialProcessedCount === 0) {
    return {
      ok: false,
      message: "A fase inicial ainda nao tem documentos processados suficientes para o relatorio de conformidade."
    };
  }

  if (context.metrics.defenseProcessedCount === 0) {
    return {
      ok: false,
      message: "A defesa ainda nao tem documentos processados. Processe a contestacao e os anexos defensivos antes de gerar o relatorio."
    };
  }

  try {
    const response = await generateStructuredAnthropicResponse({
      systemPrompt: buildDefenseConformitySystemPrompt(),
      userPrompt: buildDefenseConformityUserPrompt(context.promptContext),
      maxTokens: DEFENSE_CONFORMITY_MAX_TOKENS
    });

    const parsedJson = await parseDefenseConformityResponse(response.text);
    const report = normalizeDefenseConformityReportPayload(parsedJson);
    const reportMarkdown = renderDefenseConformityMarkdown(report);

    return {
      ok: true,
      message: "Relatorio de conformidade gerado em memoria.",
      promptVersion: DEFENSE_CONFORMITY_PROMPT_VERSION,
      modelName: response.modelName,
      inputSummary: context.inputSummary,
      report,
      reportMarkdown
    };
  } catch (error) {
    return {
      ok: false,
      message: formatDefenseConformityFailureMessage(error)
    };
  }
}
