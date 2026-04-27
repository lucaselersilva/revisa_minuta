import { buildPreAnalysisSystemPrompt, buildPreAnalysisUserPrompt, PRE_ANALYSIS_PROMPT_VERSION } from "@/features/ai/prompts/pre-analysis-prompt";
import { generateAnthropicResponse, generateStructuredAnthropicResponse, type AnthropicContentBlock } from "@/features/ai/clients/anthropic-client";
import { normalizeAiUsageTelemetry, type AiUsageTelemetry } from "@/features/ai/lib/usage-telemetry";
import { renderPreAnalysisMarkdown } from "@/features/ai/services/render-pre-analysis-markdown";
import { normalizePreAnalysisReportPayload } from "@/features/ai/types/pre-analysis-report";
import { getCaseById } from "@/features/cases/queries/get-cases";
import { writeCaseHistory } from "@/features/cases/services/case-history-service";
import { buildPreAnalysisContext } from "@/features/document-ingestion/services/build-pre-analysis-context";
import { getPreAnalysisSnapshot } from "@/features/document-ingestion/queries/get-pre-analysis-snapshot";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/services/audit-log-service";
import type { Profile } from "@/types/database";

const PRE_ANALYSIS_MAX_TOKENS = 10000;
const PRE_ANALYSIS_MULTIMODAL_MAX_DOCS = 8;
const PRE_ANALYSIS_MULTIMODAL_MAX_TOTAL_BYTES = 24 * 1024 * 1024;

type PreAnalysisFailureDiagnostics = {
  rawResponseText?: string | null;
  parsedJson?: unknown;
  normalizationError?: string | null;
  repairAttempted?: boolean;
  repairedJson?: unknown;
};

type UsageAccumulator = {
  usage: AiUsageTelemetry;
};

class PreAnalysisGenerationError extends Error {
  diagnostics: PreAnalysisFailureDiagnostics;

  constructor(message: string, diagnostics: PreAnalysisFailureDiagnostics = {}) {
    super(message);
    this.name = "PreAnalysisGenerationError";
    this.diagnostics = diagnostics;
  }
}

function documentPriority(documentType: string) {
  if (documentType === "initial_petition") return 0;
  if (documentType === "initial_amendment") return 1;
  if (documentType === "initial_amendment_documents") return 2;
  if (documentType === "author_documents") return 3;
  if (documentType === "author_identity_document") return 4;
  if (documentType === "author_address_proof") return 5;
  if (documentType === "author_payment_proof") return 6;
  if (documentType === "author_screen_capture") return 7;
  return 8;
}

async function buildPreAnalysisAnthropicContent({
  promptContext,
  snapshot,
  supabase
}: {
  promptContext: string;
  snapshot: NonNullable<Awaited<ReturnType<typeof getPreAnalysisSnapshot>>>;
  supabase: ReturnType<typeof createAdminClient>;
}) {
  const processedDocuments = snapshot.eligibleDocuments
    .filter((item) => item.ingestion?.status === "processed")
    .sort((left, right) => {
      const byType = documentPriority(left.document.document_type) - documentPriority(right.document.document_type);
      if (byType !== 0) {
        return byType;
      }

      return (right.document.file_size ?? 0) - (left.document.file_size ?? 0);
    });

  const multimodalBlocks: AnthropicContentBlock[] = [];
  const multimodalInventory: string[] = [];
  let totalBytes = 0;

  for (const item of processedDocuments) {
    if (multimodalBlocks.length >= PRE_ANALYSIS_MULTIMODAL_MAX_DOCS) {
      break;
    }

    const mimeType = item.document.mime_type ?? "";
    const supportsMultimodal =
      mimeType === "application/pdf" || mimeType === "image/png" || mimeType === "image/jpeg";

    if (!supportsMultimodal) {
      continue;
    }

    const downloadResult = await supabase.storage.from("aa-case-files").download(item.document.file_path);
    if (downloadResult.error) {
      continue;
    }

    const buffer = Buffer.from(await downloadResult.data.arrayBuffer());
    if (totalBytes + buffer.length > PRE_ANALYSIS_MULTIMODAL_MAX_TOTAL_BYTES) {
      continue;
    }

    totalBytes += buffer.length;
    multimodalInventory.push(
      `${item.document.id} | ${item.document.file_name ?? item.document.document_type} | ${item.document.document_type}`
    );

    if (mimeType === "application/pdf") {
      multimodalBlocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: buffer.toString("base64")
        },
        title: item.document.file_name ?? item.document.document_type,
        context: `Documento juridico da fase inicial. ID ${item.document.id}. Tipo ${item.document.document_type}.`
      });
      continue;
    }

    multimodalBlocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: mimeType as "image/png" | "image/jpeg",
        data: buffer.toString("base64")
      }
    });
  }

  const textBlockParts = [
    multimodalInventory.length
      ? [
          "[Documentos multimodais enviados integralmente a seguir]",
          ...multimodalInventory.map((item, index) => `${index + 1}. ${item}`),
          ""
        ].join("\n")
      : "",
    buildPreAnalysisUserPrompt(promptContext)
  ].filter(Boolean);

  return [
    ...multimodalBlocks,
    {
      type: "text",
      text: textBlockParts.join("\n")
    } satisfies AnthropicContentBlock
  ];
}

