import { AlertCircle, CheckCircle2 } from "lucide-react";

import type { WorkflowValidationResult } from "@/features/case-workflow/types";

export function WorkflowPendingRequirements({ validation }: { validation: WorkflowValidationResult }) {
  if (validation.isValid && validation.warnings.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-success/25 bg-success/5 p-4 text-sm text-success">
        <CheckCircle2 className="h-4 w-4" />
        Etapa pronta para conclusao.
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <AlertCircle className="h-4 w-4 text-accent" />
        Pendencias e avisos
      </div>
      {validation.missingItems.length > 0 ? (
        <ul className="space-y-2 text-sm text-muted-foreground">
          {validation.missingItems.map((item) => (
            <li key={item} className="rounded-md bg-muted/55 px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      ) : null}
      {validation.warnings.map((warning) => (
        <p key={warning} className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground">
          {warning}
        </p>
      ))}
    </div>
  );
}
