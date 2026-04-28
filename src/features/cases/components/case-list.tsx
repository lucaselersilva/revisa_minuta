"use client";

import { BriefcaseBusiness, FilePlus2, Filter, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CaseStatusBadge, caseStatusLabels } from "@/features/cases/components/case-status-badge";
import type { CaseListItem } from "@/features/cases/types";
import { caseStatuses } from "@/lib/validations/cases";
import type { Portfolio, Taxonomy } from "@/types/database";

type Props = {
  cases: CaseListItem[];
  portfolios: Portfolio[];
  taxonomies: Taxonomy[];
};

export function CaseList({ cases, portfolios, taxonomies }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());

    if (value === "all") {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    router.push(`/app/cases?${next.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-subtle md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value="Busca por filtros estruturados em breve" readOnly />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Select value={searchParams.get("portfolio") ?? "all"} onValueChange={(value) => updateFilter("portfolio", value)}>
            <SelectTrigger className="md:w-56">
              <SelectValue placeholder="Carteira" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as carteiras</SelectItem>
              {portfolios.map((portfolio) => (
                <SelectItem key={portfolio.id} value={portfolio.id}>
                  {portfolio.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={searchParams.get("status") ?? "all"} onValueChange={(value) => updateFilter("status", value)}>
            <SelectTrigger className="md:w-52">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {caseStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {caseStatusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={searchParams.get("taxonomy") ?? "all"} onValueChange={(value) => updateFilter("taxonomy", value)}>
            <SelectTrigger className="md:w-56">
              <SelectValue placeholder="Taxonomia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as taxonomias</SelectItem>
              {taxonomies.map((taxonomy) => (
                <SelectItem key={taxonomy.id} value={taxonomy.id}>
                  {taxonomy.code} - {taxonomy.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-white shadow-subtle">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numero</TableHead>
              <TableHead>Titulo</TableHead>
              <TableHead>Carteira</TableHead>
              <TableHead>Taxonomia</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Responsavel</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.map((item) => (
              <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/app/cases/${item.id}`)}>
                <TableCell className="font-medium">{item.case_number || "Sem numero"}</TableCell>
                <TableCell>
                  <Link className="font-semibold hover:text-primary" href={`/app/cases/${item.id}`}>
                    {item.title || "Processo sem titulo"}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{item.portfolio?.name ?? "Sem carteira"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {item.taxonomy ? `${item.taxonomy.code} - ${item.taxonomy.name}` : "Nao definida"}
                </TableCell>
                <TableCell>
                  <CaseStatusBadge status={item.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">{item.responsible_lawyer?.full_name ?? "Sem responsavel"}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(item.created_at).toLocaleDateString("pt-BR")}</TableCell>
              </TableRow>
            ))}
            {cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-6">
                  <EmptyState
                    icon={BriefcaseBusiness}
                    title="Nenhum processo encontrado"
                    description="Cadastre o primeiro processo para organizar partes, empresa representada e documentos."
                    action={
                      <Button asChild>
                        <Link href="/app/cases/new">
                          <FilePlus2 className="h-4 w-4" />
                          Novo processo
                        </Link>
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
