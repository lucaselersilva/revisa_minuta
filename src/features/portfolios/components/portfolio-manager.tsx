"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Layers3, Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { createPortfolioAction, updatePortfolioAction } from "@/features/portfolios/actions/portfolio-actions";
import { portfolioSchema, type PortfolioInput } from "@/lib/validations/portfolios";
import type { Portfolio } from "@/types/database";

export function PortfolioManager({ portfolios }: { portfolios: Portfolio[] }) {
  const [editing, setEditing] = useState<Portfolio | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border bg-white shadow-subtle">
      <div className="flex flex-col justify-between gap-4 border-b p-5 md:flex-row md:items-center">
        <div>
          <h2 className="text-base font-semibold">Carteiras configuradas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Cada carteira separa clientes, regras operacionais, taxonomias e empresas representadas.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nova carteira
            </Button>
          </DialogTrigger>
          <PortfolioForm portfolio={editing} onClose={() => setOpen(false)} />
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Carteira</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Segmento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24 text-right">Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {portfolios.map((portfolio) => (
            <TableRow key={portfolio.id}>
              <TableCell>
                <div className="font-medium">{portfolio.name}</div>
                <div className="text-sm text-muted-foreground">{portfolio.description ?? "Sem descricao"}</div>
              </TableCell>
              <TableCell>{portfolio.slug}</TableCell>
              <TableCell>{portfolio.segment ?? "Nao informado"}</TableCell>
              <TableCell>
                <Badge variant={portfolio.is_active ? "success" : "secondary"}>
                  {portfolio.is_active ? "Ativa" : "Inativa"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Editar carteira"
                    onClick={() => {
                      setEditing(portfolio);
                      setOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {portfolios.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="p-6">
                <EmptyState
                  icon={Layers3}
                  title="Nenhuma carteira cadastrada"
                  description="Crie as carteiras para separar clientes, taxonomias e empresas representadas desde a fundacao."
                />
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}

function PortfolioForm({ portfolio, onClose }: { portfolio: Portfolio | null; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<PortfolioInput>({
    resolver: zodResolver(portfolioSchema),
    values: {
      name: portfolio?.name ?? "",
      slug: portfolio?.slug ?? "",
      segment: portfolio?.segment ?? "",
      description: portfolio?.description ?? "",
      is_active: portfolio?.is_active ?? true
    }
  });

  function onSubmit(values: PortfolioInput) {
    startTransition(async () => {
      const result = portfolio ? await updatePortfolioAction(portfolio.id, values) : await createPortfolioAction(values);

      if (result.ok) {
        toast.success(result.message);
        onClose();
        form.reset({ name: "", slug: "", segment: "", description: "", is_active: true });
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{portfolio ? "Editar carteira" : "Nova carteira"}</DialogTitle>
        <DialogDescription>Use a carteira como camada principal de segregacao entre clientes e operacoes.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="portfolio_name">Nome</Label>
            <Input id="portfolio_name" placeholder="123 Milhas" {...form.register("name")} />
            {form.formState.errors.name ? <p className="text-sm text-destructive">{form.formState.errors.name.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="portfolio_slug">Slug</Label>
            <Input id="portfolio_slug" placeholder="123-milhas" {...form.register("slug")} />
            {form.formState.errors.slug ? <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p> : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="portfolio_segment">Segmento</Label>
          <Input id="portfolio_segment" placeholder="turismo, bancario, varejo..." {...form.register("segment")} />
          {form.formState.errors.segment ? <p className="text-sm text-destructive">{form.formState.errors.segment.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="portfolio_description">Descricao</Label>
          <Textarea id="portfolio_description" placeholder="Observacoes estruturais da carteira." {...form.register("description")} />
          {form.formState.errors.description ? <p className="text-sm text-destructive">{form.formState.errors.description.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={String(form.watch("is_active"))} onValueChange={(value) => form.setValue("is_active", value === "true", { shouldDirty: true })}>
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
