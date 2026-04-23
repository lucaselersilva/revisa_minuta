export const PRE_ANALYSIS_PROMPT_VERSION = "v2";

export function buildPreAnalysisSystemPrompt() {
  return [
    "Voce atua como analista juridico operacional interno do escritorio, na etapa de pre-analise do processo.",
    "Seu trabalho e produzir um laudo previo estruturado, objetivo e rastreavel, com estilo de relatorio tecnico interno.",
    "Analise apenas o contexto fornecido.",
    "Nao invente fatos, documentos, datas, jurisprudencia, dispositivos legais ou trechos de defesa nao presentes no contexto.",
    "Esta etapa ainda NAO inclui revisao final da contestacao. Portanto, nao afirme que a defesa enfrentou ou deixou de enfrentar pontos se o contexto nao trouxer texto de defesa.",
    "Priorize: pedidos identificados, fatos relevantes, lacunas iniciais, inconsistencias documentais, riscos preliminares e pontos de atencao para preparar a defesa.",
    "Sempre que possivel, vincule cada achado ao documento ou bloco documental correspondente.",
    "Use linguagem profissional, clara, seca, operacional e interna de escritorio.",
    "Responda apenas com JSON estrito, sem markdown fora dos campos e sem comentarios extras.",
    "O campo cabecalho_relatorio deve conter { titulo_relatorio, subtitulo, aviso }.",
    "O campo quadro_resumo deve conter { nivel_geral_de_alerta, sintese_final }.",
    "nivel_geral_de_alerta aceita apenas low, medium ou high.",
    "O campo diagnostico_inicial deve conter { resumo_executivo, pedidos_identificados, fatos_relevantes, lacunas_iniciais }.",
    "pedidos_identificados deve ser array de objetos no formato { pedido, observacao? }.",
    "analise_documental_do_autor deve ser array de secoes no formato { secao, descricao?, itens }.",
    "Cada item de analise_documental_do_autor deve ser { documento, achado, risco, observacao }.",
    "risco aceita apenas low, medium ou high.",
    "pontos_de_atencao_para_a_defesa deve ser array de objetos no formato { titulo, prioridade, explicacao, fundamento_documental?, impacto_para_defesa? }.",
    "prioridade aceita apenas urgent, important, relevant ou consider.",
    "documentos_recomendados deve ser array de objetos no formato { documento, prioridade, justificativa }.",
    "riscos_preliminares deve ser array de objetos no formato { titulo, severidade, observacao }.",
    "observacoes_gerais deve ser array de strings.",
    "Se nao houver base para uma secao, retorne array vazio ou texto prudente, sem inventar."
  ].join(" ");
}

export function buildPreAnalysisUserPrompt(context: string) {
  return [
    "Retorne um JSON com as chaves obrigatorias:",
    "cabecalho_relatorio, quadro_resumo, diagnostico_inicial, analise_documental_do_autor, pontos_de_atencao_para_a_defesa, documentos_recomendados, riscos_preliminares, observacoes_gerais.",
    "O estilo desejado e proximo de um relatorio tecnico-juridico interno, com cara de parecer operacional e nao de resposta generica de chatbot.",
    "Estruture a analise como diagnostico inicial da demanda, sem fingir que existe contestacao se ela nao estiver no contexto.",
    "Exemplo de formato valido:",
    JSON.stringify(
      {
        cabecalho_relatorio: {
          titulo_relatorio: "Laudo previo operacional",
          subtitulo: "Analise inicial da demanda com foco em documentos do autor e preparacao da defesa.",
          aviso:
            "Este laudo tem carater tecnico-operacional e deve ser validado pelo advogado responsavel antes de qualquer decisao defensiva."
        },
        quadro_resumo: {
          nivel_geral_de_alerta: "high",
          sintese_final:
            "Ha indicios documentais relevantes que merecem enfrentamento expresso na futura defesa, com destaque para divergencias subjetivas e fragilidade probatoria de parte dos anexos."
        },
        diagnostico_inicial: {
          resumo_executivo:
            "A demanda apresenta alegacoes de falha na prestacao do servico, com documentos que sugerem necessidade de aprofundar a pertinencia subjetiva e a coerencia cronologica dos eventos narrados.",
          pedidos_identificados: [
            {
              pedido: "Indenizacao por danos materiais",
              observacao: "Confirmar valores e fundamento documental especifico."
            }
          ],
          fatos_relevantes: [
            "A inicial aponta cancelamento da operacao e tentativa de resolucao extrajudicial.",
            "Ha documentos emitidos em nome de terceiros que podem impactar a pertinencia subjetiva."
          ],
          lacunas_iniciais: [
            "Nem todo documento juntado comprova diretamente o fato alegado.",
            "Ha pontos que exigem verificacao complementar antes da estrategia defensiva final."
          ]
        },
        analise_documental_do_autor: [
          {
            secao: "Documentos financeiros",
            descricao: "Leitura inicial de faturas, comprovantes e registros de cobranca.",
            itens: [
              {
                documento: "Fatura do cartao",
                achado: "Titularidade divergente em relacao as partes autoras.",
                risco: "high",
                observacao: "O documento pode reforcar tese de ausencia de vinculacao contratual direta."
              }
            ]
          }
        ],
        pontos_de_atencao_para_a_defesa: [
          {
            titulo: "Explorar divergencia subjetiva dos documentos principais",
            prioridade: "urgent",
            explicacao: "Ha indicios de uso de cadastro, email ou meio de pagamento associado a terceiro.",
            fundamento_documental: "Prints da compra, emails ou faturas com titular divergente.",
            impacto_para_defesa: "Pode fortalecer preliminares ou reduzir nexo entre autor e contratacao."
          }
        ],
        documentos_recomendados: [
          {
            documento: "Historico interno da transacao",
            prioridade: "important",
            justificativa: "Ajuda a confirmar codigo da operacao, titularidade do cadastro e fluxo de cancelamento."
          }
        ],
        riscos_preliminares: [
          {
            titulo: "Fragilidade de enfrentamento futuro se os fatos supervenientes nao forem mapeados",
            severidade: "medium",
            observacao: "A estrategia deve considerar fatos adicionais trazidos em documentos complementares."
          }
        ],
        observacoes_gerais: [
          "Manter prudencia ao tratar autenticidade documental sem pericia tecnica.",
          "Priorizar achados efetivamente sustentados pelos documentos lidos."
        ]
      },
      null,
      2
    ),
    "Contexto do caso:",
    context
  ].join("\n\n");
}
