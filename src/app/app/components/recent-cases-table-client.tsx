"use client";

import { BriefcaseBusiness } from "lucide-react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CaseStatusBadge } from "@/features/cases/components/case-status-badge";
import type { RecentCaseItem } from "@/app/app/queries/metrics";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short"
  }).format(new Date(value));
}

export function RecentCasesTableClient({ cases }: { cases: RecentCaseItem[] }) {
  const router = useRouter();

  return cases.length > 0 ? (
    <div className="rounded-lg border bg-white shadow-subtle">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Numero do processo</TableHead>
            <TableHead>Autor</TableHead>
            <TableHead>Etapa atual</TableHead>
            <TableHead>Data de criacao</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((item) => (
            <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/app/cases/${item.id}`)}>
              <TableCell className="font-medium">{item.caseNumber ?? "Sem numero"}</TableCell>
              <TableCell>{item.author}</TableCell>
              <TableCell className="text-muted-foreground">{item.currentStepLabel}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
              <TableCell>
                <CaseStatusBadge status={item.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ) : (
    <EmptyState
      icon={BriefcaseBusiness}
      title="Nenhum caso recente"
      description="Quando o escritorio cadastrar processos, os 10 mais recentes aparecerao aqui com acesso direto ao detalhe."
    />
  );
}
