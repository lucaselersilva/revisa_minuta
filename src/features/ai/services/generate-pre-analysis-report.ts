import { buildPreAnalysisSystemPrompt, buildPreAnalysisUserPrompt, PRE_ANALYSIS_PROMPT_VERSION } from "@/features/ai/prompts/pre-analysis-prompt";
import { generateStructuredAnthropicResponse } from "@/features/ai/clients/anthropic-client";
import { renderPreAnalysisMarkdown } from "@/features/ai/services/render-pre-analysis-markdown";
import { normalizePreAnalysisReportPayload } from "@/features/ai/types/pre-analysis-report";
import { getCaseById } from "@/features/cases/queries/get-cases";
import { writeCaseHistory } from "@/features/cases/services/case-history-service";
import { buildPreAnalysisContext } from "@/features/document-ingestion/services/build-pre-analysis-context";
import { getPreAnalysisSnapshot } from "@/features/document-ingestion/queries/get-pre-analysis-snapshot";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/services/audit-log-service";
import type { Profile } from "@/types/database";

const PRE_ANALYSIS_MAX_TOKENS = 7000;

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

async function repairPreAnalysisJson(rawText: string) {
  const repairResponse = await generateStructuredAnthropicResponse({
    systemPrompt: [
      "Voce atua como reparador tecnico de JSON.",
      "Recebera uma resposta que deveria ser um JSON estrito, mas veio com erro sintatico.",
      "Sua tarefa e devolver apenas um JSON valido.",
      "Nao resuma, nao explique, nao adicione markdown e nao altere o conteudo material alem do minimo necessario para corrigir a sintaxe.",
      "Preserve as mesmas chaves e a mesma estrutura sem inventar informacoes ausentes."
    ].join(" "),
    userPrompt: [
      "Converta o conteudo abaixo em JSON estrito valido.",
      "Retorne somente o JSON reparado.",
      rawText
    ].join("\n\n"),
    maxTokens: PRE_ANALYSIS_MAX_TOKENS
  });

  return tryParseJsonPayload(repairResponse.text);
}

async function parsePreAnalysisResponse(text: string) {
  try {
    return tryParseJsonPayload(text);
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    if (!error.message.includes("JSON")) {
      throw error;
    }

    return repairPreAnalysisJson(text);
  }
}

function formatPreAnalysisFailureMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Falha desconhecida ao gerar o laudo previo.";
  }

  const message = error.message;

  if (message.includes("ANTHROPIC_API_KEY")) {
    return "A chave da Anthropic nao esta configurada no ambiente.";
  }

  if (message.includes("Falha ao chamar Anthropic")) {
    return `A Anthropic recusou a geracao do laudo. Detalhe tecnico: ${message}`;
  }

  if (message.includes("JSON valido") || message.includes("Expected") || message.includes("ZodError")) {
    return "A resposta da IA nao veio no formato estruturado esperado para o laudo.";
  }

  return message;
}

export async function generatePreAnalysisReport(caseId: string, profile: Profile) {
  const [caseItem, snapshot, context] = await Promise.all([
    getCaseById(caseId),
    getPreAnalysisSnapshot(caseId),
    buildPreAnalysisContext(caseId)
  ]);

  if (!caseItem || caseItem.office_id !== profile.office_id) {
    return { ok: false, message: "Processo nao encontrado." };
  }

  if (!snapshot?.canGenerateReport || !context || context.metrics.processedCount === 0) {
    return { ok: false, message: "Ainda nao ha contexto minimo processado para gerar o laudo." };
  }

  const supabase = createAdminClient();
  const nextVersion = (snapshot.reports[0]?.version ?? 0) + 1;

  try {
    const response = await generateStructuredAnthropicResponse({
      systemPrompt: buildPreAnalysisSystemPrompt(),
      userPrompt: buildPreAnalysisUserPrompt(context.promptContext),
      maxTokens: PRE_ANALYSIS_MAX_TOKENS
    });

    const parsedJson = await parsePreAnalysisResponse(response.text);
    const report = normalizePreAnalysisReportPayload(parsedJson);
    const reportMarkdown = renderPreAnalysisMarkdown(report);

    const { data: createdReport, error } = await supabase
      .from("AA_pre_analysis_reports")
      .insert({
        office_id: profile.office_id,
        case_id: caseId,
        version: nextVersion,
        status: "completed",
        model_provider: "anthropic",
        model_name: response.modelName,
        input_summary: context.inputSummary,
        prompt_version: PRE_ANALYSIS_PROMPT_VERSION,
        report_json: report,
        report_markdown: reportMarkdown,
        generated_by: profile.id,
        generated_at: new Date().toISOString()
      })
      .select("id")
      .single<{ id: string }>();

    if (error) {
      return { ok: false, message: "Nao foi possivel salvar o laudo previo." };
    }

    await writeCaseHistory({
      caseId,
      action: nextVersion === 1 ? "pre_analysis.report.generated" : "pre_analysis.report.regenerated",
      profile,
      metadata: { report_id: createdReport.id, version: nextVersion }
    });

    await writeAuditLog({
      profile,
      action: nextVersion === 1 ? "pre_analysis.report.generated" : "pre_analysis.report.regenerated",
      entityType: "AA_pre_analysis_reports",
      entityId: createdReport.id,
      metadata: { case_id: caseId, version: nextVersion }
    });

    return { ok: true, message: nextVersion === 1 ? "Laudo previo gerado." : "Nova versao do laudo gerada." };
  } catch (error) {
    const failureMessage = formatPreAnalysisFailureMessage(error);

    await supabase.from("AA_pre_analysis_reports").insert({
      office_id: profile.office_id,
      case_id: caseId,
      version: nextVersion,
      status: "failed",
      model_provider: "anthropic",
      model_name: process.env.ANTHROPIC_MODEL_NAME || "claude-sonnet-4-20250514",
      input_summary: {
        ...context.inputSummary,
        error_message: failureMessage
      },
      prompt_version: PRE_ANALYSIS_PROMPT_VERSION,
      report_markdown: failureMessage,
      generated_by: profile.id,
      generated_at: new Date().toISOString()
    });

    await writeCaseHistory({
      caseId,
      action: "pre_analysis.report.failed",
      profile,
      metadata: { version: nextVersion, error: failureMessage }
    });

    return {
      ok: false,
      message: failureMessage
    };
  }
}
