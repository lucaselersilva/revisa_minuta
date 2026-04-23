# Documentacao de Escopo - MVP Robusto

Projeto: Revisor de Pecas Processuais - Carteira MaxMilhas  
Cliente: Abrahao Advogados / MaxMilhas  
Objetivo deste documento: registrar o que sera desenvolvido agora, o que ficara para uma proxima etapa e a motivacao das decisoes de escopo.

## 1. Contexto

O memorial do projeto descreve uma visao ampla da plataforma, com funcionalidades de revisao juridica, gestao operacional, painel administrativo, jurometria, integracoes externas e inteligencia acumulada da carteira.

O escopo inicial, por sua vez, reduziu essa visao para uma primeira entrega mais enxuta, voltada principalmente a validar o uso pratico da ferramenta pela equipe juridica.

Como evolucao desse recorte, este documento define um MVP mais robusto: suficientemente completo para gerar valor real na operacao, mas sem tentar implementar desde ja todos os modulos gerenciais e estrategicos previstos no memorial.

## 2. Principio de priorizacao

Entrara agora o que melhora diretamente a qualidade da revisao, reduz retrabalho e cria uma base organizada para evolucao futura.

Ficara para depois o que depende de volume historico, integracoes externas, regras muito refinadas ou uso gerencial mais avancado.

## 3. Funcionalidades que serao feitas agora

### 3.1 Fluxo guiado de revisao

O sistema tera um fluxo estruturado por etapas, conduzindo o advogado desde o cadastro do processo ate a revisao final da contestacao.

O fluxo devera contemplar:

- cadastro do processo;
- preenchimento das informacoes principais do caso;
- upload da inicial e documentos do autor;
- indicacao e upload de emenda a inicial, quando houver;
- geracao de laudo previo;
- upload da contestacao e documentos da defesa;
- revisao final da peca;
- geracao de relatorio operacional.

Motivacao: o fluxo guiado reduz variacao na forma de trabalho dos advogados, evita esquecimento de documentos e melhora a padronizacao da revisao.

### 3.2 Cadastro e historico basico de processos

Cada processo devera ser cadastrado com suas informacoes essenciais, como numero, partes, dados do escritorio adverso, resumo do caso, tipo de caso e status da revisao.

O sistema tambem devera manter historico basico das revisoes realizadas.

Motivacao: a rastreabilidade por processo e essencial para controle interno e para permitir evolucao futura para uma base jurometrica mais completa.

### 3.3 Upload organizado de documentos

O sistema devera permitir o upload e organizacao dos documentos por processo e por etapa.

Devem ser previstos, ao menos:

- peticao inicial;
- documentos do autor;
- emenda a inicial, quando houver;
- contestacao;
- documentos da defesa.

Motivacao: a analise da IA depende diretamente da organizacao dos documentos. Separar os arquivos por tipo melhora a qualidade da revisao e reduz confusao operacional.

### 3.4 Taxonomia de tipos de caso

A taxonomia sera uma funcionalidade central do MVP robusto.

O sistema devera permitir classificar os casos conforme os tipos definidos pelo escritorio, como A1, A2, B1, B2 e demais categorias aplicaveis.

Na interface de administrador, devera existir a possibilidade de:

- acrescentar novas taxonomias;
- retirar ou desativar taxonomias existentes;
- alterar nomes, descricoes e parametros das taxonomias;
- manter apenas as taxonomias em uso visiveis para a operacao;
- evoluir a classificacao conforme novos padroes da carteira forem identificados.

Motivacao: a taxonomia impede que a IA trate todos os processos de forma generica. Ela permite que cada tipo de caso tenha criterios proprios de revisao, documentos esperados e teses relevantes. A possibilidade de o administrador acrescentar e retirar taxonomias e importante porque a carteira pode mudar com o tempo, e o sistema precisa acompanhar essa evolucao sem depender de alteracao tecnica a cada ajuste juridico.

### 3.5 Classificacao automatica do caso

A IA devera auxiliar na classificacao do processo, identificando o tipo de caso a partir das informacoes preenchidas e dos documentos enviados.

O advogado nao deve depender apenas de selecao manual, mas a classificacao podera ser revisada conforme necessidade.

Motivacao: a classificacao automatica reduz erro humano e permite que o sistema aplique regras mais adequadas ao caso concreto.

