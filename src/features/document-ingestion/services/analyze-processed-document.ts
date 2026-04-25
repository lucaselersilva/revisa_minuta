import "server-only";

import { generateAnthropicResponse, type AnthropicContentBlock } from "@/features/ai/clients/anthropic-client";
import {
  buildDocumentAnalysisInstruction,
  buildDocumentAnalysisSystemPrompt,
  DOCUMENT_ANALYSIS_PROMPT_VERSION
} from "@/features/document-ingestion/lib/document-analysis-prompt";
import { structuredDocumentAnalysisSchema } from "@/features/document-ingestion/lib/document-analysis-schema";
import type { StructuredDocumentAnalysis } from "@/features/document-ingestion/types";
import type { CaseDocument } from "@/types/database";

type AnalysisResult =
  | {
      status: "completed";
      report: StructuredDocumentAnalysis;
      modelName: string;
      promptVersion: string;
    }
  | {
      status: "skipped" | "failed";
      errorMessage: string;
      promptVersion: string;
    };

function extractJsonPayload(text: string) {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("A resposta da IA nao trouxe JSON valido para a analise documental.");
  }

  return trimmed.slice(start, end + 1);
}

function toBase64(buffer: Buffer) {
  return buffer.toString("base64");
}

async function buildVisualBlocks(
  document: CaseDocument,
  fileBuffer: Buffer,
  parserType: string | null
) {
  if (document.mime_type?.includes("pdf")) {
    return [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: toBase64(fileBuffer)
        },
        title: document.file_name ?? document.document_type,
        context:
          parserType === "pdf_hybrid" || parserType === "pdf_ocr"
            ? "PDF juridico com conteudo textual e visual. Priorize leitura integral do documento."
            : "PDF juridico enviado integralmente para leitura do conteudo textual e visual."
      } satisfies AnthropicContentBlock
    ];
  }

  if (document.mime_type === "image/jpeg" || document.mime_type === "image/png") {
    return [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: document.mime_type,
          data: toBase64(fileBuffer)
        }
      } satisfies AnthropicContentBlock
    ];
  }

  return [];
}

export async function analyzeProcessedDocument({
  document,
  extractedText,
  fileBuffer,
  parserType
}: {
  document: CaseDocument;
  extractedText: string;
  fileBuffer: Buffer;
  parserType: string | null;
  parserMetadata: Record<string, unknown>;
}): Promise<AnalysisResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      status: "skipped",
      errorMessage: "ANTHROPIC_API_KEY nao configurada para a analise documental estruturada.",
      promptVersion: DOCUMENT_ANALYSIS_PROMPT_VERSION
    };
  }

  try {
    const visualBlocks = await buildVisualBlocks(document, fileBuffer, parserType);
    const userContent: AnthropicContentBlock[] = [
      {
        type: "text",
        text: buildDocumentAnalysisInstruction(document, extractedText)
      },
      ...visualBlocks
    ];

    const response = await generateAnthropicResponse({
      systemPrompt: buildDocumentAnalysisSystemPrompt(),
      userContent,
      maxTokens: 1800
    });

    const parsedJson = JSON.parse(extractJsonPayload(response.text));
    const report = structuredDocumentAnalysisSchema.parse(parsedJson);

    return {
      status: "completed",
      report,
      modelName: response.modelName,
      promptVersion: DOCUMENT_ANALYSIS_PROMPT_VERSION
    };
  } catch (error) {
    return {
      status: "failed",
      errorMessage:
        error instanceof Error
          ? error.message
          : "Falha desconhecida na analise documental estruturada.",
      promptVersion: DOCUMENT_ANALYSIS_PROMPT_VERSION
    };
  }
}
