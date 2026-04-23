"use client";

import { CheckCircle2, Loader2, RotateCcw, SkipForward } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  completeWorkflowStepAction,
  reopenWorkflowStepAction,
  skipWorkflowStepAction
} from "@/features/case-workflow/actions/workflow-actions";
import type { WorkflowCompletionInput, WorkflowValidationResult } from "@/features/case-workflow/types";
import type { Profile, WorkflowStepKey, WorkflowStepStatus } from "@/types/database";

export function WorkflowActionBar({
  caseId,
  stepKey,
  status,
  validation,
  profile,
  completionInput
}: {
  caseId: string;
  stepKey: WorkflowStepKey;
  status: WorkflowStepStatus;
  validation: WorkflowValidationResult;
  profile: Profile;
  completionInput?: WorkflowCompletionInput;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const canComplete = status === "available" || status === "in_progress";
  const canSkip = stepKey === "emenda_inicial" && canComplete;
  const canReopen = profile.role === "admin" && (status === "completed" || status === "skipped");

  function runComplete() {
    startTransition(async () => {
      const result = await completeWorkflowStepAction(caseId, stepKey, completionInput);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function runSkip() {
    startTransition(async () => {
      const result = await skipWorkflowStepAction(caseId, stepKey);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function runReopen() {
    startTransition(async () => {
      const result = await reopenWorkflowStepAction(caseId, stepKey);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col justify-between gap-3 rounded-lg border bg-white p-4 shadow-subtle md:flex-row md:items-center">
      <p className="text-sm text-muted-foreground">
        {validation.isValid ? "A etapa pode ser concluida." : "Resolva as pendencias para avancar."}
      </p>
      <div className="flex flex-wrap gap-2">
        {canSkip ? (
          <Button type="button" variant="outline" disabled={isPending} onClick={runSkip}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SkipForward className="h-4 w-4" />}
            Nao se aplica
          </Button>
        ) : null}
        {canReopen ? (
          <Button type="button" variant="outline" disabled={isPending} onClick={runReopen}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Reabrir etapa
          </Button>
        ) : null}
        {canComplete ? (
          <Button type="button" disabled={isPending || !validation.isValid} onClick={runComplete}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Concluir etapa
          </Button>
        ) : null}
      </div>
    </div>
  );
}