### 3.6 Matriz inicial de criterios por tipo de caso

Para os tipos de caso prioritarios, devera existir uma matriz simples contendo:

- documentos esperados;
- teses juridicas relevantes;
- pontos de atencao;
- lacunas consideradas criticas;
- lacunas consideradas ajustaveis.

Motivacao: essa matriz e o que transforma a revisao em uma analise orientada por criterios juridicos objetivos, e nao apenas em uma leitura generica da contestacao.

### 3.7 Modelos-base dos tipos mais frequentes

O MVP robusto devera contemplar modelos-base apenas para os tipos de caso mais recorrentes e prioritarios.

Esses modelos servirao como referencia para comparar a contestacao elaborada pelo advogado.

Motivacao: modelos-base aumentam a consistencia da revisao, mas criar modelos para todos os tipos desde o inicio exigiria muita validacao juridica e poderia atrasar a entrega.

### 3.8 Laudo previo obrigatorio

Apos a analise da inicial, dos documentos do autor e da emenda, quando houver, o sistema devera gerar um laudo previo interno.

Esse laudo devera conter:

- resumo estruturado do caso;
- pedidos identificados;
- principais inconsistencias documentais;
- pontos de atencao para a defesa;
- documentos recomendados;
- riscos preliminares.

O advogado devera confirmar a leitura antes de seguir para a etapa de contestacao.

Motivacao: o laudo previo permite que o advogado corrija a rota antes de finalizar a peca. Isso ataca diretamente a principal fonte de retrabalho: contestacoes genericas ou desconectadas dos documentos do caso.

### 3.9 Analise da inicial, documentos e emenda

O sistema devera analisar a inicial e os documentos do autor para identificar:

- pedidos formulados;
- partes envolvidas;
- inconsistencias documentais;
- documentos ausentes;
- terceiros mencionados nos documentos;
- divergencias relevantes;
- fatos novos trazidos por emenda a inicial.

Motivacao: muitos pontos defensivos surgem dos proprios documentos do autor. A ferramenta deve ajudar o advogado a enxergar essas oportunidades antes da revisao final.

### 3.10 Revisao final da contestacao

Depois do upload da contestacao e dos documentos da defesa, o sistema devera revisar a peca e apontar:

- pedidos enfrentados e nao enfrentados;
- teses essenciais presentes ou ausentes;
- documentos da defesa utilizados ou ignorados;
- inconsistencias do autor nao exploradas;
- lacunas documentais;
- pontos que exigem ajuste;
- score final e classificacao da revisao.

Motivacao: essa e a funcionalidade central do produto. O objetivo e apoiar a revisao tecnica da defesa, reduzindo omissoes e melhorando a qualidade da peca antes do protocolo.

### 3.11 Relatorio operacional por processo

Ao final da revisao, o sistema devera gerar um relatorio operacional interno contendo:

- resumo executivo;
- status da revisao;
- score;
- achados criticos;
- pontos de ajuste;
- lacunas documentais;
- historico basico da revisao.

Motivacao: o relatorio formaliza o resultado da revisao e permite que gestor, senior ou socio acompanhem a qualidade da operacao.

### 3.12 Painel basico de gestao

O MVP robusto devera incluir um painel administrativo basico, com acesso restrito.

Esse painel devera permitir:

- visualizar processos cadastrados;
- consultar status das revisoes;
- aplicar filtros basicos;
- visualizar historico e logs;
- gerenciar usuarios administradores;
- gerenciar taxonomias;
- gerenciar empresas ou pessoas representadas;
- cadastrar parametros iniciais por tipo de caso.

Motivacao: sem um painel minimo, qualquer ajuste operacional dependeria de suporte tecnico. O painel basico da autonomia ao escritorio e prepara o sistema para evolucao.

### 3.13 Ficha jurometrica simples

O sistema devera iniciar uma ficha estruturada por processo, ainda em versao simples.

Campos recomendados:

- numero do processo;
- partes;
- empresa representada;
- tipo de caso;
- valor da causa;
- pedidos principais;
- status da revisao;
- score;
- advogado responsavel;
- data da revisao.

Motivacao: mesmo que a jurometria completa fique para depois, e importante comecar a capturar dados desde o inicio. Isso evita perda de informacao e cria base para relatorios futuros.

