import "server-only";

import { generateAnthropicResponse, type AnthropicContentBlock } from "@/features/ai/clients/anthropic-client";
import {
  buildCaseIntakeUploadSystemPrompt,
  buildCaseIntakeUploadUserPrompt,
  CASE_INTAKE_UPLOAD_PROMPT_VERSION
} from "@/features/ai/prompts/case-intake-upload-prompt";
import {
  caseIntakeUploadExtractionSchema,
  type CaseIntakeUploadExtraction
} from "@/features/cases/lib/case-intake-upload-schema";

function extractJsonPayload(text: string) {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("A resposta da IA nao trouxe JSON valido para o cadastro por upload.");
  }

  return trimmed.slice(start, end + 1);
}

function toBase64(buffer: Buffer) {
  return buffer.toString("base64");
}

function normalizeCaseNumber(rawText: string | null) {
  if (!rawText) {
    return null;
  }

  const cnjMatch = rawText.match(/\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/);
  if (cnjMatch) {
    return cnjMatch[0];
  }

  return rawText.trim() || null;
}

function uniqueNames(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLocaleLowerCase("pt-BR");

    if (!trimmed || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function regexFallback(extractedText: string | null, fileName: string): CaseIntakeUploadExtraction {
  const caseNumber = normalizeCaseNumber(extractedText);
  const text = extractedText ?? "";
  const authorMatches = Array.from(
    text.matchAll(/(?:autor(?:a)?(?:es)?|requerente(?:s)?|promovente(?:s)?)\s*:?[\s\n-]*([A-ZÀ-Ú][A-ZÀ-Ú\s]{5,})/gi)
  )
    .map((match) => match[1] ?? "")
    .map((value) => value.replace(/\s+/g, " ").trim())
    .slice(0, 4);
  const defendantMatch = text.match(/(?:em face de|em desfavor de|requerid[ao]|promovid[ao] contra)\s+([A-ZÀ-Ú0-9][A-ZÀ-Ú0-9\s\.\-&]{4,})/i);
  const normalizedAuthors = uniqueNames(authorMatches);

  return {
    title: caseNumber ? `Processo ${caseNumber}` : fileName.replace(/\.[^.]+$/, ""),
    case_number: caseNumber,
    represented_entity_name: defendantMatch?.[1]?.replace(/\s+/g, " ").trim() ?? null,
    authors: normalizedAuthors,
    summary: "Extracao inicial gerada por fallback textual com baixa confianca operacional.",
    cautionary_notes: [
      "A extracao foi preenchida por heuristica textual local.",
      "Revise manualmente autores, empresa representada e numero do processo."
    ]
  };
}

export async function extractCaseDraftFromUploadedDocument({
  fileName,
  mimeType,
  fileBuffer,
  extractedText
}: {
  fileName: string;
  mimeType: string | null;
  fileBuffer: Buffer;
  extractedText: string | null;
}) {
  const fallback = regexFallback(extractedText, fileName);

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      extraction: fallback,
      modelName: null,
      promptVersion: CASE_INTAKE_UPLOAD_PROMPT_VERSION,
      usedFallback: true
    };
  }

  try {
    const userContent: AnthropicContentBlock[] = [
      {
        type: "text",
        text: buildCaseIntakeUploadUserPrompt({
          fileName,
          extractedText
        })
      }
    ];

    if (mimeType === "application/pdf") {
      userContent.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: toBase64(fileBuffer)
        },
        title: fileName,
        context: "Peticao inicial ou documento de abertura para extracao dos campos do cadastro inicial."
      });
    } else if (mimeType === "image/jpeg" || mimeType === "image/png") {
      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType,
          data: toBase64(fileBuffer)
        }
      });
    }

    const response = await generateAnthropicResponse({
      systemPrompt: buildCaseIntakeUploadSystemPrompt(),
      userContent,
      maxTokens: 1200
    });

    const parsedJson = JSON.parse(extractJsonPayload(response.text));
    const parsed = caseIntakeUploadExtractionSchema.parse(parsedJson);

    return {
      extraction: {
        ...parsed,
        case_number: normalizeCaseNumber(parsed.case_number),
        authors: uniqueNames(parsed.authors)
      },
      modelName: response.modelName,
      promptVersion: CASE_INTAKE_UPLOAD_PROMPT_VERSION,
      usedFallback: false
    };
  } catch {
    return {
      extraction: fallback,
      modelName: null,
      promptVersion: CASE_INTAKE_UPLOAD_PROMPT_VERSION,
      usedFallback: true
    };
  }
}
