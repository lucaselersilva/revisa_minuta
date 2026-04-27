import { z } from "zod";

import { generateStructuredAnthropicResponse } from "@/features/ai/clients/anthropic-client";
import { getCaseById } from "@/features/cases/queries/get-cases";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AuthorExternalProcess,
  AuthorExternalSearch,
  AuthorExternalSearchStatus,
  CaseParty,
  DocumentIngestion,
  Profile
} from "@/types/database";

const ESCAVADOR_API_URL = "https://api.escavador.com/api/v2";
const ESCAVADOR_DEFAULT_LIMIT = 100;
const ESCAVADOR_ALL_ORIGINS = "TODOS";
const MAX_CPF_IDENTIFICATION_CHARS = 18000;

const aiCpfAssociationSchema = z.object({
  associations: z.array(
    z.object({
      author_name: z.string(),
      cpf: z.string().nullable(),
      confidence: z.enum(["alta", "media", "baixa"]),
      rationale: z.string()
    })
  )
});

type AuthorCpfSource = "case_party" | "regex_single_match" | "ai_association" | "unresolved";

type AuthorCpfResolution = {
  party: CaseParty;
  cpf: string | null;
  source: AuthorCpfSource;
  reasoning: string;
  needsHumanValidation: boolean;
};

type EscavadorNormalizedProcess = {
  process_number: string;
  tribunal: string | null;
  role_hint: string | null;
  subject_summary: string | null;
  last_movement_at: string | null;
  source_link: string | null;
  raw_payload: Record<string, unknown>;
};

type EscavadorInvolvedSearchResponse = {
  involvedFound?: Record<string, unknown> | null;
  envolvido_encontrado?: Record<string, unknown> | null;
  items?: unknown[];
  links?: {
    next?: string | null;
  } | null;
  paginator?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatCpf(value: string) {
  const digits = digitsOnly(value);
  if (digits.length !== 11) {
    return value;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function isValidCpf(value: string | null | undefined) {
  if (!value) return false;

  const digits = digitsOnly(value);
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) {
    return false;
  }

  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(digits[index]) * (10 - index);
  }

  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== Number(digits[9])) {
    return false;
  }

  sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += Number(digits[index]) * (11 - index);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === Number(digits[10]);
}

function normalizePersonName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function truncateText(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, maxChars)}\n\n[texto truncado para identificacao de CPF]`;
}

function extractJsonText(value: string) {
  const trimmed = value.trim();
  if (!trimmed.includes("```")) {
    return trimmed;
  }

  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return match?.[1]?.trim() ?? trimmed;
}

function resolveEscavadorToken() {
  const token = process.env.ESCAVADOR_API_TOKEN?.trim();
  if (!token) {
    throw new Error("ESCAVADOR_API_TOKEN nao configurada.");
  }

  return token;
}

function uniqueStrings(items: Array<string | null | undefined>) {
  return [...new Set(items.map((item) => item?.trim()).filter((item): item is string => Boolean(item)))];
}

function extractCpfCandidates(text: string) {
  const matches = text.match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g) ?? [];
  return uniqueStrings(matches.filter((match) => isValidCpf(match))).map(formatCpf);
}

