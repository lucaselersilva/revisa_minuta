import { LockKeyhole } from "lucide-react";

export function StepGateNotice() {
  return (
    <div className="rounded-lg border border-dashed bg-white p-6 text-center shadow-subtle">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-muted text-primary">
        <LockKeyhole className="h-5 w-5" />
      </div>
      <h3 className="font-semibold">Etapa bloqueada</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Conclua as etapas anteriores para liberar esta parte do fluxo operacional.
      </p>
    </div>
  );
}
