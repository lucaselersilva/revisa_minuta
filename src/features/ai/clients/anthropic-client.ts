const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const STABLE_DEFAULT_MODEL = "claude-sonnet-4-20250514";
const FALLBACK_MODEL = "claude-3-7-sonnet-latest";

const MODEL_ALIASES: Record<string, string> = {
  "claude-sonnet-4": STABLE_DEFAULT_MODEL,
  "claude-sonnet-4.0": STABLE_DEFAULT_MODEL,
  "claude-sonnet-4-5": STABLE_DEFAULT_MODEL,
  "claude-sonnet-4.5": STABLE_DEFAULT_MODEL,
  "claude-3-7-sonnet": FALLBACK_MODEL
};

type AnthropicApiError = Error & {
  status?: number;
  body?: string;
  modelName?: string;
};

export type AnthropicContentBlock =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "document";
      source: {
        type: "base64";
        media_type: "application/pdf";
        data: string;
      };
      title?: string;
      context?: string;
    }
  | {
      type: "image";
      source: {
        type: "base64";
        media_type: string;
        data: string;
      };
    };

function resolveConfiguredModelName() {
  const configured = process.env.ANTHROPIC_MODEL_NAME?.trim();

  if (!configured) {
    return STABLE_DEFAULT_MODEL;
  }

  return MODEL_ALIASES[configured] ?? configured;
}

async function requestAnthropic({
  apiKey,
  modelName,
  systemPrompt,
  userContent,
  maxTokens = 4000,
  includeTemperature = true
}: {
  apiKey: string;
  modelName: string;
  systemPrompt: string;
  userContent: string | AnthropicContentBlock[];
  maxTokens?: number;
  includeTemperature?: boolean;
}) {
  const payload = {
    model: modelName,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userContent
      }
    ],
    ...(includeTemperature ? { temperature: 0.2 } : {})
  };

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const error = new Error(`Falha ao chamar Anthropic: ${response.status} ${errorBody}`) as AnthropicApiError;
    error.status = response.status;
    error.body = errorBody;
    error.modelName = modelName;
    throw error;
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find((item) => item.type === "text")?.text;

  if (!text) {
    throw new Error("A Anthropic nao retornou texto.");
  }

  return {
    modelName,
    text
  };
}

function shouldRetryWithoutTemperature(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("temperature") && message.includes("deprecated");
}

function shouldRetryWithFallback(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("model") &&
    (message.includes("not_found") ||
      message.includes("not found") ||
      message.includes("invalid model") ||
      message.includes("permission") ||
      message.includes("access") ||
      message.includes("unsupported"))
  );
}

export async function generateStructuredAnthropicResponse({
  systemPrompt,
  userPrompt,
  maxTokens
}: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}) {
  return generateAnthropicResponse({
    systemPrompt,
    userContent: userPrompt,
    maxTokens
  });
}

export async function generateAnthropicResponse({
  systemPrompt,
  userContent,
  maxTokens
}: {
  systemPrompt: string;
  userContent: string | AnthropicContentBlock[];
  maxTokens?: number;
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY nao configurada.");
  }

  const preferredModel = resolveConfiguredModelName();

  try {
    return await requestAnthropic({
      apiKey,
      modelName: preferredModel,
      systemPrompt,
      userContent,
      maxTokens
    });
  } catch (error) {
    if (shouldRetryWithoutTemperature(error)) {
      return requestAnthropic({
        apiKey,
        modelName: preferredModel,
        systemPrompt,
        userContent,
        maxTokens,
        includeTemperature: false
      });
    }

    if (!shouldRetryWithFallback(error) || preferredModel === FALLBACK_MODEL) {
      throw error;
    }

    return requestAnthropic({
      apiKey,
      modelName: FALLBACK_MODEL,
      systemPrompt,
      userContent,
      maxTokens
    });
  }
}
