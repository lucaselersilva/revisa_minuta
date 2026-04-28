"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, FileText, Gavel, ListChecks, Loader2, Plus } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { type FieldPath, type FieldValues, type UseFormReturn, useForm } from "react-hook-form";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createCaseTemplateAction,
  createDocumentRequirementAction,
  createLegalThesisAction,
  updateCaseTemplateAction,
  updateDocumentRequirementAction,
  updateLegalThesisAction
} from "@/features/legal-config/actions/legal-config-actions";
import {
  portfolioCaseTemplateSchema,
  portfolioDocumentRequirementSchema,
  portfolioLegalThesisSchema,
  type PortfolioCaseTemplateInput,
  type PortfolioDocumentRequirementInput,
  type PortfolioLegalThesisInput
} from "@/lib/validations/legal-config";
import { caseDocumentTypes } from "@/lib/validations/cases";
import type {
  Portfolio,
  PortfolioCaseTemplate,
  PortfolioDocumentRequirement,
  PortfolioLegalThesis,
  Taxonomy,
  WorkflowStepKey
} from "@/types/database";

const stepLabels: Record<WorkflowStepKey, string> = {
  cadastro_inicial: "Cadastro inicial",
  documentos_autor: "Documentos do autor",
  emenda_inicial: "Emenda à inicial",
  pre_analise: "Pré-análise",
  defesa: "Defesa",
  revisao_final: "Revisão final",
  relatorio: "Relatório"
};

const documentTypeLabels: Record<string, string> = {
  initial_petition: "Petição inicial",
  author_documents: "Documentos do autor",
  author_identity_document: "Documento de identidade do autor",
  author_address_proof: "Comprovante de endereço do autor",
  author_payment_proof: "Comprovante de pagamento",
  author_screen_capture: "Prints e capturas de tela",
  initial_amendment: "Emenda à inicial",
  initial_amendment_documents: "Documentos da emenda",
  defense: "Contestação",
  defense_documents: "Documentos da defesa",
  other: "Outros"
};

const workflowStepKeys: WorkflowStepKey[] = [
  "cadastro_inicial",
  "documentos_autor",
  "emenda_inicial",
  "pre_analise",
  "defesa",
  "revisao_final",
  "relatorio"
];

type Props = {
  portfolios: Portfolio[];
  taxonomies: Taxonomy[];
  requirements: PortfolioDocumentRequirement[];
  theses: PortfolioLegalThesis[];
  templates: PortfolioCaseTemplate[];
};

type PortfolioScopedFormValues = FieldValues & {
  portfolio_id: string;
  taxonomy_id?: string | null;
  is_active: boolean;
};

