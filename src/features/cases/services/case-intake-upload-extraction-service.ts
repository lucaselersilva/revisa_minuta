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
import type { AiUsageTelemetry } from "@/features/ai/lib/usage-telemetry";

type ExtractedAuthor = CaseIntakeUploadExtraction["authors"][number];

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

function normalizeCpfOrCnpj(rawText: string | null) {
  if (!rawText) {
    return null;
  }

  const cnpjMatch = rawText.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/);
  if (cnpjMatch) {
    return cnpjMatch[0];
  }

  const cpfMatch = rawText.match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/);
  if (cpfMatch) {
    return cpfMatch[0];
  }

  return rawText.trim() || null;
}

function normalizeCompanyDocument(rawText: string | null) {
  return normalizeCpfOrCnpj(rawText);
}

function cleanWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function looksLikeNarrativeFragment(value: string) {
  const lowered = value.toLocaleLowerCase("pt-BR");
  const blockedTerms = [
    "adquiriu",
    "adquiriu passagens",
    "foi surpreendida",
    "nao poderia prever",
    "nao teve qualquer responsabilidade",
    "responsabilidade",
    "dano moral",
    "danos morais",
    "danos materiais",
    "companhia",
    "empresa",
    "condenacao",
    "requer",
    "pleiteia",
    "alega",
    "narrativa",
    "fato",
    "fatos",
    "merito"
  ];

  if (blockedTerms.some((term) => lowered.includes(term))) {
    return true;
  }

  const words = lowered.split(/\s+/).filter(Boolean);
  const lowerWordCount = value.split(/\s+/).filter((item) => /^[a-zà-ú]/.test(item)).length;
  if (words.length >= 3 && lowerWordCount >= 2) {
    return true;
  }

  return false;
}

function containsBlockedInstitutionalTerms(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
  const blockedWords = [
    "procedimento",
    "juizado",
    "orgao",
    "unidade",
    "jurisdicional",
    "civel",
    "justica",
    "pedido",
    "poder",
    "judiciario",
    "processo",
    "eletronico",
    "partes",
    "advogados",
    "pje",
    "minas",
    "gerais",
    "belo",
    "horizonte",
    "ultima",
    "tribunal",
    "vara",
    "comarca"
  ];

  return blockedWords.some((word) => normalized.includes(word));
}

