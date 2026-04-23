import type { WorkflowStepKey } from "@/types/database";

export const workflowSteps = [
  {
    key: "cadastro_inicial",
    order: 1,
    title: "Cadastro inicial",
    description: "Dados essenciais, taxonomia, responsavel, partes e empresa representada.",
    required: true
  },
  {
    key: "documentos_autor",
    order: 2,
    title: "Documentos do autor",
    description: "Peticao inicial, documentos do autor e organizacao documental inicial.",
    required: true
  },
  {
    key: "emenda_inicial",
    order: 3,
    title: "Emenda inicial",
    description: "Upload opcional de emenda ou marcacao de nao aplicabilidade.",
    required: false
  },
  {
    key: "pre_analise",
    order: 4,
    title: "Pre-analise",
    description: "Confirmacao manual preparatoria para a futura analise automatica.",
    required: true
  },
  {
    key: "defesa",
    order: 5,
    title: "Defesa",
    description: "Contestacao e documentos defensivos.",
    required: true
  },
  {
    key: "revisao_final",
    order: 6,
    title: "Revisao final",
    description: "Checklist manual antes da futura revisao juridica automatizada.",
    required: true
  },
  {
    key: "relatorio",
    order: 7,
    title: "Relatorio",
    description: "Resumo operacional placeholder do andamento.",
    required: true
  }
] as const satisfies Array<{
  key: WorkflowStepKey;
  order: number;
  title: string;
  description: string;
  required: boolean;
}>;

export const workflowStepKeys = workflowSteps.map((step) => step.key);

export function getWorkflowStepMeta(stepKey: WorkflowStepKey) {
  return workflowSteps.find((step) => step.key === stepKey) ?? workflowSteps[0];
}

export function getNextWorkflowStepKey(stepKey: WorkflowStepKey) {
  const currentIndex = workflowStepKeys.indexOf(stepKey);
  return workflowStepKeys[currentIndex + 1] ?? null;
}

export function getPreviousWorkflowStepKey(stepKey: WorkflowStepKey) {
  const currentIndex = workflowStepKeys.indexOf(stepKey);
  return workflowStepKeys[currentIndex - 1] ?? null;
}
