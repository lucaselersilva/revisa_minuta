import { Badge } from "@/components/ui/badge";
import type { WorkflowStepStatus, WorkflowStatus } from "@/types/database";

const stepLabels: Record<WorkflowStepStatus, string> = {
  locked: "Bloqueada",
  available: "Disponivel",
  in_progress: "Em andamento",
  completed: "Concluida",
  skipped: "Nao se aplica"
};

export function WorkflowStepStatusBadge({ status }: { status: WorkflowStepStatus }) {
  const variant = status === "completed" ? "success" : status === "locked" ? "secondary" : status === "skipped" ? "outline" : "default";
  return <Badge variant={variant}>{stepLabels[status]}</Badge>;
}

export function WorkflowStatusBadge({ status }: { status: WorkflowStatus }) {
  const label = status === "completed" ? "Fluxo concluido" : status === "blocked" ? "Bloqueado" : status === "in_progress" ? "Em andamento" : "Nao iniciado";
  return <Badge variant={status === "completed" ? "success" : "secondary"}>{label}</Badge>;
}
