import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getRecentCases } from "@/app/app/queries/metrics";
import { RecentCasesTableClient } from "@/app/app/components/recent-cases-table-client";

export async function RecentCasesTable() {
  const cases = await getRecentCases();

  return (
    <section className="space-y-4">
      <CardHeader className="rounded-lg border bg-white shadow-subtle">
        <CardTitle>Casos recentes</CardTitle>
        <CardDescription>Ultimos 10 processos do escritorio com acesso direto ao workflow.</CardDescription>
      </CardHeader>
      <RecentCasesTableClient cases={cases} />
    </section>
  );
}
