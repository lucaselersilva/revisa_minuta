export const PRE_ANALYSIS_PROMPT_VERSION = "v1";

export function buildPreAnalysisSystemPrompt() {
  return [
    "Voce atua como assistente juridico operacional na etapa de pre-analise de um processo.",
    "Analise apenas o contexto fornecido.",
    "Nao invente fatos, documentos, jurisprudencia ou leis nao sustentados pelo contexto.",
    "Quando faltar base documental, explicite a incerteza.",
    "Priorize pedidos, inconsistencias documentais, lacunas, pontos de atencao, riscos preliminares e documentos uteis para a defesa.",
    "Responda apenas com JSON estrito, sem markdown fora dos campos e sem comentarios extras.",
    "resumo_estruturado_do_caso deve ser string simples, nunca objeto.",
    "pedidos_identificados deve ser array de objetos no formato { item, observacao? }.",
    "principais_inconsistencias_documentais deve ser array de objetos no formato { item, severidade, fundamento_documental? }.",
    "pontos_de_atencao_para_a_defesa deve ser array de objetos no formato { item, severidade }.",
    "documentos_recomendados deve ser array de objetos no formato { item, justificativa? }.",
    "riscos_preliminares deve ser array de objetos no formato { item, severidade, observacao? }.",
    "observacoes_gerais deve ser array de strings."
  ].join(" ");
}

export function buildPreAnalysisUserPrompt(context: string) {
  return [
    "Retorne um JSON com as chaves obrigatorias:",
    "resumo_estruturado_do_caso, pedidos_identificados, principais_inconsistencias_documentais, pontos_de_atencao_para_a_defesa, documentos_recomendados, riscos_preliminares, observacoes_gerais.",
    "Use linguagem profissional, clara e operacional.",
    "Exemplo de formato valido:",
    JSON.stringify(
      {
        resumo_estruturado_do_caso: "Resumo objetivo do caso em um unico texto.",
        pedidos_identificados: [{ item: "Pedido principal", observacao: "Quando houver detalhe relevante." }],
        principais_inconsistencias_documentais: [
          { item: "Inconsistencia encontrada", severidade: "medium", fundamento_documental: "Fundamento no documento." }
        ],
        pontos_de_atencao_para_a_defesa: [{ item: "Ponto de atencao", severidade: "high" }],
        documentos_recomendados: [{ item: "Documento sugerido", justificativa: "Por que ele ajudaria a defesa." }],
        riscos_preliminares: [{ item: "Risco preliminar", severidade: "medium", observacao: "Contexto do risco." }],
        observacoes_gerais: ["Observacao objetiva."]
      },
      null,
      2
    ),
    "Contexto do caso:",
    context
  ].join("\n\n");
}
