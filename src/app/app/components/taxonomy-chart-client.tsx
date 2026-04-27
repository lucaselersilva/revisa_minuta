"use client";

import { Layers3 } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { EmptyState } from "@/components/shared/empty-state";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TaxonomyChartDataset } from "@/app/app/queries/metrics";

const BAR_COLORS = ["#0f766e", "#14b8a6", "#d97706", "#0f172a", "#1d4ed8", "#65a30d"];

export function TaxonomyChartClient({ datasets }: { datasets: TaxonomyChartDataset[] }) {
  const [period, setPeriod] = useState<string>("30");

  const currentDataset = useMemo(
    () => datasets.find((item) => String(item.periodDays) === period) ?? datasets[0],
    [datasets, period]
  );

  return (
    <>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <CardTitle>Volume por taxonomia</CardTitle>
          <CardDescription>Distribuicao de casos classificados no periodo selecionado.</CardDescription>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full md:w-44">
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Ultimos 7 dias</SelectItem>
            <SelectItem value="30">Ultimos 30 dias</SelectItem>
            <SelectItem value="90">Ultimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {currentDataset && currentDataset.items.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Casos classificados no periodo</span>
              <span className="font-semibold">{currentDataset.total}</span>
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentDataset.items} layout="vertical" margin={{ top: 8, right: 12, left: 24, bottom: 0 }}>
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={150}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(15, 118, 110, 0.08)" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid rgba(148, 163, 184, 0.35)",
                      boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)"
                    }}
                    formatter={(value) => [`${Number(value ?? 0)} casos`, "Volume"]}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {currentDataset.items.map((entry, index) => (
                      <Cell key={`${entry.label}-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Layers3}
            title="Nenhuma taxonomia no periodo"
            description="Assim que os processos forem classificados, a distribuicao por taxonomia aparecera aqui."
            className="min-h-[320px]"
          />
        )}
      </CardContent>
    </>
  );
}