function extractJsonPayload(text: string) {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("A resposta da IA nao trouxe JSON valido.");
  }

  return trimmed.slice(start, end + 1);
}

function closeOpenJsonStructures(fragment: string) {
  const closers: string[] = [];
  let inString = false;
  let escaped = false;

  for (const char of fragment) {
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      closers.push("}");
      continue;
    }

    if (char === "[") {
      closers.push("]");
      continue;
    }

    if ((char === "}" || char === "]") && closers.length) {
      const expected = closers[closers.length - 1];
      if (expected === char) {
        closers.pop();
      }
    }
  }

  const suffix = `${inString ? '"' : ""}${closers.reverse().join("")}`;
  return `${fragment}${suffix}`;
}

function collectJsonSafeBreakpoints(payload: string) {
  const breakpoints = [payload.length];
  let inString = false;
  let escaped = false;

  for (let index = 0; index < payload.length; index += 1) {
    const char = payload[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "," || char === "}" || char === "]") {
      breakpoints.push(index + 1);
    }
  }

  return [...new Set(breakpoints)].sort((left, right) => right - left);
}

function trimDanglingJsonFragment(fragment: string) {
  return fragment.replace(/[\s,]+$/g, "").trimEnd();
}

function tryRepairJsonLocally(text: string) {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");

  if (start === -1) {
    return null;
  }

  const payload = trimmed.slice(start);
  const breakpoints = collectJsonSafeBreakpoints(payload);

  for (const breakpoint of breakpoints) {
    const partial = trimDanglingJsonFragment(payload.slice(0, breakpoint));
    if (!partial.startsWith("{")) {
      continue;
    }

    try {
      return JSON.parse(closeOpenJsonStructures(partial));
    } catch {
      continue;
    }
  }

  return null;
}

function tryParseJsonPayload(text: string) {
  return JSON.parse(extractJsonPayload(text));
}

function addUsage(accumulator: UsageAccumulator, usage: AiUsageTelemetry) {
  accumulator.usage = normalizeAiUsageTelemetry({
    input_tokens: accumulator.usage.input_tokens + usage.input_tokens,
    output_tokens: accumulator.usage.output_tokens + usage.output_tokens,
    cache_creation_input_tokens:
      accumulator.usage.cache_creation_input_tokens + usage.cache_creation_input_tokens,
    cache_read_input_tokens: accumulator.usage.cache_read_input_tokens + usage.cache_read_input_tokens,
    total_tokens: accumulator.usage.total_tokens + usage.total_tokens
  });
}

async function repairPreAnalysisJson(rawText: string, accumulator?: UsageAccumulator) {
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

  if (accumulator) {
    addUsage(accumulator, repairResponse.usage);
  }

  return tryParseJsonPayload(repairResponse.text);
}

