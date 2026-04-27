import { Activity, Clock3, FileCheck2, Target } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getDashboardKpis } from "@/app/app/queries/metrics";

const metricIcons = [Activity, FileCheck2, Clock3, Target] as const;

export async function KpiCards() {
  const { metrics } = await getDashboardKpis();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = metricIcons[index] ?? Activity;

        return (
          <Card key={metric.label}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="rounded-md bg-muted p-2 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">KPI</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{metric.helper}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