function inferTribunalFromCaseNumber(caseNumber: string | null | undefined) {
  if (!caseNumber) return null;

  const digits = digitsOnly(caseNumber);
  if (digits.length !== 20) {
    return null;
  }

  const justiceSegment = digits[13];
  const tribunalCode = digits.slice(14, 16);

  if (justiceSegment === "8") {
    const map: Record<string, string> = {
      "01": "TJAC",
      "02": "TJAL",
      "03": "TJAP",
      "04": "TJAM",
      "05": "TJBA",
      "06": "TJCE",
      "07": "TJDFT",
      "08": "TJES",
      "09": "TJGO",
      "10": "TJMA",
      "11": "TJMT",
      "12": "TJMS",
      "13": "TJMG",
      "14": "TJPA",
      "15": "TJPB",
      "16": "TJPR",
      "17": "TJPE",
      "18": "TJPI",
      "19": "TJRJ",
      "20": "TJRN",
      "21": "TJRS",
      "22": "TJRO",
      "23": "TJRR",
      "24": "TJSC",
      "25": "TJSE",
      "26": "TJSP",
      "27": "TJTO"
    };

    return map[tribunalCode] ?? null;
  }

  if (justiceSegment === "4") {
    const map: Record<string, string> = {
      "01": "TRF1",
      "02": "TRF2",
      "03": "TRF3",
      "04": "TRF4",
      "05": "TRF5",
      "06": "TRF6"
    };

    return map[tribunalCode] ?? null;
  }

  if (justiceSegment === "5") {
    const map: Record<string, string> = {
      "01": "TRT1",
      "02": "TRT2",
      "03": "TRT3",
      "04": "TRT4",
      "05": "TRT5",
      "06": "TRT6",
      "07": "TRT7",
      "08": "TRT8",
      "09": "TRT9",
      "10": "TRT10",
      "11": "TRT11",
      "12": "TRT12",
      "13": "TRT13",
      "14": "TRT14",
      "15": "TRT15",
      "16": "TRT16",
      "17": "TRT17",
      "18": "TRT18",
      "19": "TRT19",
      "20": "TRT20",
      "21": "TRT21",
      "22": "TRT22",
      "23": "TRT23",
      "24": "TRT24"
    };

    return map[tribunalCode] ?? null;
  }

  return null;
}

function resolveTargetOrigins(caseNumber: string | null | undefined) {
  const configuredOrigins = uniqueStrings((process.env.ESCAVADOR_DEFAULT_ORIGINS ?? "").split(",").map((item) => item.toUpperCase()));
  const inferred = inferTribunalFromCaseNumber(caseNumber);
  const resolved = uniqueStrings([...configuredOrigins, inferred ?? null]);

  return resolved.length ? resolved : [ESCAVADOR_ALL_ORIGINS];
}