function looksLikePersonName(value: string) {
  const cleaned = cleanWhitespace(value);
  if (cleaned.length < 5 || cleaned.length > 120) {
    return false;
  }

  if (looksLikeNarrativeFragment(cleaned)) {
    return false;
  }

  if (containsBlockedInstitutionalTerms(cleaned)) {
    return false;
  }

  const words = cleaned.split(" ").filter(Boolean);
  if (words.length < 2 || words.length > 8) {
    return false;
  }

  const validWords = words.every((word) => /^[A-Za-zÀ-Úà-ú'`-]+$/.test(word) && word.length >= 2);
  if (!validWords) {
    return false;
  }

  const capitalizedCount = words.filter((word) => /^[A-ZÀ-Ú]/.test(word)).length;
  return capitalizedCount >= Math.max(2, words.length - 1);
}

function uniqueAuthors(values: ExtractedAuthor[]) {
  const seen = new Set<string>();
  const result: ExtractedAuthor[] = [];

  for (const item of values) {
    const name = cleanWhitespace(item.name);
    if (!looksLikePersonName(name)) {
      continue;
    }

    const key = name.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push({
      name,
      document: normalizeCpfOrCnpj(item.document)
    });
  }

  return result.slice(0, 8);
}

function extractAuthorsFromRegex(text: string) {
  const authors: ExtractedAuthor[] = [];
  const qualifiedCpfRegex =
    /([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú'`-]+(?:\s+[A-ZÀ-Ú][A-ZÀ-Úa-zà-ú'`-]+){1,6})[\s\S]{0,220}?(?:CPF|inscrit[oa][\s\S]{0,30}?CPF|portador[oa]?[\s\S]{0,30}?CPF)[^\d]{0,20}(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/g;
  const labelledAuthorRegex =
    /(?:autor(?:a)?|requerente|promovente)(?:\(a\))?\s*:?\s*([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú'`-]+(?:\s+[A-ZÀ-Ú][A-ZÀ-Úa-zà-ú'`-]+){1,6})(?:[\s\S]{0,80}?(?:CPF|inscrit[oa][\s\S]{0,30}?CPF)[^\d]{0,20}(\d{3}\.?\d{3}\.?\d{3}-?\d{2}))?/gi;

  for (const match of text.matchAll(qualifiedCpfRegex)) {
    const name = cleanWhitespace(match[1] ?? "");
    const document = normalizeCpfOrCnpj(match[2] ?? null);
    if (!looksLikePersonName(name)) {
      continue;
    }

    authors.push({
      name,
      document
    });
  }

  for (const match of text.matchAll(labelledAuthorRegex)) {
    const name = cleanWhitespace(match[1] ?? "");
    const document = normalizeCpfOrCnpj(match[2] ?? null);
    if (!looksLikePersonName(name)) {
      continue;
    }

    authors.push({
      name,
      document
    });
  }

  const beforeDefendant = text.split(/(?:em face de|em desfavor de|promove.*contra|ajuiza.*contra)/i)[0] ?? text;
  const captionRegex =
    /\b([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú'`-]+(?:\s+[A-ZÀ-Ú][A-ZÀ-Úa-zà-ú'`-]+){1,5})\b/g;

  for (const match of beforeDefendant.matchAll(captionRegex)) {
    const name = cleanWhitespace(match[1] ?? "");
    if (!looksLikePersonName(name)) {
      continue;
    }

    const windowStart = Math.max(0, (match.index ?? 0) - 60);
    const windowEnd = Math.min(beforeDefendant.length, (match.index ?? 0) + name.length + 180);
    const nearbyText = beforeDefendant.slice(windowStart, windowEnd);
    const hasPartyCue = /(?:autor(?:a)?|requerente|promovente|qualifica[çc][aã]o|residente|domiciliad[oa]|CPF)/i.test(nearbyText);

    if (!hasPartyCue) {
      continue;
    }

    authors.push({
      name,
      document: normalizeCpfOrCnpj(nearbyText)
    });
  }

  return uniqueAuthors(authors);
}

function extractRepresentedEntityName(text: string) {
  const patterns = [
    /(?:em face de|em desfavor de|requerid[ao]|promovid[ao] contra)\s+([A-ZÀ-Ú0-9][A-ZÀ-Ú0-9\s\.\-&]{4,})/i,
    /([A-ZÀ-Ú0-9][A-ZÀ-Ú0-9\s\.\-&]{4,})\s*,?\s*(?:pessoa juridica|sociedade empresaria|empresa requerida|requerida)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return cleanWhitespace(match[1]);
    }
  }

  return null;
}

function regexFallback(extractedText: string | null, fileName: string): CaseIntakeUploadExtraction {
  const caseNumber = normalizeCaseNumber(extractedText);
  const text = extractedText ?? "";
  const representedEntityName = extractRepresentedEntityName(text);
  const defendantWindow = representedEntityName
    ? text.slice(Math.max(0, text.indexOf(representedEntityName)), Math.max(0, text.indexOf(representedEntityName)) + 500)
    : text;
  const authors = extractAuthorsFromRegex(text);

  return {
    title: caseNumber ? `Processo ${caseNumber}` : fileName.replace(/\.[^.]+$/, ""),
    case_number: caseNumber,
    represented_entity_name: representedEntityName,
    represented_entity_document: normalizeCompanyDocument(defendantWindow),
    authors,
    summary: "Extracao inicial gerada por fallback textual com baixa confianca operacional.",
    cautionary_notes: [
      "A extracao foi preenchida por heuristica textual local.",
      "Revise manualmente autores, documentos dos autores, empresa representada, CNPJ e numero do processo."
    ]
  };
}

function improveEntityDocumentFromText(currentDocument: string | null, representedEntityName: string | null, extractedText: string | null) {
  if (currentDocument) {
    return currentDocument;
  }

  if (!representedEntityName || !extractedText) {
    return null;
  }

  const index = extractedText.toLocaleLowerCase("pt-BR").indexOf(representedEntityName.toLocaleLowerCase("pt-BR"));
  const windowText =
    index >= 0 ? extractedText.slice(index, Math.min(extractedText.length, index + 800)) : extractedText;

  return normalizeCompanyDocument(windowText);
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
}): Promise<{
  extraction: CaseIntakeUploadExtraction;
  modelName: string | null;
  promptVersion: string;
  usedFallback: boolean;
  usage?: AiUsageTelemetry;
}> {
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
      maxTokens: 1400
    });

    const parsedJson = JSON.parse(extractJsonPayload(response.text));
    const parsed = caseIntakeUploadExtractionSchema.parse(parsedJson);
    const normalizedAuthors = uniqueAuthors(parsed.authors);
    const strongFallbackAuthors = fallback.authors.filter((author) => Boolean(author.document));
    const selectedAuthors =
      strongFallbackAuthors.length > 0
        ? strongFallbackAuthors
        : fallback.authors.length > 0
          ? fallback.authors
          : normalizedAuthors.filter((author) => Boolean(author.document)).length > 0
            ? normalizedAuthors.filter((author) => Boolean(author.document))
            : [];

    return {
      extraction: {
        ...parsed,
        case_number: normalizeCaseNumber(parsed.case_number),
        represented_entity_document: improveEntityDocumentFromText(
          normalizeCompanyDocument(parsed.represented_entity_document),
          parsed.represented_entity_name,
          extractedText
        ),
        authors: selectedAuthors
      },
      modelName: response.modelName,
      promptVersion: CASE_INTAKE_UPLOAD_PROMPT_VERSION,
      usedFallback: false,
      usage: response.usage
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
