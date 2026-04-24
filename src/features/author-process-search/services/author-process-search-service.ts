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

const ESCAVADOR_API_URL = "https://api.escavador.com/api/v1";
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

type EscavadorAsyncSearchResponse = {
  id?: number | string;
  link_api?: string | null;
  status?: string | null;
  motivo_erro?: string | null;
  tribunal?: {
    sigla?: string | null;
    nome?: string | null;
  } | null;
  resposta?: unknown;
  valor?: string | null;
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

function normalizeEscavadorStatus(value: string | null | undefined): AuthorExternalSearchStatus {
  const normalized = (value ?? "").trim().toUpperCase();

  if (!normalized) return "failed";
  if (normalized.includes("PEND")) return "pending";
  if (normalized.includes("SUCESSO") || normalized.includes("CONCL") || normalized.includes("FINAL")) return "completed";
  if (normalized.includes("NAO_ENCONTRADO") || normalized.includes("NÃO_ENCONTRADO") || normalized.includes("SEM_RESULTADO")) {
    return "not_found";
  }
  if (normalized.includes("ERRO") || normalized.includes("FALH")) return "failed";

  return "failed";
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

  return uniqueStrings([...configuredOrigins, inferred ?? null, configuredOrigins.length === 0 && !inferred ? "CNJ" : null]);
}

async function fetchInitialDocumentText(caseId: string) {
  const caseItem = await getCaseById(caseId);
  if (!caseItem) {
    return "";
  }

  const targetDocumentIds = caseItem.documents
    .filter(
      (document) =>
        document.document_type === "initial_petition" || document.document_type === "initial_amendment"
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

async function callEscavador(path: string, init?: RequestInit) {
  const token = resolveEscavadorToken();
  const response = await fetch(`${ESCAVADOR_API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
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

async function submitEscavadorDocumentSearch({ tribunal, cpf }: { tribunal: string; cpf: string }) {
  const response = await callEscavador(`/tribunal/${tribunal}/busca-por-documento/async`, {
    method: "POST",
    body: JSON.stringify({
      numero_documento: cpf,
      permitir_parcial: 0,
      send_callback: 0
    })
  });

  return {
    payload: response.data as EscavadorAsyncSearchResponse & Record<string, unknown>,
    creditsUsed: response.creditsUsed
  };
}

async function fetchEscavadorAsyncResult(resultUrl: string) {
  const token = resolveEscavadorToken();
  const response = await fetch(resultUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`
    }
  });
  const bodyText = await response.text();
  const parsedBody = bodyText ? safeJsonParse(bodyText) : null;

  if (!response.ok) {
    const message =
      typeof parsedBody === "object" && parsedBody && "error" in parsedBody
        ? String(parsedBody.error)
        : bodyText || `Escavador retornou HTTP ${response.status}.`;
    throw new Error(message);
  }

  return parsedBody as EscavadorAsyncSearchResponse & Record<string, unknown>;
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function extractProcessEntriesFromAsyncResponse(payload: Record<string, unknown>, fallbackTribunal: string) {
  const answer = payload.resposta;
  const processEntries: EscavadorNormalizedProcess[] = [];
  const systems = Array.isArray(answer) ? answer : [answer];

  for (const system of systems) {
    const systemRecord = objectRecord(system);
    if (!systemRecord) continue;

    const processes = Array.isArray(systemRecord.processos) ? systemRecord.processos : [];

    for (const rawProcess of processes) {
      const processRecord = objectRecord(rawProcess);
      if (!processRecord) continue;

      const processNumber = String(
        processRecord.numero_unico ??
          processRecord.numero ??
          processRecord.numero_processo ??
          processRecord.cnj ??
          ""
      ).trim();

      if (!processNumber) continue;

      const subjectSummary = uniqueStrings([
        typeof systemRecord.nome === "string" ? systemRecord.nome : null,
        typeof processRecord.classe === "string" ? processRecord.classe : null,
        typeof processRecord.assunto === "string" ? processRecord.assunto : null
      ]).join(" | ");

      processEntries.push({
        process_number: processNumber,
        tribunal:
          (typeof processRecord.origem === "string" ? processRecord.origem : null) ??
          (typeof payload.tribunal === "object" && payload.tribunal && "sigla" in payload.tribunal
            ? String(payload.tribunal.sigla ?? "")
            : null) ??
          fallbackTribunal,
        role_hint: typeof systemRecord.instancia === "string" ? systemRecord.instancia : null,
        subject_summary: subjectSummary || null,
        last_movement_at:
          (typeof processRecord.last_update_time === "string" ? processRecord.last_update_time : null) ??
          (typeof processRecord.data === "string" ? processRecord.data : null),
        source_link:
          (typeof processRecord.url === "string" ? processRecord.url : null) ??
          (typeof processRecord.link === "string" ? processRecord.link : null),
        raw_payload: processRecord
      });
    }
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
    provider_search_id: responsePayload.id ? String(responsePayload.id) : existing?.provider_search_id ?? null,
    provider_result_url:
      typeof responsePayload.link_api === "string" ? responsePayload.link_api : existing?.provider_result_url ?? null,
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

  if (identified.origins.length === 0) {
    throw new Error("Nao foi possivel definir um tribunal de consulta para o caso.");
  }

  const admin = createAdminClient();
  const { data: existingSearches } = await admin
    .from("AA_author_external_searches")
    .select("*")
    .eq("case_id", caseId)
    .returns<AuthorExternalSearch[]>();

  let submitted = 0;
  let skipped = 0;
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

      const requestPayload = {
        author_name: resolution.party.name,
        cpf_source: resolution.source,
        cpf_reasoning: resolution.reasoning,
        needs_human_validation: resolution.needsHumanValidation,
        target_origin: origin
      };

      try {
        const response = await submitEscavadorDocumentSearch({
          tribunal: origin,
          cpf: resolution.cpf
        });
        const normalizedStatus = normalizeEscavadorStatus(response.payload.status);
        const extractedProcesses =
          normalizedStatus === "completed"
            ? extractProcessEntriesFromAsyncResponse(response.payload, origin)
            : [];
        const finalStatus =
          normalizedStatus === "completed" && extractedProcesses.length === 0 ? "not_found" : normalizedStatus;

        const persistedSearch = await upsertSearchRecord({
          existing,
          caseId,
          officeId: profile.office_id,
          requestedBy: profile.id,
          partyId: resolution.party.id,
          cpf: resolution.cpf,
          tribunal: origin,
          requestPayload: {
            ...requestPayload,
            credits_used: response.creditsUsed
          },
          responsePayload: response.payload,
          status: finalStatus,
          errorMessage: response.payload.motivo_erro ?? null
        });

        if (finalStatus === "completed") {
          await replaceSearchProcesses({
            search: persistedSearch,
            processes: extractedProcesses
          });
        }
        submitted += 1;
      } catch (error) {
        await upsertSearchRecord({
          existing,
          caseId,
          officeId: profile.office_id,
          requestedBy: profile.id,
          partyId: resolution.party.id,
          cpf: resolution.cpf,
          tribunal: origin,
          requestPayload,
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
    processesFound: 0
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

  const pendingSearches = (searches ?? []).filter((item) => item.status === "pending" && item.provider_result_url);

  if (pendingSearches.length === 0) {
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

  for (const search of pendingSearches) {
    try {
      const response = await fetchEscavadorAsyncResult(String(search.provider_result_url));
      const normalizedStatus = normalizeEscavadorStatus(response.status);
      const responseRecord = objectRecord(response) ?? {};
      const extractedProcesses =
        normalizedStatus === "completed"
          ? extractProcessEntriesFromAsyncResponse(responseRecord, search.tribunal)
          : [];
      const finalStatus =
        normalizedStatus === "completed" && extractedProcesses.length === 0 ? "not_found" : normalizedStatus;

      const updatedSearch = await upsertSearchRecord({
        existing: search,
        caseId: search.case_id,
        officeId: search.office_id,
        requestedBy: search.requested_by,
        partyId: search.party_id,
        cpf: search.cpf,
        tribunal: search.tribunal,
        requestPayload: search.request_payload,
        responsePayload: responseRecord,
        status: finalStatus,
        errorMessage: response.motivo_erro ?? null
      });

      if (finalStatus === "completed" || finalStatus === "not_found") {
        const persisted = await replaceSearchProcesses({
          search: updatedSearch,
          processes: extractedProcesses
        });

        if (finalStatus === "completed") {
          completed += 1;
          processesFound += persisted.length;
        } else {
          notFound += 1;
        }
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
        errorMessage: error instanceof Error ? error.message : "Falha desconhecida ao consultar o resultado do Escavador."
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
