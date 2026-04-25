import {
  normalizeDefenseConformityReportPayload,
  type DefenseConformityReportOutput
} from "@/features/ai/types/defense-conformity-report";

export type PersistedDefenseConformityReport = {
  prompt_version: string;
  model_name: string | null;
  input_summary: Record<string, unknown>;
  generated_at: string;
  generated_by: string;
  report_json: DefenseConformityReportOutput;
  report_markdown: string;
};

export function extractDefenseConformityFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): PersistedDefenseConformityReport | null {
  const payload = metadata?.defense_conformity_report;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const generatedAt = typeof record.generated_at === "string" ? record.generated_at : null;
  const generatedBy = typeof record.generated_by === "string" ? record.generated_by : null;
  const promptVersion = typeof record.prompt_version === "string" ? record.prompt_version : null;
  const reportMarkdown = typeof record.report_markdown === "string" ? record.report_markdown : null;
  const inputSummary =
    record.input_summary && typeof record.input_summary === "object" && !Array.isArray(record.input_summary)
      ? (record.input_summary as Record<string, unknown>)
      : {};

  if (!generatedAt || !generatedBy || !promptVersion || !reportMarkdown) {
    return null;
  }

  try {
    return {
      prompt_version: promptVersion,
      model_name: typeof record.model_name === "string" ? record.model_name : null,
      input_summary: inputSummary,
      generated_at: generatedAt,
      generated_by: generatedBy,
      report_json: normalizeDefenseConformityReportPayload(record.report_json),
      report_markdown: reportMarkdown
    };
  } catch {
    return null;
  }
}
