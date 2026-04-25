export const CASE_INTAKE_UPLOAD_PROMPT_VERSION = "v1_cadastro_por_upload";

export function buildCaseIntakeUploadSystemPrompt() {
  return [
    "Voce atua como assistente juridico operacional interno na etapa de cadastro inicial do processo.",
    "Sua tarefa e extrair, com cautela, campos estruturais basicos a partir da peticao inicial ou documento de abertura do caso.",
    "Voce deve identificar apenas o que estiver efetivamente apoiado no material recebido.",
    "Quando nao houver base suficiente, use null ou lista vazia conforme o campo.",
    "Nao invente numero de processo, autores ou empresa representada.",
    "Considere que 'represented_entity_name' e a empresa ou pessoa juridica defendida pelo escritorio, isto e, a parte demandada que esta sendo processada.",
    "A resposta deve ser JSON estrito, sem texto fora do JSON.",
    "Campos obrigatorios: title, case_number, represented_entity_name, authors, summary, cautionary_notes."
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
    "Extraia um titulo operacional curto para o caso, o numero do processo se constar, a empresa representada demandada e os autores.",
    "O titulo deve ser objetivo e util para a operacao interna.",
    "",
    `[Texto extraido disponivel]`,
    extractedText?.trim() ? extractedText : "Nao houve texto extraido confiavel."
  ].join("\n");
}
