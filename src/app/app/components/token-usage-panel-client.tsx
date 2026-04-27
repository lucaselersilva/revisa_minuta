"use client";

import { Coins, Sparkles } from "lucide-react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { EmptyState } from "@/components/shared/empty-state";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TokenUsageMetrics } from "@/app/app/queries/metrics";

function formatInteger(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDelta(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "Sem base comparativa";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}% vs mes anterior`;
}

export function TokenUsagePanelClient({ metrics }: { metrics: TokenUsageMetrics }) {
  return (
    <>
      <CardHeader>
        <CardTitle>Uso de tokens</CardTitle>
        <CardDescription>Comparativo mensal e distribuicao por operacao de IA.</CardDescription>
      </CardHeader>
      <CardContent>
        {metrics.hasTelemetry ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border bg-muted/25 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Coins className="h-4 w-4 text-primary" />
                  Mes atual
                </div>
                <p className="mt-3 text-2xl font-semibold">{formatInteger(metrics.currentMonthTotal)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDelta(metrics.deltaPercentage)}</p>
              </div>
              <div className="rounded-lg border bg-muted/25 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-accent" />
                  Mes anterior
                </div>
                <p className="mt-3 text-2xl font-semibold">{formatInteger(metrics.previousMonthTotal)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Base de comparacao imediata</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {metrics.breakdown.map((item) => (
                <div key={item.key} className="rounded-lg border bg-white p-4">
                  <p className="text-xs uppercase text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-xl font-semibold">{formatInteger(item.total)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">tokens acumulados</p>
                </div>
              ))}
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.daily} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.3)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} minTickGap={18} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid rgba(148, 163, 184, 0.35)",
                      boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)"
                    }}
                    formatter={(value) => [`${formatInteger(Number(value ?? 0))} tokens`, "Consumo"]}
                    labelFormatter={(label) => `Dia ${label}`}
                  />
                  <Line type="monotone" dataKey="total" stroke="#d97706" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Coins}
            title="Telemetria de tokens ainda indisponivel"
            description="O banco atual nao persiste contadores de tokens de forma estruturada para essas operacoes. O painel permanece pronto e sera preenchido assim que essa telemetria passar a existir."
            className="min-h-[320px]"
          />
        )}
      </CardContent>
    </>
  );
}
