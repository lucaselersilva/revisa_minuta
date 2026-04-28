"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Edit, Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createCaseEntityAction, updateCaseEntityAction } from "@/features/cases/actions/case-entity-actions";
import { formatCnpj } from "@/lib/utils";
import { caseEntityManagementSchema, type CaseEntityManagementInput } from "@/lib/validations/entities";
import type { CaseEntity, Portfolio } from "@/types/database";

type Props = {
  entities: CaseEntity[];
  portfolios: Portfolio[];
};

export function CaseEntityManager({ entities, portfolios }: Props) {
  const [editing, setEditing] = useState<CaseEntity | null>(null);
  const [open, setOpen] = useState(false);

  function openForCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openForEdit(entity: CaseEntity) {
    setEditing(entity);
    setOpen(true);
  }

  return (
    <div className="rounded-lg border bg-white shadow-subtle">
      <div className="flex flex-col justify-between gap-4 border-b p-5 md:flex-row md:items-center">
        <div>
          <h2 className="text-base font-semibold">Empresas cadastradas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Base administrativa usada pelos usuarios no cadastro de processos.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openForCreate}>
              <Plus className="h-4 w-4" />
              Nova empresa
            </Button>
          </DialogTrigger>
          <CaseEntityForm entity={editing} portfolios={portfolios} onClose={() => setOpen(false)} />
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead>Carteira</TableHead>
            <TableHead>CNPJ</TableHead>
            <TableHead>Criada em</TableHead>
            <TableHead className="w-24 text-right">Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entities.map((entity) => (
            <TableRow key={entity.id}>
              <TableCell className="font-medium">{entity.name}</TableCell>
              <TableCell>{portfolios.find((portfolio) => portfolio.id === entity.portfolio_id)?.name ?? "Sem carteira"}</TableCell>
              <TableCell>{entity.document ? formatCnpj(entity.document) : "Nao informado"}</TableCell>
              <TableCell className="text-muted-foreground">{new Date(entity.created_at).toLocaleString("pt-BR")}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="icon" aria-label="Editar empresa" onClick={() => openForEdit(entity)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {entities.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="p-6">
                <EmptyState
                  icon={Building2}
                  title="Nenhuma empresa cadastrada"
                  description="Cadastre as empresas para que a equipe possa utiliza-las no cadastro dos processos."
                />
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}

function CaseEntityForm({
  entity,
  portfolios,
  onClose
}: {
  entity: CaseEntity | null;
  portfolios: Portfolio[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<CaseEntityManagementInput>({
    resolver: zodResolver(caseEntityManagementSchema),
    values: {
      portfolio_id: entity?.portfolio_id ?? portfolios[0]?.id ?? "",
      name: entity?.name ?? "",
      document: entity?.document ? formatCnpj(entity.document) : ""
    }
  });

  function onSubmit(values: CaseEntityManagementInput) {
    startTransition(async () => {
      const result = entity ? await updateCaseEntityAction(entity.id, values) : await createCaseEntityAction(values);

      if (result.ok) {
        toast.success(result.message);
        onClose();
        form.reset({ name: "", document: "" });
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{entity ? "Editar empresa" : "Nova empresa"}</DialogTitle>
        <DialogDescription>Esses dados ficam disponiveis para vinculacao nos processos do escritorio.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label>Carteira</Label>
          <Select value={form.watch("portfolio_id")} onValueChange={(value) => form.setValue("portfolio_id", value, { shouldDirty: true })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a carteira" />
            </SelectTrigger>
            <SelectContent>
              {portfolios.map((portfolio) => (
                <SelectItem key={portfolio.id} value={portfolio.id}>
                  {portfolio.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.portfolio_id ? <p className="text-sm text-destructive">{form.formState.errors.portfolio_id.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="entity_name">Nome</Label>
          <Input id="entity_name" placeholder="Empresa XYZ Ltda." {...form.register("name")} />
          {form.formState.errors.name ? <p className="text-sm text-destructive">{form.formState.errors.name.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="entity_document">CNPJ</Label>
          <Input
            id="entity_document"
            placeholder="00.000.000/0000-00"
            value={form.watch("document") ?? ""}
            onChange={(event) => form.setValue("document", formatCnpj(event.target.value), { shouldDirty: true })}
          />
          {form.formState.errors.document ? <p className="text-sm text-destructive">{form.formState.errors.document.message}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
