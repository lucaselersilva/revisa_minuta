"use client";

import { Building2, Clock3, FileText, Pencil, UsersRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CaseStatusBadge } from "@/features/cases/components/case-status-badge";
import { DocumentUpload, documentTypeLabels, stageLabels } from "@/features/cases/components/document-upload";
import type { CaseDetail } from "@/features/cases/types";
import { cn, formatCnpj } from "@/lib/utils";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "parties", label: "Partes" },
  { id: "documents", label: "Documentos" },
  { id: "history", label: "Historico" }
] as const;

type TabId = (typeof tabs)[number]["id"];

export function CaseDetailTabs({ caseItem }: { caseItem: CaseDetail }) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 rounded-lg border bg-white p-5 shadow-subtle md:flex-row md:items-center">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <CaseStatusBadge status={caseItem.status} />
            {caseItem.taxonomy ? <Badge variant="secondary">{caseItem.taxonomy.code}</Badge> : null}
          </div>
          <h2 className="text-xl font-semibold">{caseItem.title || "Processo sem titulo"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{caseItem.case_number || "Numero nao informado"}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/app/cases/${caseItem.id}/edit`}>
            <Pencil className="h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-lg border bg-white p-2 shadow-subtle">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "h-10 rounded-md px-4 text-sm font-medium text-muted-foreground transition-colors",
              activeTab === tab.id && "bg-primary text-primary-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? <OverviewTab caseItem={caseItem} /> : null}
      {activeTab === "parties" ? <PartiesTab caseItem={caseItem} /> : null}
      {activeTab === "documents" ? <DocumentUpload caseId={caseItem.id} officeId={caseItem.office_id} documents={caseItem.documents} /> : null}
      {activeTab === "history" ? <HistoryTab caseItem={caseItem} /> : null}
    </div>
  );
}

function OverviewTab({ caseItem }: { caseItem: CaseDetail }) {
  const entity = caseItem.entity_links[0]?.entity;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Resumo operacional</CardTitle>
          <CardDescription>Dados estruturais do processo para alimentar as proximas fases.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoRow label="Descricao" value={caseItem.description || "Sem descricao"} />
          <InfoRow label="Taxonomia" value={caseItem.taxonomy ? `${caseItem.taxonomy.code} - ${caseItem.taxonomy.name}` : "Nao definida"} />
          <InfoRow label="Responsavel" value={caseItem.responsible_lawyer?.full_name ?? "Sem responsavel"} />
          <InfoRow label="Criado em" value={new Date(caseItem.created_at).toLocaleString("pt-BR")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Empresa representada</CardTitle>
          <CardDescription>Entidade vinculada ao processo.</CardDescription>
        </CardHeader>
        <CardContent>
          {entity ? (
            <div className="rounded-lg border bg-white p-4">
              <Building2 className="mb-3 h-5 w-5 text-primary" />
              <p className="font-semibold">{entity.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{entity.document ? formatCnpj(entity.document) : "CNPJ nao informado"}</p>
              <p className="mt-3 text-sm text-muted-foreground">{caseItem.represented_entity_notes || "Sem observacao registrada para esta empresa neste processo."}</p>
            </div>
          ) : (
            <EmptyState icon={Building2} title="Sem empresa vinculada" description="Edite o processo para vincular uma empresa representada." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PartiesTab({ caseItem }: { caseItem: CaseDetail }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {caseItem.parties.map((party) => (
        <Card key={party.id}>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <UsersRound className="h-5 w-5 text-primary" />
              <Badge variant="secondary">{party.role === "author" ? "Autor" : party.role === "defendant" ? "Reu" : "Terceiro"}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{party.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{party.document || "Documento nao informado"}</p>
          </CardContent>
        </Card>
      ))}
      {caseItem.parties.length === 0 ? (
        <div className="md:col-span-2 xl:col-span-3">
          <EmptyState icon={UsersRound} title="Nenhuma parte cadastrada" description="Edite o processo para adicionar autores, reus ou terceiros." />
        </div>
      ) : null}
    </div>
  );
}

function HistoryTab({ caseItem }: { caseItem: CaseDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historico do processo</CardTitle>
        <CardDescription>Eventos automaticos registrados pelas actions do dominio.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {caseItem.history.map((item) => (
          <div key={item.id} className="rounded-lg border bg-white p-4">
            <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <Clock3 className="h-4 w-4 text-primary" />
                <p className="font-medium">{item.action}</p>
              </div>
              <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("pt-BR")}</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Por {item.performer?.full_name ?? "Usuario interno"}</p>
            <pre className="mt-3 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(item.metadata, null, 2)}</pre>
          </div>
        ))}
        {caseItem.history.length === 0 ? (
          <EmptyState icon={FileText} title="Historico vazio" description="As proximas mutacoes do processo serao registradas aqui." />
        ) : null}
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

export { documentTypeLabels, stageLabels };
