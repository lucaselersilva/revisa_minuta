"use client";

import { TimerReset } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { EmptyState } from "@/components/shared/empty-state";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkflowTimeDatum } from "@/app/app/queries/metrics";

export function WorkflowTimeChartClient({ data }: { data: WorkflowTimeDatum[] }) {
  const hasData = data.some((item) => item.averageHours > 0);

  return (
    <>
      <CardHeader>
        <CardTitle>Tempo medio por etapa</CardTitle>
        <CardDescription>Media em horas entre o inicio e a conclusao de cada etapa do workflow.</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {data.slice(0, 3).map((item) => (
                <div key={item.stepKey} className="rounded-lg border bg-muted/25 p-4">
                  <p className="text-xs uppercase text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-xl font-semibold">{item.averageLabel}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.sampleSize > 0 ? `${item.sampleSize} etapa(s) medidas` : "Sem amostra"}
                  </p>
                </div>
              ))}
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.3)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} interval={0} angle={-18} textAnchor="end" height={72} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid rgba(148, 163, 184, 0.35)",
                      boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)"
                    }}
                    formatter={(value) => [`${Number(value ?? 0).toFixed(1)} h`, "Media"]}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Bar dataKey="averageHours" fill="#0f766e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={TimerReset}
            title="Sem transicoes suficientes"
            description="Quando os casos comecarem a concluir etapas do workflow, este grafico mostrara onde estao os gargalos."
            className="min-h-[320px]"
          />
        )}
      </CardContent>
    </>
  );
}
