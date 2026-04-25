"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCaseAction, updateCaseAction } from "@/features/cases/actions/case-actions";
import { caseStatusLabels } from "@/features/cases/components/case-status-badge";
import type { CaseDetail, CaseSelectOptions } from "@/features/cases/types";
import { caseFormSchema, casePartyRoles, caseStatuses, type CaseFormInput } from "@/lib/validations/cases";

const partyRoleLabels = {
  author: "Autor",
  defendant: "Reu",
  third_party: "Terceiro"
};

type Props = {
  options: CaseSelectOptions;
  initialCase?: CaseDetail;
  importedFromUpload?: boolean;
};

export function CaseForm({ options, initialCase, importedFromUpload = false }: Props) {
  const [isPending, startTransition] = useTransition();
  const currentEntity = initialCase?.entity_links[0]?.entity;
  const defaultEntityMode = currentEntity || options.entities.length > 0 ? "existing" : "new";
  const form = useForm<CaseFormInput>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: {
      case_number: initialCase?.case_number ?? "",
      title: initialCase?.title ?? "",
      description: initialCase?.description ?? "",
      status: initialCase?.status ?? "draft",
      taxonomy_id: initialCase?.taxonomy_id ?? undefined,
      responsible_lawyer_id: initialCase?.responsible_lawyer_id ?? undefined,
      represented_entity: currentEntity
        ? { mode: "existing", entity_id: currentEntity.id, name: "", document: "" }
        : { mode: defaultEntityMode, entity_id: undefined, name: "", document: "" },
      parties: initialCase?.parties.length
        ? initialCase.parties.map((party) => ({
            role: party.role,
            name: party.name,
            document: party.document ?? ""
          }))
        : [{ role: "author", name: "", document: "" }]
    }
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "parties" });
  const entityMode = form.watch("represented_entity.mode");

  function onSubmit(values: CaseFormInput) {
    startTransition(async () => {
      const result = initialCase
        ? await updateCaseAction(initialCase.id, values)
        : await createCaseAction(values);

      if (result?.ok === false) {
        toast.error(result.message);
      }
    });
  }

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      {importedFromUpload ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <p className="text-sm font-semibold text-slate-900">Dados pre-preenchidos a partir do upload inicial</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Revise os campos preenchidos automaticamente, ajuste autores, empresa representada e demais informacoes que precisarem de confirmacao antes de seguir o fluxo.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Dados do processo</CardTitle>
          <CardDescription>Identificacao operacional do caso. A classificacao automatica da taxonomia pode ser sugerida depois no fluxo guiado.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="case_number">Numero</Label>
            <Input id="case_number" placeholder="0000000-00.0000.0.00.0000" {...form.register("case_number")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Titulo</Label>
            <Input id="title" placeholder="Resumo curto do caso" {...form.register("title")} />
            {form.formState.errors.title ? <p className="text-sm text-destructive">{form.formState.errors.title.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.watch("status")} onValueChange={(value) => form.setValue("status", value as CaseFormInput["status"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {caseStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {caseStatusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Taxonomia</Label>
            <Select value={form.watch("taxonomy_id") ?? "none"} onValueChange={(value) => form.setValue("taxonomy_id", value === "none" ? undefined : value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nao definida</SelectItem>
                {options.taxonomies.map((taxonomy) => (
                  <SelectItem key={taxonomy.id} value={taxonomy.id}>
                    {taxonomy.code} - {taxonomy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Responsavel</Label>
            <Select
              value={form.watch("responsible_lawyer_id") ?? "none"}
              onValueChange={(value) => form.setValue("responsible_lawyer_id", value === "none" ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem responsavel</SelectItem>
                {options.lawyers.map((lawyer) => (
                  <SelectItem key={lawyer.id} value={lawyer.id}>
                    {lawyer.full_name ?? "Usuario interno"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Descricao</Label>
            <Textarea id="description" placeholder="Contexto objetivo para organizacao interna." {...form.register("description")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Empresa representada</CardTitle>
          <CardDescription>Vinculo estruturado para futura ficha jurometrica simples.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Origem</Label>
            <Select value={entityMode} onValueChange={(value) => form.setValue("represented_entity.mode", value as "existing" | "new")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="existing">Selecionar existente</SelectItem>
                <SelectItem value="new">Criar nova</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {entityMode === "existing" ? (
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select
                value={form.watch("represented_entity.entity_id") ?? "none"}
                onValueChange={(value) => form.setValue("represented_entity.entity_id", value === "none" ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione</SelectItem>
                  {options.entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.represented_entity?.entity_id ? (
                <p className="text-sm text-destructive">{form.formState.errors.represented_entity.entity_id.message}</p>
              ) : null}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="entity_name">Nome</Label>
                <Input id="entity_name" placeholder="MaxMilhas" {...form.register("represented_entity.name")} />
                {form.formState.errors.represented_entity?.name ? (
                  <p className="text-sm text-destructive">{form.formState.errors.represented_entity.name.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="entity_document">Documento</Label>
                <Input id="entity_document" placeholder="CNPJ ou CPF" {...form.register("represented_entity.document")} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Partes</CardTitle>
            <CardDescription>Autores, reus e terceiros do processo.</CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={() => append({ role: "author", name: "", document: "" })}>
            <Plus className="h-4 w-4" />
            Parte
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid gap-3 rounded-lg border bg-white p-3 md:grid-cols-[0.25fr_1fr_0.55fr_auto]">
              <Select
                value={form.watch(`parties.${index}.role`)}
                onValueChange={(value) => form.setValue(`parties.${index}.role`, value as CaseFormInput["parties"][number]["role"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {casePartyRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {partyRoleLabels[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Nome da parte" {...form.register(`parties.${index}.name`)} />
              <Input placeholder="Documento" {...form.register(`parties.${index}.document`)} />
              <Button type="button" variant="outline" size="icon" aria-label="Remover parte" onClick={() => remove(index)} disabled={fields.length === 1}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {form.formState.errors.parties ? <p className="text-sm text-destructive">{form.formState.errors.parties.message}</p> : null}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar processo
        </Button>
      </div>
    </form>
  );
}
