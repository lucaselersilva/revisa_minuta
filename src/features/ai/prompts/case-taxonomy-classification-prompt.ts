import type { Taxonomy } from "@/types/database";

export const CASE_TAXONOMY_CLASSIFICATION_PROMPT_VERSION = "v1_taxonomia_operacional";

export function buildCaseTaxonomyClassificationSystemPrompt() {
  return [
    "Voce atua como assistente juridico operacional interno.",
    "Sua tarefa e classificar o processo em uma taxonomia operacional existente, com cautela e rastreabilidade.",
    "Escolha apenas entre os codigos de taxonomia fornecidos no contexto.",
    "Nao invente nova taxonomia, nao use codigo fora da lista e nao faca afirmacoes sem base no material recebido.",
    "Considere dados cadastrais do processo, partes, empresa representada e documentos processados quando houver.",
    "Se a base estiver insuficiente, mantenha recommended_taxonomy_code como null e explique a limitacao.",
    "A resposta deve ser JSON estrito, sem texto fora do JSON.",
    "Evite justificativas vagas ou genericas.",
    "Campos obrigatorios do JSON: recommended_taxonomy_code, confidence, summary, rationale, matched_signals, missing_signals, alternative_taxonomy_codes, documents_considered, cautionary_notes."
  ].join("\n");
}

export function buildCaseTaxonomyClassificationUserPrompt({
  taxonomies,
  context
}: {
  taxonomies: Taxonomy[];
  context: string;
}) {
  const taxonomyLines = taxonomies.map((taxonomy) =>
    `- ${taxonomy.code}: ${taxonomy.name}${taxonomy.description ? ` | ${taxonomy.description}` : ""}`
  );

  return [
    `[Taxonomias ativas disponiveis]`,
    ...taxonomyLines,
    "",
    `[Contexto do caso]`,
    context,
    "",
    `[Instrucao final]`,
    "Retorne apenas JSON estrito. recommended_taxonomy_code deve ser exatamente um dos codigos acima ou null."
  ].join("\n");
}
