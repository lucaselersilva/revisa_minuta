export type AiUsageTelemetry = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  total_tokens: number;
};

function toFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function normalizeAiUsageTelemetry(value: unknown): AiUsageTelemetry {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const inputTokens = toFiniteNumber(record.input_tokens);
  const outputTokens = toFiniteNumber(record.output_tokens);
  const cacheCreationInputTokens = toFiniteNumber(record.cache_creation_input_tokens);
  const cacheReadInputTokens = toFiniteNumber(record.cache_read_input_tokens);
  const explicitTotal = toFiniteNumber(record.total_tokens);

  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_creation_input_tokens: cacheCreationInputTokens,
    cache_read_input_tokens: cacheReadInputTokens,
    total_tokens: explicitTotal || inputTokens + outputTokens + cacheCreationInputTokens + cacheReadInputTokens
  };
}

export function hasAiUsageTelemetry(value: AiUsageTelemetry | null | undefined) {
  return (value?.total_tokens ?? 0) > 0;
}