async function repairPreAnalysisStructure(rawText: string, failureDetail: string, accumulator?: UsageAccumulator) {
  const repairResponse = await generateStructuredAnthropicResponse({
    systemPrompt: [
      "Voce atua como reparador tecnico de estrutura JSON para um laudo juridico operacional.",
      "Recebera uma resposta que ja pode estar em JSON, mas nao aderiu corretamente ao formato esperado.",
      "Sua tarefa e devolver apenas um JSON valido e estruturalmente compativel com o laudo previo do sistema.",
      "Nao resuma, nao explique, nao adicione markdown e nao invente fatos ausentes.",
      "Preserve o conteudo material existente, reorganizando apenas o necessario para aderir ao formato esperado.",
      "Mantenha todos os enums em valores validos e use arrays vazios, null ou textos prudentes quando faltar base suficiente."
    ].join(" "),
    userPrompt: [
      "Reestruture o conteudo abaixo para um JSON estrito e compativel com o laudo previo esperado.",
      "Falha detectada ao normalizar o payload atual:",
      failureDetail,
      "Retorne somente o JSON reestruturado.",
      rawText
    ].join("\n\n"),
    maxTokens: PRE_ANALYSIS_MAX_TOKENS
  });

  if (accumulator) {
    addUsage(accumulator, repairResponse.usage);
  }

  return tryParseJsonPayload(repairResponse.text);
}

async function parsePreAnalysisResponse(text: string, accumulator?: UsageAccumulator) {
  try {
    return tryParseJsonPayload(text);
  } catch (error) {
    const locallyRepaired = tryRepairJsonLocally(text);
    if (locallyRepaired) {
      return locallyRepaired;
    }

    if (!(error instanceof Error)) {
      throw new PreAnalysisGenerationError(
        "A resposta da IA nao veio no formato estruturado esperado para o laudo.",
        {
          rawResponseText: text,
          repairAttempted: false
        }
      );
    }

    const isRecoverableParseFailure =
      error.name === "SyntaxError" ||
      error.message.includes("JSON") ||
      error.message.includes("Expected") ||
      error.message.includes("Unexpected");

    if (!isRecoverableParseFailure) {
      throw new PreAnalysisGenerationError(
        "A resposta da IA nao veio no formato estruturado esperado para o laudo.",
        {
          rawResponseText: text,
          normalizationError: error.message,
          repairAttempted: false
        }
      );
    }

    try {
      return await repairPreAnalysisJson(text, accumulator);
    } catch {
      throw new PreAnalysisGenerationError(
        "A resposta da IA nao veio no formato estruturado esperado para o laudo.",
        {
          rawResponseText: text,
          normalizationError: error.message,
          repairAttempted: true
        }
      );
    }
  }
}

