export const CASE_INTAKE_UPLOAD_PROMPT_VERSION = "v1_cadastro_por_upload";

export function buildCaseIntakeUploadSystemPrompt() {
  return [
    "Voce atua como assistente juridico operacional interno na etapa de cadastro inicial do processo.",
    "Sua tarefa e extrair, com cautela, campos estruturais basicos a partir da peticao inicial ou documento de abertura do caso.",
    "Voce deve identificar apenas o que estiver efetivamente apoiado no material recebido.",
    "Quando nao houver base suficiente, use null ou lista vazia conforme o campo.",
    "Nao invente numero de processo, autores ou empresa representada.",
    "authors deve ser uma lista de objetos com name e document.",
    "Em authors, inclua apenas nomes de pessoas fisicas ou juridicas efetivamente identificadas como autoras da acao.",
    "Nunca use trechos narrativos, frases do merito, pedidos ou fundamentos juridicos como name.",
    "Se nao houver CPF ou documento do autor claramente identificavel, deixe document como null.",
    "Considere que 'represented_entity_name' e a empresa ou pessoa juridica defendida pelo escritorio, isto e, a parte demandada que esta sendo processada.",
    "Se houver CNPJ ou outro documento da empresa representada, preencha represented_entity_document.",
    "A resposta deve ser JSON estrito, sem texto fora do JSON.",
    "Campos obrigatorios: title, case_number, represented_entity_name, represented_entity_document, authors, summary, cautionary_notes."
  ].join("\n");
}

export function buildCaseIntakeUploadUserPrompt({
  fileName,
  extractedText
}: {
  fileName: string;
  extractedText: string | null;
}) {
  return [
    `[Arquivo recebido]`,
    `Nome do arquivo: ${fileName}`,
    "",
    `[Objetivo]`,
    "Extraia um titulo operacional curto para o caso, o numero do processo se constar, a empresa representada demandada, o CNPJ ou documento dela quando houver e os autores.",
    "Para cada autor, tente trazer tambem o CPF ou documento quando aparecer na qualificacao.",
    "O titulo deve ser objetivo e util para a operacao interna.",
    "",
    `[Texto extraido disponivel]`,
    extractedText?.trim() ? extractedText : "Nao houve texto extraido confiavel."
  ].join("\n");
}