async function fetchInitialDocumentText(caseId: string) {
  const caseItem = await getCaseById(caseId);
  if (!caseItem) {
    return "";
  }

  const targetDocumentIds = caseItem.documents
    .filter(
      (document) =>
        document.document_type === "initial_petition" ||
        document.document_type === "initial_amendment" ||
        document.document_type === "initial_amendment_documents"
    )
    .map((document) => document.id);

  if (targetDocumentIds.length === 0) {
    return "";
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("AA_document_ingestions")
    .select("*")
    .in("case_document_id", targetDocumentIds)
    .returns<DocumentIngestion[]>();

  const orderedDocumentIds = caseItem.documents
    .filter((document) => targetDocumentIds.includes(document.id))
    .sort((left, right) => {
      const leftPriority = left.document_type === "initial_petition" ? 0 : 1;
      const rightPriority = right.document_type === "initial_petition" ? 0 : 1;
      return leftPriority - rightPriority;
    })
    .map((document) => document.id);

  return orderedDocumentIds
    .map((documentId) =>
      data?.find((item) => item.case_document_id === documentId && item.status === "processed")?.extracted_text?.trim() ?? null
    )
    .filter((item): item is string => Boolean(item))
    .join("\n\n");
}

async function resolveAuthorCpfAssociationsWithAi(authors: CaseParty[], petitionText: string, cpfCandidates: string[]) {
  if (!process.env.ANTHROPIC_API_KEY || authors.length === 0 || cpfCandidates.length === 0) {
    return [];
  }

  const systemPrompt = [
    "Voce associa CPFs a autores identificados no texto de uma peticao inicial.",
    "Analise apenas o texto fornecido.",
    "Nunca invente CPFs nem associe um CPF sem lastro textual claro.",
    "Escolha apenas entre os candidatos fornecidos.",
    "Se nao houver base suficiente, retorne cpf null.",
    "Responda apenas JSON estrito no formato solicitado."
  ].join(" ");

  const userPrompt = [
    "Associe, se possivel, os candidatos de CPF aos autores abaixo.",
    "",
    "Autores:",
    ...authors.map((party) => `- ${party.name}`),
    "",
    "CPFs candidatos encontrados no texto:",
    ...cpfCandidates.map((cpf) => `- ${cpf}`),
    "",
    "Texto da peticao inicial:",
    truncateText(petitionText, MAX_CPF_IDENTIFICATION_CHARS),
    "",
    'Responda em JSON estrito: {"associations":[{"author_name":"...","cpf":"000.000.000-00 ou null","confidence":"alta|media|baixa","rationale":"..."}]}'
  ].join("\n");

  try {
    const response = await generateStructuredAnthropicResponse({
      systemPrompt,
      userPrompt,
      maxTokens: 1200
    });
    const payload = aiCpfAssociationSchema.parse(JSON.parse(extractJsonText(response.text)));

    return payload.associations;
  } catch {
    return [];
  }
}

async function identifyAuthorCpfs(caseId: string) {
  const caseItem = await getCaseById(caseId);

  if (!caseItem) {
    return null;
  }

  const authors = caseItem.parties.filter((party) => party.role === "author");
  const petitionText = await fetchInitialDocumentText(caseId);
  const cpfCandidates = petitionText ? extractCpfCandidates(petitionText) : [];
  const directResolutions: AuthorCpfResolution[] = authors.map((party) => {
    if (isValidCpf(party.document)) {
      return {
        party,
        cpf: formatCpf(String(party.document)),
        source: "case_party",
        reasoning: "CPF aproveitado do cadastro da parte autora.",
        needsHumanValidation: false
      };
    }

    return {
      party,
      cpf: null,
      source: "unresolved",
      reasoning: "CPF nao disponivel no cadastro da parte.",
      needsHumanValidation: true
    };
  });

  const unresolved = directResolutions.filter((item) => !item.cpf);

  if (unresolved.length === 1 && cpfCandidates.length === 1) {
    const target = unresolved[0];
    target.cpf = cpfCandidates[0];
    target.source = "regex_single_match";
    target.reasoning = "Havia apenas um autor sem CPF e um unico CPF valido no texto da inicial.";
    target.needsHumanValidation = false;
  } else if (unresolved.length > 0 && cpfCandidates.length > 0 && petitionText) {
    const aiAssociations = await resolveAuthorCpfAssociationsWithAi(
      unresolved.map((item) => item.party),
      petitionText,
      cpfCandidates
    );

    for (const resolution of unresolved) {
      const match = aiAssociations.find(
        (item) => normalizePersonName(item.author_name) === normalizePersonName(resolution.party.name)
      );

      if (match?.cpf && isValidCpf(match.cpf)) {
        resolution.cpf = formatCpf(match.cpf);
        resolution.source = "ai_association";
        resolution.reasoning = match.rationale;
        resolution.needsHumanValidation = match.confidence !== "alta";
      } else {
        resolution.reasoning = petitionText
          ? "Nao foi possivel associar com seguranca um CPF valido ao autor a partir do texto disponivel."
          : "Nao ha texto processado da peticao inicial para identificar o CPF do autor.";
      }
    }
  }

  return {
    caseItem,
    origins: resolveTargetOrigins(caseItem.case_number),
    resolutions: directResolutions
  };
}

async function callEscavador(urlOrPath: string, init?: RequestInit) {
  const token = resolveEscavadorToken();
  const isAbsoluteUrl = /^https?:\/\//i.test(urlOrPath);
  const response = await fetch(isAbsoluteUrl ? urlOrPath : `${ESCAVADOR_API_URL}${urlOrPath}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "X-Requested-With": "XMLHttpRequest",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {})
    }
  });

  const bodyText = await response.text();
  const creditsUsed = response.headers.get("Creditos-Utilizados");
  const parsedBody = bodyText ? safeJsonParse(bodyText) : null;

  if (!response.ok) {
    const message =
      typeof parsedBody === "object" && parsedBody && "error" in parsedBody
        ? String(parsedBody.error)
        : bodyText || `Escavador retornou HTTP ${response.status}.`;
    throw new Error(message);
  }

  return {
    data: parsedBody,
    creditsUsed
  };
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return { raw_text: value };
  }
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toEscavadorStatus(processesCount: number): AuthorExternalSearchStatus {
  return processesCount > 0 ? "completed" : "not_found";
}

function buildEscavadorInvolvedSearchPath({ cpf, tribunal }: { cpf: string; tribunal: string }) {
  const params = new URLSearchParams();
  params.set("cpf_cnpj", digitsOnly(cpf));
  params.set("limit", String(ESCAVADOR_DEFAULT_LIMIT));

  if (tribunal !== ESCAVADOR_ALL_ORIGINS) {
    params.append("tribunais[]", tribunal);
  }

  return `/envolvido/processos?${params.toString()}`;
}

async function fetchEscavadorInvolvedProcessesPage(pathOrUrl: string) {
  const response = await callEscavador(pathOrUrl, { method: "GET" });

  return {
    payload: (response.data ?? {}) as EscavadorInvolvedSearchResponse & Record<string, unknown>,
    creditsUsed: response.creditsUsed
  };
}

async function fetchEscavadorInvolvedProcesses({ cpf, tribunal }: { cpf: string; tribunal: string }) {
  const pages: Array<Record<string, unknown>> = [];
  const items: Record<string, unknown>[] = [];
  const creditsUsed: string[] = [];
  let nextPathOrUrl: string | null = buildEscavadorInvolvedSearchPath({ cpf, tribunal });

  while (nextPathOrUrl) {
    const response = await fetchEscavadorInvolvedProcessesPage(nextPathOrUrl);
    pages.push(response.payload);

    if (response.creditsUsed) {
      creditsUsed.push(response.creditsUsed);
    }

    const pageItems = Array.isArray(response.payload.items) ? response.payload.items : [];
    for (const item of pageItems) {
      const record = objectRecord(item);
      if (record) {
        items.push(record);
      }
    }

    const nextLink = objectRecord(response.payload.links)?.next;
    nextPathOrUrl = typeof nextLink === "string" && nextLink.trim() ? nextLink : null;
  }

  const firstPage = pages[0] ?? {};

  return {
    payload: {
      ...firstPage,
      items,
      pages_count: pages.length
    },
    creditsUsed
  };
}

function extractProcessEntriesFromV2Response(payload: Record<string, unknown>, fallbackTribunal: string) {
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const processEntries: EscavadorNormalizedProcess[] = [];

  for (const rawItem of rawItems) {
    const item = objectRecord(rawItem);
    if (!item) continue;

    const processNumber = String(item.numero_cnj ?? item.numero ?? item.cnj ?? "").trim();
    if (!processNumber) continue;

    const unidadeOrigem = objectRecord(item.unidade_origem);
    const estadoOrigem = objectRecord(item.estado_origem);
    const firstFonte = Array.isArray(item.fontes) ? objectRecord(item.fontes[0]) : null;
    const capa = objectRecord(firstFonte?.capa);
    const assuntoPrincipal = objectRecord(capa?.assunto_principal_normalizado);
    const tiposEnvolvidoPesquisado = Array.isArray(firstFonte?.tipos_envolvido_pesquisado)
      ? objectRecord(firstFonte?.tipos_envolvido_pesquisado[0])
      : null;

    const tribunal =
      (typeof unidadeOrigem?.tribunal_sigla === "string" ? unidadeOrigem.tribunal_sigla : null) ??
      (typeof objectRecord(firstFonte?.tribunal)?.sigla === "string" ? String(objectRecord(firstFonte?.tribunal)?.sigla) : null) ??
      fallbackTribunal;

    const subjectSummary = uniqueStrings([
      typeof capa?.classe === "string" ? capa.classe : null,
      typeof capa?.assunto === "string" ? capa.assunto : null,
      typeof assuntoPrincipal?.nome === "string" ? assuntoPrincipal.nome : null,
      typeof item.titulo_polo_ativo === "string" ? `Polo ativo: ${item.titulo_polo_ativo}` : null,
      typeof item.titulo_polo_passivo === "string" ? `Polo passivo: ${item.titulo_polo_passivo}` : null,
      typeof estadoOrigem?.sigla === "string" ? `UF: ${estadoOrigem.sigla}` : null
    ]).join(" | ");

    const sourceLink =
      (typeof firstFonte?.url === "string" ? firstFonte.url : null) ??
      (typeof item.url === "string" ? item.url : null);

    const roleHint = uniqueStrings([
      typeof tiposEnvolvidoPesquisado?.tipo_normalizado === "string" ? tiposEnvolvidoPesquisado.tipo_normalizado : null,
      typeof tiposEnvolvidoPesquisado?.tipo === "string" ? tiposEnvolvidoPesquisado.tipo : null,
      typeof tiposEnvolvidoPesquisado?.polo === "string" ? tiposEnvolvidoPesquisado.polo : null
    ]).join(" | ");

    processEntries.push({
      process_number: processNumber,
      tribunal,
      role_hint: roleHint || null,
      subject_summary: subjectSummary || null,
      last_movement_at:
        (typeof item.data_ultima_movimentacao === "string" ? item.data_ultima_movimentacao : null) ??
        (typeof firstFonte?.data_ultima_movimentacao === "string" ? firstFonte.data_ultima_movimentacao : null),
      source_link: sourceLink,
      raw_payload: item
    });
  }

  return processEntries.filter(
    (item, index, items) =>
      items.findIndex(
        (candidate) => candidate.process_number === item.process_number && (candidate.tribunal ?? "") === (item.tribunal ?? "")
      ) === index
  );
}

async function upsertSearchRecord({
  existing,
  caseId,
  officeId,
  requestedBy,
  partyId,
  cpf,
  tribunal,
  requestPayload,
  responsePayload,
  status,
  errorMessage
}: {
  existing?: AuthorExternalSearch | null;
  caseId: string;
  officeId: string;
  requestedBy: string | null;
  partyId: string;
  cpf: string;
  tribunal: string;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown>;
  status: AuthorExternalSearchStatus;
  errorMessage: string | null;
}) {
  const admin = createAdminClient();
  const payload = {
    office_id: officeId,
    case_id: caseId,
    party_id: partyId,
    provider: "escavador",
    cpf,
    tribunal,
    status,
    provider_search_id:
      typeof responsePayload.request_hash === "string"
        ? responsePayload.request_hash
        : existing?.provider_search_id ?? null,
    provider_result_url: existing?.provider_result_url ?? null,
    request_payload: requestPayload,
    raw_response: responsePayload,
    error_message: errorMessage,
    requested_by: requestedBy,
    requested_at: existing?.requested_at ?? new Date().toISOString(),
    last_synced_at: new Date().toISOString()
  };

  const { data, error } = await admin
    .from("AA_author_external_searches")
    .upsert(payload, {
      onConflict: "case_id,party_id,provider,cpf,tribunal"
    })
    .select("*")
    .single<AuthorExternalSearch>();

  if (error) {
    throw new Error("Nao foi possivel persistir a consulta externa do autor.");
  }

  return data;
}

async function replaceSearchProcesses({
  search,
  processes
}: {
  search: AuthorExternalSearch;
  processes: EscavadorNormalizedProcess[];
}) {
  const admin = createAdminClient();
  await admin.from("AA_author_external_processes").delete().eq("search_id", search.id);

  if (processes.length === 0) {
    return [];
  }

  const rows = processes.map((processItem) => ({
    office_id: search.office_id,
    case_id: search.case_id,
    party_id: search.party_id,
    search_id: search.id,
    provider: "escavador",
    process_number: processItem.process_number,
    tribunal: processItem.tribunal,
    role_hint: processItem.role_hint,
    subject_summary: processItem.subject_summary,
    last_movement_at: processItem.last_movement_at,
    source_link: processItem.source_link,
    raw_payload: processItem.raw_payload
  }));

  const { data, error } = await admin
    .from("AA_author_external_processes")
    .insert(rows)
    .select("*")
    .returns<AuthorExternalProcess[]>();

  if (error) {
    throw new Error("Nao foi possivel salvar os processos retornados pela consulta externa.");
  }

  return data ?? [];
}

async function executeV2Search({
  existing,
  caseId,
  officeId,
  requestedBy,
  partyId,
  authorName,
  cpf,
  tribunal,
  cpfSource,
  cpfReasoning,
  needsHumanValidation
}: {
  existing?: AuthorExternalSearch | null;
  caseId: string;
  officeId: string;
  requestedBy: string | null;
  partyId: string;
  authorName: string;
  cpf: string;
  tribunal: string;
  cpfSource: string;
  cpfReasoning: string;
  needsHumanValidation: boolean;
}) {
  const requestPath = buildEscavadorInvolvedSearchPath({ cpf, tribunal });
  const response = await fetchEscavadorInvolvedProcesses({ cpf, tribunal });
  const extractedProcesses = extractProcessEntriesFromV2Response(response.payload, tribunal);
  const finalStatus = toEscavadorStatus(extractedProcesses.length);
  const requestPayload = {
    author_name: authorName,
    cpf_source: cpfSource,
    cpf_reasoning: cpfReasoning,
    needs_human_validation: needsHumanValidation,
    target_origin: tribunal,
    endpoint: "/envolvido/processos",
    query: {
      cpf_cnpj: digitsOnly(cpf),
      limit: ESCAVADOR_DEFAULT_LIMIT,
      tribunais: tribunal === ESCAVADOR_ALL_ORIGINS ? [] : [tribunal]
    },
    request_path: requestPath,
    credits_used: response.creditsUsed,
    pages_count: response.payload.pages_count ?? 1
  };

  const persistedSearch = await upsertSearchRecord({
    existing,
    caseId,
    officeId,
    requestedBy,
    partyId,
    cpf,
    tribunal,
    requestPayload,
    responsePayload: response.payload,
    status: finalStatus,
    errorMessage: null
  });

  const persistedProcesses = await replaceSearchProcesses({
    search: persistedSearch,
    processes: extractedProcesses
  });

  return {
    search: persistedSearch,
    status: finalStatus,
    processesFound: persistedProcesses.length
  };
}

export async function requestAuthorExternalSearches(caseId: string, profile: Profile) {
  if (!profile.office_id) {
    throw new Error("Perfil interno sem office_id.");
  }

  resolveEscavadorToken();

  const identified = await identifyAuthorCpfs(caseId);
  if (!identified) {
    throw new Error("Caso nao encontrado.");
  }

  const authors = identified.caseItem.parties.filter((party) => party.role === "author");
  if (authors.length === 0) {
    return {
      submitted: 0,
      skipped: 0,
      unresolved: 0,
      resolutions: [] as AuthorCpfResolution[],
      processesFound: 0
    };
  }

  const admin = createAdminClient();
  const { data: existingSearches } = await admin
    .from("AA_author_external_searches")
    .select("*")
    .eq("case_id", caseId)
    .returns<AuthorExternalSearch[]>();

  let submitted = 0;
  let skipped = 0;
  let processesFound = 0;
  const unresolved = identified.resolutions.filter((item) => !item.cpf).length;

  for (const resolution of identified.resolutions) {
    if (!resolution.cpf) {
      continue;
    }

    for (const origin of identified.origins) {
      const existing =
        existingSearches?.find(
          (item) =>
            item.party_id === resolution.party.id &&
            digitsOnly(item.cpf) === digitsOnly(resolution.cpf ?? "") &&
            item.tribunal === origin
        ) ?? null;

      if (existing && existing.status !== "failed") {
        skipped += 1;
        continue;
      }

      try {
        const result = await executeV2Search({
          existing,
          caseId,
          officeId: profile.office_id,
          requestedBy: profile.id,
          partyId: resolution.party.id,
          authorName: resolution.party.name,
          cpf: resolution.cpf,
          tribunal: origin,
          cpfSource: resolution.source,
          cpfReasoning: resolution.reasoning,
          needsHumanValidation: resolution.needsHumanValidation
        });

        submitted += 1;
        processesFound += result.processesFound;
      } catch (error) {
        await upsertSearchRecord({
          existing,
          caseId,
          officeId: profile.office_id,
          requestedBy: profile.id,
          partyId: resolution.party.id,
          cpf: resolution.cpf,
          tribunal: origin,
          requestPayload: {
            author_name: resolution.party.name,
            cpf_source: resolution.source,
            cpf_reasoning: resolution.reasoning,
            needs_human_validation: resolution.needsHumanValidation,
            target_origin: origin,
            endpoint: "/envolvido/processos"
          },
          responsePayload: {},
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Falha desconhecida ao consultar o Escavador."
        });
      }
    }
  }

  return {
    submitted,
    skipped,
    unresolved,
    resolutions: identified.resolutions,
    processesFound
  };
}

export async function refreshAuthorExternalSearches(caseId: string) {
  const admin = createAdminClient();
  const { data: searches, error } = await admin
    .from("AA_author_external_searches")
    .select("*")
    .eq("case_id", caseId)
    .eq("provider", "escavador")
    .returns<AuthorExternalSearch[]>();

  if (error) {
    throw new Error("Nao foi possivel carregar as consultas externas deste caso.");
  }

  const persistedSearches = searches ?? [];

  if (persistedSearches.length === 0) {
    return {
      refreshed: 0,
      completed: 0,
      processesFound: 0,
      notFound: 0
    };
  }

  let refreshed = 0;
  let completed = 0;
  let notFound = 0;
  let processesFound = 0;

  for (const search of persistedSearches) {
    try {
      const result = await executeV2Search({
        existing: search,
        caseId: search.case_id,
        officeId: search.office_id,
        requestedBy: search.requested_by,
        partyId: search.party_id,
        authorName: String(search.request_payload.author_name ?? ""),
        cpf: search.cpf,
        tribunal: search.tribunal,
        cpfSource: String(search.request_payload.cpf_source ?? "unknown"),
        cpfReasoning: String(search.request_payload.cpf_reasoning ?? ""),
        needsHumanValidation: Boolean(search.request_payload.needs_human_validation)
      });

      if (result.status === "completed") {
        completed += 1;
        processesFound += result.processesFound;
      } else if (result.status === "not_found") {
        notFound += 1;
      }

      refreshed += 1;
    } catch (error) {
      await upsertSearchRecord({
        existing: search,
        caseId: search.case_id,
        officeId: search.office_id,
        requestedBy: search.requested_by,
        partyId: search.party_id,
        cpf: search.cpf,
        tribunal: search.tribunal,
        requestPayload: search.request_payload,
        responsePayload: objectRecord(search.raw_response) ?? {},
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Falha desconhecida ao atualizar a consulta do Escavador."
      });
      refreshed += 1;
    }
  }

  return {
    refreshed,
    completed,
    processesFound,
    notFound
  };
}