async function normalizePreAnalysisResponse(text: string, accumulator?: UsageAccumulator) {
  const parsedJson = await parsePreAnalysisResponse(text, accumulator);

  try {
    return normalizePreAnalysisReportPayload(parsedJson);
  } catch (error) {
    const failureDetail = error instanceof Error ? error.message : "Falha desconhecida na normalizacao do laudo.";
    try {
      const repairedJson = await repairPreAnalysisStructure(text, failureDetail, accumulator);
      try {
        return normalizePreAnalysisReportPayload(repairedJson);
      } catch (repairError) {
        throw new PreAnalysisGenerationError(
          "A resposta da IA nao veio no formato estruturado esperado para o laudo.",
          {
            rawResponseText: text,
            parsedJson,
            normalizationError: repairError instanceof Error ? repairError.message : failureDetail,
            repairAttempted: true,
            repairedJson
          }
        );
      }
    } catch (repairPipelineError) {
      if (repairPipelineError instanceof PreAnalysisGenerationError) {
        throw repairPipelineError;
      }

      throw new PreAnalysisGenerationError(
        "A resposta da IA nao veio no formato estruturado esperado para o laudo.",
        {
          rawResponseText: text,
          parsedJson,
          normalizationError: failureDetail,
          repairAttempted: true
        }
      );
    }
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

function buildPreAnalysisFailureMarkdown({
  failureMessage,
  diagnostics
}: {
  failureMessage: string;
  diagnostics?: PreAnalysisFailureDiagnostics;
}) {
  const lines = [failureMessage];

  if (diagnostics?.normalizationError) {
    lines.push("");
    lines.push("=== DETALHE DA NORMALIZACAO ===");
    lines.push(diagnostics.normalizationError);
  }

  if (diagnostics?.parsedJson) {
    lines.push("");
    lines.push("=== JSON PARSEADO ANTES DA NORMALIZACAO ===");
    lines.push(JSON.stringify(diagnostics.parsedJson, null, 2));
  }

  if (diagnostics?.repairAttempted) {
    lines.push("");
    lines.push("=== REPARO ESTRUTURAL TENTADO ===");
    lines.push("Sim");
  }

  if (diagnostics?.repairedJson) {
    lines.push("");
    lines.push("=== JSON REESTRUTURADO PELO REPARO ===");
    lines.push(JSON.stringify(diagnostics.repairedJson, null, 2));
  }

  if (diagnostics?.rawResponseText) {
    lines.push("");
    lines.push("=== RESPOSTA CRUA DA IA ===");
    lines.push(diagnostics.rawResponseText);
  }

  return lines.join("\n");
}

async function generatePreAnalysisAnthropicReport(promptContext: string, userContent: AnthropicContentBlock[]) {
  try {
    return await generateAnthropicResponse({
      systemPrompt: buildPreAnalysisSystemPrompt(),
      userContent,
      maxTokens: PRE_ANALYSIS_MAX_TOKENS
    });
  } catch (error) {
    if (userContent.length <= 1) {
      throw error;
    }

    return generateStructuredAnthropicResponse({
      systemPrompt: buildPreAnalysisSystemPrompt(),
      userPrompt: buildPreAnalysisUserPrompt(promptContext),
      maxTokens: PRE_ANALYSIS_MAX_TOKENS
    });
  }
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
    const userContent = await buildPreAnalysisAnthropicContent({
      promptContext: context.promptContext,
      snapshot,
      supabase
    });

    const response = await generatePreAnalysisAnthropicReport(context.promptContext, userContent);
    const usageAccumulator: UsageAccumulator = {
      usage: normalizeAiUsageTelemetry(response.usage)
    };

    const report = await normalizePreAnalysisResponse(response.text, usageAccumulator);
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
        input_summary: {
          ...context.inputSummary,
          usage: usageAccumulator.usage
        },
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
    const diagnostics = error instanceof PreAnalysisGenerationError ? error.diagnostics : undefined;
    const failureMarkdown = buildPreAnalysisFailureMarkdown({
      failureMessage,
      diagnostics
    });

    await supabase.from("AA_pre_analysis_reports").insert({
      office_id: profile.office_id,
      case_id: caseId,
      version: nextVersion,
      status: "failed",
      model_provider: "anthropic",
      model_name: process.env.ANTHROPIC_MODEL_NAME || "claude-sonnet-4-20250514",
      input_summary: {
        ...context.inputSummary,
        error_message: failureMessage,
        normalization_error: diagnostics?.normalizationError ?? null,
        repair_attempted: diagnostics?.repairAttempted ?? false,
        raw_response_available: Boolean(diagnostics?.rawResponseText)
      },
      prompt_version: PRE_ANALYSIS_PROMPT_VERSION,
      report_markdown: failureMarkdown,
      generated_by: profile.id,
      generated_at: new Date().toISOString()
    });

    await writeCaseHistory({
      caseId,
      action: "pre_analysis.report.failed",
      profile,
      metadata: {
        version: nextVersion,
        error: failureMessage,
        normalization_error: diagnostics?.normalizationError ?? null,
        repair_attempted: diagnostics?.repairAttempted ?? false
      }
    });

    return {
      ok: false,
      message: failureMessage
    };
  }
}