export function LegalConfigManager({ portfolios, taxonomies, requirements, theses, templates }: Props) {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>(portfolios[0]?.id ?? "");
  const [editingRequirement, setEditingRequirement] = useState<PortfolioDocumentRequirement | null>(null);
  const [editingThesis, setEditingThesis] = useState<PortfolioLegalThesis | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<PortfolioCaseTemplate | null>(null);
  const [requirementOpen, setRequirementOpen] = useState(false);
  const [thesisOpen, setThesisOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  const selectedTaxonomies = useMemo(
    () => taxonomies.filter((taxonomy) => taxonomy.portfolio_id === selectedPortfolioId),
    [selectedPortfolioId, taxonomies]
  );
  const selectedRequirements = useMemo(
    () => requirements.filter((item) => item.portfolio_id === selectedPortfolioId),
    [requirements, selectedPortfolioId]
  );
  const selectedTheses = useMemo(
    () => theses.filter((item) => item.portfolio_id === selectedPortfolioId),
    [selectedPortfolioId, theses]
  );
  const selectedTemplates = useMemo(
    () => templates.filter((item) => item.portfolio_id === selectedPortfolioId),
    [selectedPortfolioId, templates]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Escopo jurídico por carteira</CardTitle>
          <CardDescription>
            Configure documentos obrigatórios, teses consolidadas e modelos-base que orientam a operação e o workflow de cada carteira.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-2">
            <Label>Carteira ativa</Label>
            <Select value={selectedPortfolioId} onValueChange={setSelectedPortfolioId}>
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
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">Taxonomias disponíveis nesta carteira</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedTaxonomies.length > 0 ? (
                selectedTaxonomies.map((taxonomy) => (
                  <Badge key={taxonomy.id} variant="secondary">
                    {taxonomy.code}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma taxonomia cadastrada para esta carteira.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionCard
        icon={ListChecks}
        title="Documentos obrigatórios"
        description="Requisitos documentais que podem variar por carteira e, se necessário, por taxonomia."
        onCreate={() => {
          setEditingRequirement(null);
          setRequirementOpen(true);
        }}
        createLabel="Novo requisito"
      >
        <Dialog open={requirementOpen} onOpenChange={setRequirementOpen}>
          <DialogTrigger asChild>
            <span />
          </DialogTrigger>
          <DocumentRequirementForm
            open={requirementOpen}
            requirement={editingRequirement}
            portfolios={portfolios}
            taxonomies={taxonomies}
            initialPortfolioId={selectedPortfolioId}
            onClose={() => setRequirementOpen(false)}
          />
        </Dialog>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Etapa</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Taxonomia</TableHead>
              <TableHead>Regra</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedRequirements.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{stepLabels[item.step_key]}</TableCell>
                <TableCell>{documentTypeLabels[item.document_type]}</TableCell>
                <TableCell>{taxonomies.find((taxonomy) => taxonomy.id === item.taxonomy_id)?.code ?? "Todas"}</TableCell>
                <TableCell className="max-w-md text-muted-foreground">{item.requirement_label}</TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? "success" : "secondary"}>{item.is_active ? "Ativa" : "Inativa"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button variant="outline" size="icon" onClick={() => { setEditingRequirement(item); setRequirementOpen(true); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {selectedRequirements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-6">
                  <EmptyState icon={ListChecks} title="Nenhum requisito configurado" description="Cadastre os documentos obrigatórios iniciais desta carteira." />
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </SectionCard>

      <SectionCard
        icon={Gavel}
        title="Teses consolidadas"
        description="Bloco de teses e fundamentos que orientam a revisão e a construção da defesa por carteira."
        onCreate={() => {
          setEditingThesis(null);
          setThesisOpen(true);
        }}
        createLabel="Nova tese"
      >
        <Dialog open={thesisOpen} onOpenChange={setThesisOpen}>
          <DialogTrigger asChild>
            <span />
          </DialogTrigger>
          <LegalThesisForm
            thesis={editingThesis}
            portfolios={portfolios}
            taxonomies={taxonomies}
            initialPortfolioId={selectedPortfolioId}
            onClose={() => setThesisOpen(false)}
          />
        </Dialog>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Taxonomia</TableHead>
              <TableHead>Resumo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedTheses.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>{taxonomies.find((taxonomy) => taxonomy.id === item.taxonomy_id)?.code ?? "Geral"}</TableCell>
                <TableCell className="max-w-md text-muted-foreground">{item.summary}</TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? "success" : "secondary"}>{item.is_active ? "Ativa" : "Inativa"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button variant="outline" size="icon" onClick={() => { setEditingThesis(item); setThesisOpen(true); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {selectedTheses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-6">
                  <EmptyState icon={Gavel} title="Nenhuma tese cadastrada" description="Cadastre as teses gerais e específicas da carteira." />
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </SectionCard>

      <SectionCard
        icon={FileText}
        title="Modelos-base de contestação"
        description="Modelo de referência por taxonomia para orientar a conferência da peça e a futura IA jurídica."
        onCreate={() => {
          setEditingTemplate(null);
          setTemplateOpen(true);
        }}
        createLabel="Novo modelo-base"
      >
        <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
          <DialogTrigger asChild>
            <span />
          </DialogTrigger>
          <CaseTemplateForm
            template={editingTemplate}
            portfolios={portfolios}
            taxonomies={taxonomies}
            initialPortfolioId={selectedPortfolioId}
            onClose={() => setTemplateOpen(false)}
          />
        </Dialog>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Taxonomia</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Observações</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedTemplates.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{taxonomies.find((taxonomy) => taxonomy.id === item.taxonomy_id)?.code ?? "Sem taxonomia"}</TableCell>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell className="max-w-md text-muted-foreground">{item.usage_notes ?? "Sem observações"}</TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? "success" : "secondary"}>{item.is_active ? "Ativo" : "Inativo"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button variant="outline" size="icon" onClick={() => { setEditingTemplate(item); setTemplateOpen(true); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {selectedTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-6">
                  <EmptyState icon={FileText} title="Nenhum modelo-base cadastrado" description="Cadastre os modelos-base por taxonomia para dar suporte à operação." />
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  createLabel,
  onCreate,
  children
}: {
  icon: typeof FileText;
  title: string;
  description: string;
  createLabel: string;
  onCreate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4" />
          {createLabel}
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DocumentRequirementForm({
  requirement,
  portfolios,
  taxonomies,
  initialPortfolioId,
  onClose
}: {
  open: boolean;
  requirement: PortfolioDocumentRequirement | null;
  portfolios: Portfolio[];
  taxonomies: Taxonomy[];
  initialPortfolioId: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<PortfolioDocumentRequirementInput>({
    resolver: zodResolver(portfolioDocumentRequirementSchema),
    values: {
      portfolio_id: requirement?.portfolio_id ?? initialPortfolioId,
      taxonomy_id: requirement?.taxonomy_id ?? null,
      step_key: requirement?.step_key ?? "documentos_autor",
      document_type: requirement?.document_type ?? "initial_petition",
      requirement_label: requirement?.requirement_label ?? "",
      requirement_details: requirement?.requirement_details ?? "",
      is_required: requirement?.is_required ?? true,
      is_active: requirement?.is_active ?? true
    }
  });
  const filteredTaxonomies = taxonomies.filter((taxonomy) => taxonomy.portfolio_id === form.watch("portfolio_id"));

  function onSubmit(values: PortfolioDocumentRequirementInput) {
    startTransition(async () => {
      const result = requirement
        ? await updateDocumentRequirementAction(requirement.id, values)
        : await createDocumentRequirementAction(values);
      if (result.ok) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{requirement ? "Editar requisito documental" : "Novo requisito documental"}</DialogTitle>
        <DialogDescription>Configure quais documentos são exigidos nesta carteira e etapa do fluxo.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <PortfolioAndTaxonomyFields form={form} portfolios={portfolios} taxonomies={filteredTaxonomies} taxonomyOptional />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Etapa</Label>
            <Select value={form.watch("step_key")} onValueChange={(value) => form.setValue("step_key", value as WorkflowStepKey, { shouldDirty: true })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {workflowStepKeys.map((step) => <SelectItem key={step} value={step}>{stepLabels[step]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Documento</Label>
            <Select value={form.watch("document_type")} onValueChange={(value) => form.setValue("document_type", value as PortfolioDocumentRequirementInput["document_type"], { shouldDirty: true })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {caseDocumentTypes.map((type) => <SelectItem key={type} value={type}>{documentTypeLabels[type]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <FieldText form={form} name="requirement_label" label="Nome do requisito" placeholder="Ex.: Petição inicial obrigatória" />
        <FieldTextarea form={form} name="requirement_details" label="Detalhes" placeholder="Explique em que contexto esse documento deve estar presente." />
        <ActiveToggle form={form} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Salvar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function LegalThesisForm({
  thesis,
  portfolios,
  taxonomies,
  initialPortfolioId,
  onClose
}: {
  thesis: PortfolioLegalThesis | null;
  portfolios: Portfolio[];
  taxonomies: Taxonomy[];
  initialPortfolioId: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<PortfolioLegalThesisInput>({
    resolver: zodResolver(portfolioLegalThesisSchema),
    values: {
      portfolio_id: thesis?.portfolio_id ?? initialPortfolioId,
      taxonomy_id: thesis?.taxonomy_id ?? null,
      title: thesis?.title ?? "",
      summary: thesis?.summary ?? "",
      legal_basis: thesis?.legal_basis ?? "",
      applicability_notes: thesis?.applicability_notes ?? "",
      is_active: thesis?.is_active ?? true
    }
  });
  const filteredTaxonomies = taxonomies.filter((taxonomy) => taxonomy.portfolio_id === form.watch("portfolio_id"));

  function onSubmit(values: PortfolioLegalThesisInput) {
    startTransition(async () => {
      const result = thesis ? await updateLegalThesisAction(thesis.id, values) : await createLegalThesisAction(values);
      if (result.ok) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{thesis ? "Editar tese" : "Nova tese"}</DialogTitle>
        <DialogDescription>Registre teses gerais da carteira e teses específicas por taxonomia quando necessário.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <PortfolioAndTaxonomyFields form={form} portfolios={portfolios} taxonomies={filteredTaxonomies} taxonomyOptional />
        <FieldText form={form} name="title" label="Título" placeholder="Ex.: Ilegitimidade passiva da intermediadora" />
        <FieldTextarea form={form} name="summary" label="Resumo" placeholder="Síntese objetiva de quando e por que a tese deve ser considerada." />
        <FieldTextarea form={form} name="legal_basis" label="Base legal" placeholder="Jurisprudência, artigos e marcos regulatórios relevantes." />
        <FieldTextarea form={form} name="applicability_notes" label="Observações de aplicabilidade" placeholder="Cuidados práticos, limitações e sinais documentais." />
        <ActiveToggle form={form} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Salvar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function CaseTemplateForm({
  template,
  portfolios,
  taxonomies,
  initialPortfolioId,
  onClose
}: {
  template: PortfolioCaseTemplate | null;
  portfolios: Portfolio[];
  taxonomies: Taxonomy[];
  initialPortfolioId: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<PortfolioCaseTemplateInput>({
    resolver: zodResolver(portfolioCaseTemplateSchema),
    values: {
      portfolio_id: template?.portfolio_id ?? initialPortfolioId,
      taxonomy_id: template?.taxonomy_id ?? "",
      title: template?.title ?? "",
      template_markdown: template?.template_markdown ?? "",
      usage_notes: template?.usage_notes ?? "",
      is_active: template?.is_active ?? true
    }
  });
  const filteredTaxonomies = taxonomies.filter((taxonomy) => taxonomy.portfolio_id === form.watch("portfolio_id"));

  function onSubmit(values: PortfolioCaseTemplateInput) {
    startTransition(async () => {
      const result = template ? await updateCaseTemplateAction(template.id, values) : await createCaseTemplateAction(values);
      if (result.ok) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>{template ? "Editar modelo-base" : "Novo modelo-base"}</DialogTitle>
        <DialogDescription>Use texto aprovado pela operação jurídica para orientar a revisão das contestações.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <PortfolioAndTaxonomyFields form={form} portfolios={portfolios} taxonomies={filteredTaxonomies} />
        <FieldText form={form} name="title" label="Título" placeholder="Ex.: Modelo base - A1" />
        <FieldTextarea form={form} name="template_markdown" label="Conteúdo do modelo" placeholder="Estruture aqui o modelo-base em markdown." rows={14} />
        <FieldTextarea form={form} name="usage_notes" label="Observações" placeholder="Notas de uso, cautelas e limites do modelo." />
        <ActiveToggle form={form} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Salvar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function PortfolioAndTaxonomyFields({
  form,
  portfolios,
  taxonomies,
  taxonomyOptional = false
}: {
  form: UseFormReturn<PortfolioScopedFormValues>;
  portfolios: Portfolio[];
  taxonomies: Taxonomy[];
  taxonomyOptional?: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Carteira</Label>
        <Select value={form.watch("portfolio_id")} onValueChange={(value) => { form.setValue("portfolio_id", value, { shouldDirty: true }); form.setValue("taxonomy_id", taxonomyOptional ? null : ""); }}>
          <SelectTrigger><SelectValue placeholder="Selecione a carteira" /></SelectTrigger>
          <SelectContent>
            {portfolios.map((portfolio) => <SelectItem key={portfolio.id} value={portfolio.id}>{portfolio.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Taxonomia</Label>
        <Select
          value={form.watch("taxonomy_id") ?? (taxonomyOptional ? "all" : "")}
          onValueChange={(value) => form.setValue("taxonomy_id", value === "all" ? null : value, { shouldDirty: true })}
        >
          <SelectTrigger><SelectValue placeholder={taxonomyOptional ? "Todas as taxonomias" : "Selecione a taxonomia"} /></SelectTrigger>
          <SelectContent>
            {taxonomyOptional ? <SelectItem value="all">Geral da carteira</SelectItem> : null}
            {taxonomies.map((taxonomy) => <SelectItem key={taxonomy.id} value={taxonomy.id}>{taxonomy.code} - {taxonomy.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function FieldText({ form, name, label, placeholder }: { form: ReturnType<typeof useForm<any>>; name: string; label: string; placeholder: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input placeholder={placeholder} {...form.register(name)} />
      {form.formState.errors[name] ? <p className="text-sm text-destructive">{String(form.formState.errors[name]?.message ?? "")}</p> : null}
    </div>
  );
}

function FieldText<TFormValues extends FieldValues>({
  form,
  name,
  label,
  placeholder
}: {
  form: UseFormReturn<TFormValues>;
  name: FieldPath<TFormValues>;
  label: string;
  placeholder: string;
}) {
  const error = form.formState.errors[name];

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input placeholder={placeholder} {...form.register(name)} />
      {error ? <p className="text-sm text-destructive">{String(error.message ?? "")}</p> : null}
    </div>
  );
}

function FieldTextarea<TFormValues extends FieldValues>({
  form,
  name,
  label,
  placeholder,
  rows = 5
}: {
  form: UseFormReturn<TFormValues>;
  name: FieldPath<TFormValues>;
  label: string;
  placeholder: string;
  rows?: number;
}) {
  const error = form.formState.errors[name];

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea rows={rows} placeholder={placeholder} {...form.register(name)} />
      {error ? <p className="text-sm text-destructive">{String(error.message ?? "")}</p> : null}
    </div>
  );
}

function ActiveToggle({ form }: { form: UseFormReturn<PortfolioScopedFormValues> }) {
  return (
    <div className="space-y-2">
      <Label>Status</Label>
      <Select value={String(form.watch("is_active"))} onValueChange={(value) => form.setValue("is_active", value === "true", { shouldDirty: true })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Ativo</SelectItem>
          <SelectItem value="false">Inativo</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
