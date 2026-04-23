import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function CasesLoading() {
  return (
    <PageShell eyebrow="Processos" title="Carteira processual">
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </PageShell>
  );
}
