export const PRE_ANALYSIS_PROMPT_VERSION = "v2_prova_autor_defesa";

export function buildPreAnalysisSystemPrompt() {
  return [
    "Voce atua como assistente juridico operacional interno da defesa, na etapa de pre-analise do processo.",
    "Seu papel e produzir um laudo previo profundo, especifico, objetivo, rastreavel e orientado a estrategia defensiva, sem alterar fatos e sem extrapolar o conteudo recebido.",
    "Analise apenas o conteudo fornecido no contexto: peticao inicial, pedidos, documentos do autor, eventual emenda, partes, metadados do caso e textos extraidos.",
    "Nao invente fatos, datas, valores, pedidos, jurisprudencia, fundamentos normativos, autoria documental, fraude, ma-fe, adulteracao comprovada ou conclusoes periciais.",
    "Nao afirme fraude. Voce pode apontar apenas: indicio de inconsistencia, indicio de edicao, baixa confiabilidade, necessidade de validacao humana e necessidade de documento complementar.",
    "Quando faltar base suficiente, declare expressamente: nao foi possivel verificar com os documentos disponiveis.",
    "Esta etapa nao inclui OCR robusto nem visao computacional pericial.",
    "So avalie assinatura, foto, layout, recorte, interface, edicao ou compatibilidade visual se isso estiver descrito no texto extraido ou no conteudo efetivamente fornecido.",
    "Se o sistema nao tiver extraido informacao visual suficiente, marque como nao verificavel ou registre a limitacao a partir do texto extraido.",
    "Use linguagem tecnica, cautelosa, operacional, interna de escritorio e voltada a preparacao da defesa.",
    "A analise deve confrontar narrativa, pedidos e documentos, indicando o que esta provado, o que nao esta provado, onde ha lacunas, onde ha divergencias entre partes ou terceiros e quais pontos sao exploraveis pela defesa.",
    "Avalie, sempre que houver base documental: individualizacao por autor, cadeia negocial, cronologia, coerencia entre documentos, peso probatorio, regularidade aparente da representacao processual, compatibilidade entre canal alegado e documento, integridade tecnica aparente e suficiencia probatoria minima.",
    "Se houver litisconsorcio, diferencie documentos, pedidos, danos e lacunas por autor.",
    "Se houver divergencia entre comprador, pagador, beneficiario, reclamante ou destinatario de estorno, destaque isso de forma objetiva.",
    "Responda apenas com JSON estrito, sem markdown fora dos campos e sem comentarios extras.",
    "Todos os campos obrigatorios devem existir, ainda que com arrays vazios, null quando previsto, ou textos prudentes.",
    "Use exatamente os enums exigidos pelo schema.",
    "O JSON obrigatorio deve conter exatamente estas chaves de primeiro nivel:",
    "resumo_executivo, matriz_final_confronto, analise_narrativa_vs_documentos, analise_individualizada_por_autor, cadeia_negocial, cronologia, coerencia_entre_documentos, analise_por_tipo_documental, suficiencia_probatoria, pedido_indenizatorio, compatibilidade_canal_documento, integridade_tecnica_arquivos, representacao_processual, espacialidade, indicios_litigancia_padronizada, pontos_exploraveis_defesa, documentos_internos_recomendados_para_defesa, alertas_de_nao_conclusao.",
    "Na matriz_final_confronto, explicite separadamente: o que o autor narra, o que os documentos provam, o que os documentos nao provam e o que pode ser explorado pela defesa.",
    "Em analise_narrativa_vs_documentos, conclua se os documentos embasam a narrativa e os pedidos, usando apenas: sim, parcialmente, nao ou inconclusivo.",
    "Em analise_por_tipo_documental, use assinatura_compatibilidade apenas com: compativel, incompativel, indicio_de_inconsistencia ou nao_verificavel.",
    "Em prints_tela.qualidade_probatoria use apenas: forte, media, fraca ou inconclusiva.",
    "Em suficiencia_probatoria.conclusao use apenas: suficiente, parcial, insuficiente ou inconclusiva.",
    "Em pedido_indenizatorio use apenas: sim, parcialmente, nao ou inconclusivo.",
    "Em representacao_processual.regularidade_aparente use apenas: regular, parcial, irregular ou inconclusiva.",
    "Cada item de pontos_exploraveis_defesa deve conter ponto, categoria, relevancia, explorabilidade, necessita_validacao_humana e justificativa.",
    "Nao omita limitacoes tecnicas. Registre com clareza quando algo depender de validacao humana."
  ].join(" ");
}

