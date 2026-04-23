import { CheckCircle2 } from "lucide-react";

export function StepCompletionCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-success/25 bg-success/5 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
        <div>
          <p className="font-semibold text-success">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}
