"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Loader2, Plus, PowerOff, Tags } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { createTaxonomyAction, deactivateTaxonomyAction, updateTaxonomyAction } from "@/features/taxonomies/actions/taxonomy-actions";
import { taxonomySchema, type TaxonomyInput } from "@/lib/validations/taxonomies";
import type { Portfolio, Taxonomy } from "@/types/database";

type Props = {
  portfolios: Portfolio[];
  taxonomies: Taxonomy[];
};

export function TaxonomyManager({ portfolios, taxonomies }: Props) {
  const [editing, setEditing] = useState<Taxonomy | null>(null);
  const [open, setOpen] = useState(false);

  function openForCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openForEdit(taxonomy: Taxonomy) {
    setEditing(taxonomy);
    setOpen(true);
  }

  return (
    <div className="rounded-lg border bg-white shadow-subtle">
      <div className="flex flex-col justify-between gap-4 border-b p-5 md:flex-row md:items-center">
        <div>
          <h2 className="text-base font-semibold">Taxonomias configuradas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Categorias operacionais editaveis pelo administrador.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openForCreate}>
              <Plus className="h-4 w-4" />
              Nova taxonomia
            </Button>
          </DialogTrigger>
          <TaxonomyForm taxonomy={editing} portfolios={portfolios} onClose={() => setOpen(false)} />
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Codigo</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Carteira</TableHead>
            <TableHead>Descricao</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-40 text-right">Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {taxonomies.map((taxonomy) => (
            <TableRow key={taxonomy.id}>
              <TableCell className="font-semibold">{taxonomy.code}</TableCell>
              <TableCell>{taxonomy.name}</TableCell>
              <TableCell>{portfolios.find((portfolio) => portfolio.id === taxonomy.portfolio_id)?.name ?? "Sem carteira"}</TableCell>
              <TableCell className="max-w-md text-muted-foreground">{taxonomy.description ?? "Sem descricao"}</TableCell>
              <TableCell>
                <Badge variant={taxonomy.is_active ? "success" : "secondary"}>
                  {taxonomy.is_active ? "Ativa" : "Inativa"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="icon" aria-label="Editar taxonomia" onClick={() => openForEdit(taxonomy)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  {taxonomy.is_active ? <DeactivateTaxonomyButton taxonomy={taxonomy} /> : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {taxonomies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="p-6">
                <EmptyState
                  icon={Tags}
                  title="Nenhuma taxonomia cadastrada"
                  description="Crie categorias demonstrativas para validar a experiencia administrativa."
                />
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}

function TaxonomyForm({
  taxonomy,
  portfolios,
  onClose
}: {
  taxonomy: Taxonomy | null;
  portfolios: Portfolio[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<TaxonomyInput>({
    resolver: zodResolver(taxonomySchema),
    values: {
      portfolio_id: taxonomy?.portfolio_id ?? portfolios[0]?.id ?? "",
      code: taxonomy?.code ?? "",
      name: taxonomy?.name ?? "",
      description: taxonomy?.description ?? "",
      is_active: taxonomy?.is_active ?? true
    }
  });

  function onSubmit(values: TaxonomyInput) {
    startTransition(async () => {
      const result = taxonomy
        ? await updateTaxonomyAction(taxonomy.id, values)
        : await createTaxonomyAction(values);

      if (result.ok) {
        toast.success(result.message);
        onClose();
        form.reset();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{taxonomy ? "Editar taxonomia" : "Nova taxonomia"}</DialogTitle>
        <DialogDescription>Use categorias demonstrativas nesta fase. Regras juridicas ficam para etapas futuras.</DialogDescription>
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

        <div className="grid gap-4 md:grid-cols-[0.35fr_0.65fr]">
          <div className="space-y-2">
            <Label htmlFor="code">Codigo</Label>
            <Input id="code" placeholder="A1" {...form.register("code")} />
            {form.formState.errors.code ? <p className="text-sm text-destructive">{form.formState.errors.code.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" placeholder="Demonstracao A1" {...form.register("name")} />
            {form.formState.errors.name ? <p className="text-sm text-destructive">{form.formState.errors.name.message}</p> : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descricao</Label>
          <Textarea id="description" placeholder="Resumo operacional da categoria." {...form.register("description")} />
          {form.formState.errors.description ? <p className="text-sm text-destructive">{form.formState.errors.description.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={String(form.watch("is_active"))}
            onValueChange={(value) => form.setValue("is_active", value === "true")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Ativa</SelectItem>
              <SelectItem value="false">Inativa</SelectItem>
            </SelectContent>
          </Select>
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

function DeactivateTaxonomyButton({ taxonomy }: { taxonomy: Taxonomy }) {
  const [isPending, startTransition] = useTransition();

  function deactivate() {
    startTransition(async () => {
      const result = await deactivateTaxonomyAction(taxonomy.id);
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Desativar taxonomia">
          <PowerOff className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desativar {taxonomy.code}?</AlertDialogTitle>
          <AlertDialogDescription>
            A taxonomia deixara de aparecer como ativa, mas sera preservada para historico e auditoria.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={deactivate} disabled={isPending}>
            {isPending ? "Desativando..." : "Desativar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