export function buildPreAnalysisUserPrompt(context: string) {
  return [
    "Retorne um JSON estrito com todas as chaves obrigatorias abaixo:",
    "resumo_executivo, matriz_final_confronto, analise_narrativa_vs_documentos, analise_individualizada_por_autor, cadeia_negocial, cronologia, coerencia_entre_documentos, analise_por_tipo_documental, suficiencia_probatoria, pedido_indenizatorio, compatibilidade_canal_documento, integridade_tecnica_arquivos, representacao_processual, espacialidade, indicios_litigancia_padronizada, pontos_exploraveis_defesa, documentos_internos_recomendados_para_defesa, alertas_de_nao_conclusao.",
    "Diretrizes obrigatorias desta pre-analise:",
    "1. Verifique se os documentos do autor embasam a narrativa da peticao inicial.",
    "2. Verifique se os documentos embasam os pedidos formulados.",
    "3. Diferencie documentos ligados a autores, terceiros ou pessoas nao claramente vinculadas.",
    "4. Avalie a regularidade aparente da procuracao.",
    "5. So avalie assinaturas se houver base textual ou descritiva suficiente; se nao houver, marque nao verificavel.",
    "6. Verifique compatibilidade do documento de identidade com a parte litigante.",
    "7. Verifique compatibilidade do comprovante de endereco com nome e endereco da inicial.",
    "8. Verifique comprovantes de pagamento quanto a nome, data, valor e aderencia ao caso.",
    "9. Avalie prints de tela quanto a interface alegada, recorte, contexto e qualidade probatoria, apenas com base no material efetivamente extraido.",
    "10. Monte cronologia dos fatos e destaque inconsistencias temporais.",
    "11. Verifique coerencia interna entre nomes, datas, valores, localizadores e identificadores.",
    "12. Relacione cada conjunto documental ao pedido indenizatorio correspondente.",
    "13. Individualize autores, especialmente em litisconsorcio.",
    "14. Identifique, se possivel, comprador, pagador, beneficiario, reclamante e destinatario de estorno.",
    "15. Verifique compatibilidade entre canal alegado e documento apresentado.",
    "16. Aponte apenas integridade tecnica aparente do arquivo, respeitando que nao ha OCR nem visao computacional robusta.",
    "17. Conclua sobre suficiencia probatoria minima.",
    "18. Informe a qualidade probatoria dos prints.",
    "19. Verifique correspondencia entre narrativa e extensao documental.",
    "20. Avalie regularidade formal aparente da representacao processual.",
    "21. Identifique elementos de espacialidade.",
    "22. Aponte possiveis indicios de litigancia padronizada somente a partir do proprio caso, sem busca externa.",
    "23. Indique grau de exploracao defensiva possivel.",
    "24. Sugira documentos internos que a re deva buscar para robustecer a defesa.",
    "25. Atribua peso probatorio por tipo documental.",
    "26. Preencha a matriz final de confronto de forma objetiva e nao generica.",
    "Se algo nao puder ser aferido com o material disponivel, use formulações como: nao foi possivel verificar com os documentos disponiveis, depende de validacao humana, a partir do texto extraido.",
    "Exemplo de formato valido:",
    JSON.stringify(
      {
        resumo_executivo:
          "A narrativa autoral apresenta suporte documental parcial. Ha documentos que sugerem tratativas e reclamacoes, mas parte relevante dos pedidos e da individualizacao dos danos nao foi plenamente verificada com os documentos disponiveis.",
        matriz_final_confronto: {
          o_que_autor_narra: [
            "O autor afirma ter contratado servico e sofrido falha posterior com prejuizo material e moral."
          ],
          o_que_documentos_provam: [
            "Os documentos sugerem existencia de interacao comercial e tentativa posterior de suporte."
          ],
          o_que_documentos_nao_provam: [
            "Nao foi possivel verificar com os documentos disponiveis a extensao integral do dano alegado."
          ],
          o_que_pode_ser_explorado_pela_defesa: [
            "Explorar a distancia entre a narrativa ampla da inicial e o suporte documental efetivamente identificado."
          ]
        },
        analise_narrativa_vs_documentos: {
          documentos_embasam_narrativa: {
            conclusao: "parcialmente",
            justificativa:
              "Parte da sequencia fatico-documental encontra apoio nos anexos, mas subsistem lacunas de titularidade, cronologia e correlacao integral com os fatos narrados.",
            pontos_fortes: ["Existem registros documentais de interacao relacionada ao caso."],
            lacunas: ["Nem todos os eventos narrados foram comprovados documentalmente."]
          },
          documentos_embasam_pedidos: {
            conclusao: "parcialmente",
            justificativa:
              "Ha algum suporte para pedidos economicos basicos, mas nao para toda a extensao indenizatoria pretendida.",
            pedidos_sustentados: ["Restituicao de valor minimamente documentado, se houver comprovante aderente."],
            pedidos_nao_sustentados_ou_fracos: ["Dano moral sem base fatico-individualizada suficiente."]
          }
        },
        analise_individualizada_por_autor: [
          {
            nome_autor: "Autor identificado na inicial",
            documentos_vinculados: ["Documento descrito no contexto"],
            pedidos_vinculados: ["Pedido identificado na peticao"],
            danos_individualizados: ["Prejuizo alegado de forma associada ao autor"],
            lacunas_individualizacao: ["Nao foi possivel verificar com os documentos disponiveis toda a extensao individual do dano."],
            observacoes: "Se houver litisconsorcio, diferenciar claramente cada autor."
          }
        ],
        cadeia_negocial: {
          quem_comprou: "nao foi possivel verificar com os documentos disponiveis",
          quem_pagou: null,
          quem_viajou_ou_seria_beneficiario: null,
          quem_reclamou_ou_solicitou_suporte: null,
          quem_recebeu_ou_deveria_receber_estorno: null,
          divergencias_entre_pessoas: []
        },
        cronologia: {
          eventos_identificados: [
            {
              data: null,
              evento: "Fato alegado sem data precisa no material extraido.",
              fonte_documental: null,
              observacao: "Nao foi possivel verificar com os documentos disponiveis a data exata."
            }
          ],
          inconsistencias_temporais: [],
          eventos_sem_prova_temporal: ["Parte dos fatos narrados nao possui marco temporal documental suficiente."]
        },
        coerencia_entre_documentos: {
          nomes_divergentes: [],
          datas_divergentes: [],
          valores_divergentes: [],
          codigos_localizadores_divergentes: [],
          emails_telefones_ou_identificadores_divergentes: [],
          observacoes: "Sem extrapolar alem dos documentos disponiveis."
        },
        analise_por_tipo_documental: {
          procuracao: {
            existe: false,
            regularidade_formal: "Nao foi possivel verificar com os documentos disponiveis.",
            assinatura_compatibilidade: "nao_verificavel",
            pontos_de_atencao: []
          },
          documento_identidade: {
            existe: false,
            compatibilidade_com_parte: "Nao foi possivel verificar com os documentos disponiveis.",
            sinais_de_edicao_ou_layout_incompativel: [],
            pontos_de_atencao: []
          },
          comprovante_endereco: {
            existe: false,
            aderencia_ao_nome_da_parte: "Nao foi possivel verificar com os documentos disponiveis.",
            aderencia_ao_endereco_da_inicial: "Nao foi possivel verificar com os documentos disponiveis.",
            sinais_de_edicao_ou_layout_incompativel: [],
            pontos_de_atencao: []
          },
          comprovantes_pagamento: {
            existem: false,
            aderencia_ao_nome_da_parte: "Nao foi possivel verificar com os documentos disponiveis.",
            datas_valores_identificados: [],
            sinais_de_edicao_ou_layout_incompativel: [],
            pontos_de_atencao: []
          },
          prints_tela: {
            existem: false,
            compatibilidade_com_plataforma_alegada: "Nao foi possivel verificar com os documentos disponiveis.",
            qualidade_probatória: "inconclusiva",
            sinais_de_edicao_ou_recorte: [],
            pontos_de_atencao: []
          },
          outros_documentos: []
        },
        suficiencia_probatoria: {
          conclusao: "parcial",
          provas_fortes: [],
          provas_fracas_ou_unilaterais: ["Prints ou declaracoes sem lastro complementar, se esse for o caso do contexto."],
          documentos_chave_ausentes: ["Documento interno de transacao ou log operacional, se pertinente ao caso."],
          observacoes: "A conclusao deve ser proporcional ao que foi efetivamente anexado."
        },
        pedido_indenizatorio: {
          dano_material_tem_prova_minima: "inconclusivo",
          valor_pedido_tem_suporte_documental: "inconclusivo",
          dano_moral_tem_base_fatica_individualizada: "nao",
          despesas_extraordinarias_comprovadas: [],
          lacunas: ["Nao foi possivel verificar com os documentos disponiveis a base integral do pedido indenizatorio."]
        },
        compatibilidade_canal_documento: {
          alegacoes_vs_canais_comprovados: [],
          prova_de_contratacao: [],
          prova_de_tentativa: [],
          prova_de_oferta_ou_pre_reserva: [],
          mera_consulta_ou_print_inconclusivo: []
        },
        integridade_tecnica_arquivos: {
          sinais_possiveis_de_manipulacao: [],
          limitacoes_da_analise: [
            "Analise restrita ao texto extraido e aos metadados disponibilizados.",
            "Nao ha OCR ou pericia visual robusta nesta etapa."
          ],
          necessita_validacao_humana: true
        },
        representacao_processual: {
          regularidade_aparente: "inconclusiva",
          pontos_de_atencao: ["Checar procuracao e documentos pessoais, se ausentes ou insuficientes."],
          autores_sem_procuracao_ou_documento: []
        },
        espacialidade: {
          cidades_enderecos_identificados: [],
          inconsistencias_territoriais: [],
          observacoes: "Registrar apenas elementos territoriais efetivamente encontrados."
        },
        indicios_litigancia_padronizada: {
          indicios: [],
          elementos_recorrentes: [],
          observacoes: "Nao inferir padronizacao sem apoio concreto no proprio material do caso."
        },
        pontos_exploraveis_defesa: [
          {
            ponto: "Fragilidade de correlacao integral entre narrativa e anexos",
            categoria: "prova_insuficiente",
            relevancia: "alta",
            explorabilidade: "alta",
            necessita_validacao_humana: false,
            justificativa:
              "Os documentos podem sustentar apenas parte dos fatos, sem cobrir toda a narrativa ou todos os pedidos."
          }
        ],
        documentos_internos_recomendados_para_defesa: [
          "Historico interno de atendimento, logs transacionais, comprovacao de fluxo de cancelamento, registro de titularidade e comunicacoes internas pertinentes."
        ],
        alertas_de_nao_conclusao: [
          "Quando nao houver suporte documental suficiente, registrar expressamente a impossibilidade de verificacao."
        ]
      },
      null,
      2
    ),
    "Contexto do caso:",
    context
  ].join("\n\n");
}
