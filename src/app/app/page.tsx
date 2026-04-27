import { Suspense } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCards } from "@/app/app/components/kpi-cards";
import { RecentCasesTable } from "@/app/app/components/recent-cases-table";
import { TaxonomyChart } from "@/app/app/components/taxonomy-chart";
import { TokenUsagePanel } from "@/app/app/components/token-usage-panel";
import { WorkflowTimeChart } from "@/app/app/components/workflow-time-chart";

function KpiCardsFallback() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-9 w-9" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartFallback() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[320px] w-full" />
      </CardContent>
    </Card>
  );
}

function TableFallback() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-72 w-full" />
      </CardContent>
    </Card>
  );
}

export default function AppDashboardPage() {
  return (
    <PageShell
      eyebrow="Dashboard"
      title="Metricas operacionais"
      description="Visao consolidada da carteira do escritorio atual, respeitando o tenant autenticado e o workflow juridico em andamento."
    >
      <Suspense fallback={<KpiCardsFallback />}>
        <KpiCards />
      </Suspense>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Suspense fallback={<ChartFallback />}>
          <TaxonomyChart />
        </Suspense>
        <Suspense fallback={<ChartFallback />}>
          <WorkflowTimeChart />
        </Suspense>
      </div>

      <div className="mt-6">
        <Suspense fallback={<ChartFallback />}>
          <TokenUsagePanel />
        </Suspense>
      </div>

      <div className="mt-6">
        <Suspense fallback={<TableFallback />}>
          <RecentCasesTable />
        </Suspense>
      </div>
    </PageShell>
  );
}
