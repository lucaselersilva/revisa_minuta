import { Badge } from "@/components/ui/badge";
import type { CaseStatus } from "@/types/database";

const labels: Record<CaseStatus, string> = {
  draft: "Rascunho",
  in_progress: "Em andamento",
  review_pending: "Revisao pendente",
  completed: "Concluido"
};

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  const variant = status === "completed" ? "success" : status === "review_pending" ? "default" : "secondary";
  return <Badge variant={variant}>{labels[status]}</Badge>;
}

export const caseStatusLabels = labels;