## 4. Funcionalidades deixadas para proxima etapa

### 4.1 DataJud e busca completa de litigancia

Ficara para etapa posterior a integracao completa com DataJud para busca de outros processos dos autores, compradores reais e terceiros identificados nos documentos.

Motivacao: e uma funcionalidade de alto valor, mas depende de integracao externa, tratamento de nomes genericos, validacao dos resultados e possivel calibragem para evitar falsos positivos. Faz sentido implementar depois que o fluxo principal de revisao estiver validado.

### 4.2 Painel gerencial avancado

Ficara para depois um painel com indicadores mais completos, como volume por tipo de caso, percentual de aprovados, percentual de criticos, tempo medio de revisao, ranking de riscos e acompanhamento consolidado da carteira.

Motivacao: esses indicadores dependem de dados acumulados. No inicio, o mais importante e garantir que os dados sejam capturados corretamente.

### 4.3 Jurometria estrategica da carteira

Ficara para etapa posterior a analise de padroes por comarca, juiz, escritorio adverso, tese utilizada, documento juntado e resultado.

Motivacao: essa inteligencia so ganha confiabilidade com volume. Implementar a estrutura simples agora e deixar as analises avancadas para quando houver base suficiente.

### 4.4 Alertas automaticos por e-mail

Ficara para depois o envio automatico de alertas para senior e socio nos casos classificados como requer ajuste ou critico.

Motivacao: antes de automatizar alertas, e melhor calibrar bem os criterios de score e classificacao. Caso contrario, o sistema pode gerar excesso de notificacoes ou alertas pouco confiaveis.

### 4.5 Gestao completa de modelos e teses

Ficara para etapa posterior a gestao completa de todos os modelos-base, teses juridicas, versoes, vinculos por tipo de caso e regras refinadas.

Motivacao: essa parte exige validacao juridica cuidadosa. Para o MVP robusto, basta trabalhar com os tipos prioritarios e expandir com seguranca depois.

### 4.6 Permissoes granulares por processo e usuario

Ficara para depois a gestao fina de permissao por processo, pasta, caso, usuario ou perfil.

Motivacao: a separacao inicial entre administrador e usuario comum ja resolve o principal risco operacional. Permissoes muito detalhadas aumentam complexidade e podem ser implementadas conforme a necessidade real aparecer.

### 4.7 Integracoes externas adicionais

Ficara para depois a integracao com tribunais, sistemas de terceiros, BI externo, robos de captura, scraping, automacao de protocolo e outras automacoes externas.

Motivacao: o foco do MVP robusto e validar a revisao assistida por IA. Integracoes externas podem transformar o projeto em algo muito maior antes de o nucleo estar consolidado.

### 4.8 Verificacao visual de assinaturas

Ficara para etapa posterior a comparacao visual de assinaturas entre procuracao e documento de identidade.

Motivacao: e uma funcionalidade interessante, mas exige maior cuidado tecnico e juridico. No MVP robusto, pode-se registrar alerta manual ou checklist, deixando a verificacao visual automatizada para depois.

### 4.9 Inteligencia acumulada para recomendacao de documentos

Ficara para depois a recomendacao automatica de documentos com base em historico de casos anteriores.

Motivacao: essa funcionalidade depende de base historica. No inicio, os documentos recomendados devem vir da matriz definida pelo escritorio.

### 4.10 Relatorios consolidados para o cliente

Ficara para etapa posterior a geracao de relatorios periodicos consolidados para MaxMilhas sobre evolucao da carteira, tipos de caso, teses, documentos e riscos.

Motivacao: relatorios externos exigem maior maturidade dos dados e validacao da linguagem. Primeiro, o sistema deve estabilizar os relatorios internos por processo.

## 5. Resumo executivo

O MVP robusto devera entregar uma plataforma funcional de revisao juridica assistida por IA, com fluxo guiado, taxonomia configuravel pelo administrador, laudo previo, revisao final da contestacao, relatorio operacional e painel basico de gestao.

Ficam para a proxima etapa os modulos de inteligencia avancada, integracoes externas, jurometria estrategica, alertas automaticos e gestao completa de modelos e teses.

Essa divisao permite entregar valor real rapidamente, reduzir retrabalho na operacao e, ao mesmo tempo, construir uma base organizada para evoluir a plataforma com seguranca.

