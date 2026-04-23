"use client";

import { Check, Circle, LockKeyhole } from "lucide-react";

import { WorkflowStepStatusBadge } from "@/features/case-workflow/components/workflow-step-status-badge";
import { getWorkflowStepMeta } from "@/features/case-workflow/lib/workflow-steps";
import { cn } from "@/lib/utils";
import type { CaseWorkflowStep, WorkflowStepKey } from "@/types/database";

export function WorkflowStepper({
  steps,
  selectedStep,
  onSelectStep
}: {
  steps: CaseWorkflowStep[];
  selectedStep: WorkflowStepKey;
  onSelectStep: (stepKey: WorkflowStepKey) => void;
}) {
  return (
    <div className="rounded-lg border bg-white p-3 shadow-subtle">
      <div className="space-y-2">
        {steps.map((step) => {
          const meta = getWorkflowStepMeta(step.step_key);
          const selected = selectedStep === step.step_key;
          const locked = step.status === "locked";
          const Icon = step.status === "completed" || step.status === "skipped" ? Check : locked ? LockKeyhole : Circle;

          return (
            <button
              key={step.id}
              type="button"
              disabled={locked}
              onClick={() => onSelectStep(step.step_key)}
              className={cn(
                "w-full rounded-md border p-3 text-left transition-colors",
                selected ? "border-primary bg-primary/5" : "bg-white hover:bg-muted/45",
                locked && "cursor-not-allowed opacity-60 hover:bg-white"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-primary", selected && "bg-primary text-primary-foreground")}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{meta.title}</p>
                    <WorkflowStepStatusBadge status={step.status} />
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{meta.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
