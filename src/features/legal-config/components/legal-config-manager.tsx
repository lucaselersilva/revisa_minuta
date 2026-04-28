"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, FileText, Gavel, ListChecks, Loader2, Plus } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState, useTransition } from "react";
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
  createPromptProfileAction,
  updateCaseTemplateAction,
  updateDocumentRequirementAction,
  updateLegalThesisAction,
  updatePromptProfileAction
} from "@/features/legal-config/actions/legal-config-actions";
import {
  buildDefenseConformitySystemPrompt,
  buildDefenseConformityUserPrompt
} from "@/features/ai/prompts/defense-conformity-prompt";
import { buildPreAnalysisSystemPrompt, buildPreAnalysisUserPrompt } from "@/features/ai/prompts/pre-analysis-prompt";
import {
  buildPromptProfileContextLines,
  getPortfolioStaticGuidance
} from "@/features/legal-config/lib/prompt-guidance";
import {
  portfolioCaseTemplateSchema,
  portfolioDocumentRequirementSchema,
  portfolioLegalThesisSchema,
  portfolioPromptProfileSchema,
  type PortfolioCaseTemplateInput,
  type PortfolioDocumentRequirementInput,
  type PortfolioLegalThesisInput,
  type PortfolioPromptProfileInput
} from "@/lib/validations/legal-config";
import { caseDocumentTypes } from "@/lib/validations/cases";
import type {
  Portfolio,
  PortfolioCaseTemplate,
  PortfolioDocumentRequirement,
  PortfolioLegalThesis,
  PortfolioPromptProfile,
  PromptAnalysisType,
  Taxonomy,
  WorkflowStepKey
} from "@/types/database";

const stepLabels: Record<WorkflowStepKey, string> = {
  cadastro_inicial: "Cadastro inicial",
  documentos_autor: "Documentos do autor",
  emenda_inicial: "Emenda inicial",
  pre_analise: "Pre-analise",
  defesa: "Defesa",
  revisao_final: "Revisao final",
  relatorio: "Relatorio"
};

const documentTypeLabels: Record<string, string> = {
  initial_petition: "Peticao inicial",
  author_documents: "Documentos do autor",
  author_identity_document: "Documento de identidade do autor",
  author_address_proof: "Comprovante de endereco do autor",
  author_payment_proof: "Comprovante de pagamento",
  author_screen_capture: "Prints e capturas de tela",
  initial_amendment: "Emenda inicial",
  initial_amendment_documents: "Documentos da emenda",
  defense: "Contestacao",
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

const promptAnalysisTypeLabels: Record<PromptAnalysisType, string> = {
  pre_analysis: "Pre-analise",
  defense_conformity: "Conformidade da defesa"
};

type Props = {
  portfolios: Portfolio[];
  taxonomies: Taxonomy[];
  requirements: PortfolioDocumentRequirement[];
  theses: PortfolioLegalThesis[];
  templates: PortfolioCaseTemplate[];
  promptProfiles: PortfolioPromptProfile[];
};

type PortfolioScopedFormValues = FieldValues & {
  portfolio_id: string;
  taxonomy_id?: string | null;
  is_active: boolean;
};

export function LegalConfigManager({ portfolios, taxonomies, requirements, theses, templates, promptProfiles }: Props) {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>(portfolios[0]?.id ?? "");
  const [previewAnalysisType, setPreviewAnalysisType] = useState<PromptAnalysisType>("pre_analysis");
  const [previewTaxonomyId, setPreviewTaxonomyId] = useState<string>("all");
  const [editingRequirement, setEditingRequirement] = useState<PortfolioDocumentRequirement | null>(null);
  const [editingThesis, setEditingThesis] = useState<PortfolioLegalThesis | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<PortfolioCaseTemplate | null>(null);
  const [editingPromptProfile, setEditingPromptProfile] = useState<PortfolioPromptProfile | null>(null);
  const [requirementOpen, setRequirementOpen] = useState(false);
  const [thesisOpen, setThesisOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [promptProfileOpen, setPromptProfileOpen] = useState(false);

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
  const selectedPromptProfiles = useMemo(
    () => promptProfiles.filter((item) => item.portfolio_id === selectedPortfolioId),
    [promptProfiles, selectedPortfolioId]
  );
  const selectedPortfolio = useMemo(
    () => portfolios.find((portfolio) => portfolio.id === selectedPortfolioId) ?? null,
    [portfolios, selectedPortfolioId]
  );
  const previewTaxonomy = useMemo(
    () => selectedTaxonomies.find((taxonomy) => taxonomy.id === previewTaxonomyId) ?? null,
    [previewTaxonomyId, selectedTaxonomies]
  );
  const promptPreview = useMemo(() => {
    if (!selectedPortfolio) {
      return null;
    }

    const scopedRequirements = selectedRequirements.filter((item) => {
      if (previewAnalysisType === "pre_analysis") {
        if (!["cadastro_inicial", "documentos_autor", "pre_analise"].includes(item.step_key)) {
          return false;
        }
      } else if (!["defesa", "revisao_final"].includes(item.step_key)) {
        return false;
      }

      return !item.taxonomy_id || item.taxonomy_id === previewTaxonomy?.id;
    });
    const scopedTheses = selectedTheses.filter((item) => !item.taxonomy_id || item.taxonomy_id === previewTaxonomy?.id);
    const scopedTemplates = selectedTemplates.filter((item) => item.taxonomy_id === previewTaxonomy?.id);
    const scopedProfiles = selectedPromptProfiles.filter(
      (item) => item.analysis_type === previewAnalysisType && (!item.taxonomy_id || item.taxonomy_id === previewTaxonomy?.id)
    );
    const activePromptProfile =
      [...scopedProfiles].sort((left, right) => {
        const leftSpecificity = left.taxonomy_id === previewTaxonomy?.id ? 0 : left.taxonomy_id ? 1 : 2;
        const rightSpecificity = right.taxonomy_id === previewTaxonomy?.id ? 0 : right.taxonomy_id ? 1 : 2;
        if (leftSpecificity !== rightSpecificity) {
          return leftSpecificity - rightSpecificity;
        }
        return right.updated_at.localeCompare(left.updated_at);
      })[0] ?? null;

    const staticGuidance = getPortfolioStaticGuidance({
      portfolioSlug: selectedPortfolio.slug,
      portfolioSegment: selectedPortfolio.segment,
      analysisType: previewAnalysisType
    });

    const mockContext = [
      "[Pre-visualizacao administrativa do prompt]",
      "Este bloco simula a montagem do prompt efetivo sem dados concretos de um processo.",
      "",
      "[Escopo selecionado]",
      `Carteira: ${selectedPortfolio.name}`,
      `Taxonomia: ${previewTaxonomy ? `${previewTaxonomy.code} - ${previewTaxonomy.name}` : "Geral da carteira"}`,
      `Tipo de analise: ${promptAnalysisTypeLabels[previewAnalysisType]}`,
      "",
      "[Configuracao juridica ativa]",
      `Requisitos ativos considerados: ${scopedRequirements.length > 0 ? scopedRequirements.map((item) => `${item.requirement_label} (${item.document_type})`).join("; ") : "nenhum requisito ativo para este escopo"}`,
      ...(scopedTheses.length > 0
        ? ["Teses consolidadas consideradas:", ...scopedTheses.map((item) => `- ${item.title}: ${item.summary}`)]
        : ["Teses consolidadas consideradas: nenhuma tese ativa para este escopo."]),
      ...(scopedTemplates.length > 0
        ? [
            "Modelo-base considerado:",
            ...scopedTemplates.slice(0, 1).map((item) => `${item.title}\n${item.template_markdown}`)
          ]
        : ["Modelo-base considerado: nenhum modelo-base ativo para esta taxonomia."]),
      "",
      "[Diretrizes operacionais da carteira]",
      `Estrategia base considerada: ${staticGuidance.strategyLabel}.`,
      "Focos operacionais prioritarios:",
      ...staticGuidance.focusAreas.map((item) => `- ${item}`),
      "Cuidados de leitura:",
      ...staticGuidance.cautionPoints.map((item) => `- ${item}`),
      "Enfase esperada na saida:",
      ...staticGuidance.outputEmphasis.map((item) => `- ${item}`),
      "",
      "[Refino administrativo de prompt]",
      ...buildPromptProfileContextLines(activePromptProfile)
    ].join("\n");

    return {
      activePromptProfile,
      systemPrompt:
        previewAnalysisType === "pre_analysis"
          ? buildPreAnalysisSystemPrompt()
          : buildDefenseConformitySystemPrompt(),
      userPrompt:
        previewAnalysisType === "pre_analysis"
          ? buildPreAnalysisUserPrompt(mockContext)
          : buildDefenseConformityUserPrompt(mockContext),
      counts: {
        requirements: scopedRequirements.length,
        theses: scopedTheses.length,
        templates: scopedTemplates.length
      }
    };
  }, [
    previewAnalysisType,
    previewTaxonomy,
    selectedPortfolio,
    selectedPromptProfiles,
    selectedRequirements,
    selectedTemplates,
    selectedTheses
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Escopo juridico por carteira</CardTitle>
          <CardDescription>
            Configure documentos obrigatorios, teses, perfis de prompt e modelos-base que orientam cada carteira.
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
            <p className="text-sm font-medium">Taxonomias disponiveis nesta carteira</p>
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

      <Card>
        <CardHeader>
          <CardTitle>Pre-visualizacao do prompt</CardTitle>
          <CardDescription>
            Visualizacao somente leitura do prompt efetivo por carteira, taxonomia e tipo de analise.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label>Tipo de analise</Label>
              <Select value={previewAnalysisType} onValueChange={(value) => setPreviewAnalysisType(value as PromptAnalysisType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(promptAnalysisTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Taxonomia</Label>
              <Select value={previewTaxonomyId} onValueChange={setPreviewTaxonomyId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Geral da carteira</SelectItem>
                  {selectedTaxonomies.map((taxonomy) => (
                    <SelectItem key={taxonomy.id} value={taxonomy.id}>
                      {taxonomy.code} - {taxonomy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border bg-muted/25 p-4">
              <p className="text-sm font-medium">Base considerada</p>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p>Requisitos: {promptPreview?.counts.requirements ?? 0}</p>
                <p>Teses: {promptPreview?.counts.theses ?? 0}</p>
                <p>Modelos-base: {promptPreview?.counts.templates ?? 0}</p>
                <p>Perfil de prompt: {promptPreview?.activePromptProfile?.profile_name ?? "Nenhum ativo"}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 2xl:grid-cols-2">
            <ReadonlyPromptBlock
              title="Prompt de sistema"
              description="Camada base do sistema, usada como instrução principal da IA."
              value={promptPreview?.systemPrompt ?? "Selecione uma carteira para visualizar o prompt."}
            />
            <ReadonlyPromptBlock
              title="Prompt consolidado do usuario"
              description="Previa consolidada com diretrizes da carteira, configuracao juridica e perfil administrativo."
              value={promptPreview?.userPrompt ?? "Selecione uma carteira para visualizar o prompt."}
            />
          </div>
        </CardContent>
      </Card>

      <SectionCard
        icon={ListChecks}
        title="Documentos obrigatorios"
        description="Requisitos documentais que podem variar por carteira e por taxonomia."
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
              <TableHead className="w-24 text-right">Acoes</TableHead>
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
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setEditingRequirement(item);
                        setRequirementOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {selectedRequirements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-6">
                  <EmptyState
                    icon={ListChecks}
                    title="Nenhum requisito configurado"
                    description="Cadastre os documentos obrigatorios iniciais desta carteira."
                  />
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </SectionCard>

      <SectionCard
        icon={Gavel}
        title="Teses consolidadas"
        description="Teses e fundamentos que orientam a leitura defensiva da carteira."
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
              <TableHead>Titulo</TableHead>
              <TableHead>Taxonomia</TableHead>
              <TableHead>Resumo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Acoes</TableHead>
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
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setEditingThesis(item);
                        setThesisOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {selectedTheses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-6">
                  <EmptyState icon={Gavel} title="Nenhuma tese cadastrada" description="Cadastre as teses gerais e especificas da carteira." />
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </SectionCard>

      <SectionCard
        icon={Edit}
        title="Perfis de prompt"
        description="Refino administrativo controlado da analise por carteira, taxonomia e tipo de geracao."
        onCreate={() => {
          setEditingPromptProfile(null);
          setPromptProfileOpen(true);
        }}
        createLabel="Novo perfil"
      >
        <Dialog open={promptProfileOpen} onOpenChange={setPromptProfileOpen}>
          <DialogTrigger asChild>
            <span />
          </DialogTrigger>
          <PromptProfileForm
            promptProfile={editingPromptProfile}
            portfolios={portfolios}
            taxonomies={taxonomies}
            initialPortfolioId={selectedPortfolioId}
            onClose={() => setPromptProfileOpen(false)}
          />
        </Dialog>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Escopo</TableHead>
              <TableHead>Analise</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Resumo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedPromptProfiles.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{taxonomies.find((taxonomy) => taxonomy.id === item.taxonomy_id)?.code ?? "Geral"}</TableCell>
                <TableCell>{promptAnalysisTypeLabels[item.analysis_type]}</TableCell>
                <TableCell className="font-medium">{item.profile_name}</TableCell>
                <TableCell className="max-w-md text-muted-foreground">
                  {item.instruction_priority ?? item.must_check_items ?? item.output_emphasis ?? "Sem resumo"}
                </TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? "success" : "secondary"}>{item.is_active ? "Ativo" : "Inativo"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setEditingPromptProfile(item);
                        setPromptProfileOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {selectedPromptProfiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-6">
                  <EmptyState
                    icon={Edit}
                    title="Nenhum perfil de prompt cadastrado"
                    description="Cadastre prioridades, checks e restricoes de analise por carteira."
                  />
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </SectionCard>

      <SectionCard
        icon={FileText}
        title="Modelos-base de contestacao"
        description="Modelo de referencia por taxonomia para orientar a conferencia da peca e a IA juridica."
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
              <TableHead>Observacoes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedTemplates.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {taxonomies.find((taxonomy) => taxonomy.id === item.taxonomy_id)?.code ?? "Sem taxonomia"}
                </TableCell>
                <TableCell className="max-w-md text-muted-foreground">{item.usage_notes ?? "Sem observacoes"}</TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? "success" : "secondary"}>{item.is_active ? "Ativo" : "Inativo"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setEditingTemplate(item);
                        setTemplateOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {selectedTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="p-6">
                  <EmptyState icon={FileText} title="Nenhum modelo-base cadastrado" description="Cadastre os modelos-base por taxonomia." />
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
  children: ReactNode;
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
        <DialogDescription>Configure quais documentos sao exigidos nesta carteira e etapa do fluxo.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <PortfolioAndTaxonomyFields form={form} portfolios={portfolios} taxonomies={filteredTaxonomies} taxonomyOptional />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Etapa</Label>
            <Select
              value={form.watch("step_key")}
              onValueChange={(value) => form.setValue("step_key", value as WorkflowStepKey, { shouldDirty: true })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {workflowStepKeys.map((step) => (
                  <SelectItem key={step} value={step}>
                    {stepLabels[step]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Documento</Label>
            <Select
              value={form.watch("document_type")}
              onValueChange={(value) =>
                form.setValue("document_type", value as PortfolioDocumentRequirementInput["document_type"], {
                  shouldDirty: true
                })
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {caseDocumentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {documentTypeLabels[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <FieldText form={form} name="requirement_label" label="Nome do requisito" placeholder="Ex.: Peticao inicial obrigatoria" />
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
        <DialogDescription>Registre teses gerais da carteira e teses especificas por taxonomia quando necessario.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <PortfolioAndTaxonomyFields form={form} portfolios={portfolios} taxonomies={filteredTaxonomies} taxonomyOptional />
        <FieldText form={form} name="title" label="Titulo" placeholder="Ex.: Ilegitimidade passiva da intermediadora" />
        <FieldTextarea form={form} name="summary" label="Resumo" placeholder="Sintese objetiva de quando e por que a tese deve ser considerada." />
        <FieldTextarea form={form} name="legal_basis" label="Base legal" placeholder="Jurisprudencia, artigos e marcos regulatorios relevantes." />
        <FieldTextarea form={form} name="applicability_notes" label="Observacoes de aplicabilidade" placeholder="Cuidados praticos, limitacoes e sinais documentais." />
        <ActiveToggle form={form} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Salvar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function PromptProfileForm({
  promptProfile,
  portfolios,
  taxonomies,
  initialPortfolioId,
  onClose
}: {
  promptProfile: PortfolioPromptProfile | null;
  portfolios: Portfolio[];
  taxonomies: Taxonomy[];
  initialPortfolioId: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<PortfolioPromptProfileInput>({
    resolver: zodResolver(portfolioPromptProfileSchema),
    values: {
      portfolio_id: promptProfile?.portfolio_id ?? initialPortfolioId,
      taxonomy_id: promptProfile?.taxonomy_id ?? null,
      analysis_type: promptProfile?.analysis_type ?? "pre_analysis",
      profile_name: promptProfile?.profile_name ?? "",
      instruction_priority: promptProfile?.instruction_priority ?? "",
      must_check_items: promptProfile?.must_check_items ?? "",
      forbidden_assumptions: promptProfile?.forbidden_assumptions ?? "",
      preferred_reasoning_style: promptProfile?.preferred_reasoning_style ?? "",
      output_emphasis: promptProfile?.output_emphasis ?? "",
      additional_instructions: promptProfile?.additional_instructions ?? "",
      is_active: promptProfile?.is_active ?? true
    }
  });
  const filteredTaxonomies = taxonomies.filter((taxonomy) => taxonomy.portfolio_id === form.watch("portfolio_id"));

  function onSubmit(values: PortfolioPromptProfileInput) {
    startTransition(async () => {
      const result = promptProfile
        ? await updatePromptProfileAction(promptProfile.id, values)
        : await createPromptProfileAction(values);

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
        <DialogTitle>{promptProfile ? "Editar perfil de prompt" : "Novo perfil de prompt"}</DialogTitle>
        <DialogDescription>Defina prioridades, checks obrigatorios e restricoes controladas para cada tipo de analise.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <PortfolioAndTaxonomyFields form={form} portfolios={portfolios} taxonomies={filteredTaxonomies} taxonomyOptional />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Tipo de analise</Label>
            <Select
              value={form.watch("analysis_type")}
              onValueChange={(value) => form.setValue("analysis_type", value as PromptAnalysisType, { shouldDirty: true })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(promptAnalysisTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FieldText form={form} name="profile_name" label="Nome do perfil" placeholder="Ex.: Pre-analise BMG - Contratacao contestada" />
        </div>
        <FieldTextarea form={form} name="instruction_priority" label="Prioridades de leitura" placeholder="Liste os focos prioritarios desta analise." />
        <FieldTextarea form={form} name="must_check_items" label="Itens que sempre devem ser verificados" placeholder="Ex.: contrato, extrato, comprovante de compra, reserva, localizador..." />
        <FieldTextarea form={form} name="forbidden_assumptions" label="Presuncoes vedadas" placeholder="Ex.: nao presumir fraude, nao presumir responsabilidade automatica..." />
        <FieldTextarea form={form} name="preferred_reasoning_style" label="Estilo de raciocinio preferido" placeholder="Ex.: comparativo, cronologico, focado em rastreabilidade documental." />
        <FieldTextarea form={form} name="output_emphasis" label="Enfase da saida" placeholder="Ex.: lacunas documentais, coerencia temporal, cadeia contratual, pedidos nao rebatidos." />
        <FieldTextarea form={form} name="additional_instructions" label="Instrucoes complementares" placeholder="Observacoes adicionais para calibrar a geracao." />
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
      title: template?.title ?? "Modelo base",
      template_markdown: template?.template_markdown ?? "",
      usage_notes: template?.usage_notes ?? "",
      is_active: template?.is_active ?? true
    }
  });
  const filteredTaxonomies = taxonomies.filter((taxonomy) => taxonomy.portfolio_id === form.watch("portfolio_id"));
  const selectedTaxonomy = filteredTaxonomies.find((taxonomy) => taxonomy.id === form.watch("taxonomy_id"));

  useEffect(() => {
    if (!selectedTaxonomy) {
      return;
    }

    const nextTitle = `Modelo base - ${selectedTaxonomy.code}`;
    if (form.getValues("title") !== nextTitle) {
      form.setValue("title", nextTitle, { shouldDirty: true });
    }
  }, [form, selectedTaxonomy]);

  function onSubmit(values: PortfolioCaseTemplateInput) {
    startTransition(async () => {
      const normalizedValues: PortfolioCaseTemplateInput = {
        ...values,
        title: selectedTaxonomy ? `Modelo base - ${selectedTaxonomy.code}` : values.title
      };
      const result = template
        ? await updateCaseTemplateAction(template.id, normalizedValues)
        : await createCaseTemplateAction(normalizedValues);

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
        <DialogDescription>Use a taxonomia como referencia principal do modelo-base e refine o conteudo aprovado pela operacao juridica.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <PortfolioAndTaxonomyFields form={form} portfolios={portfolios} taxonomies={filteredTaxonomies} />
        <FieldTextarea form={form} name="template_markdown" label="Conteudo do modelo" placeholder="Estruture aqui o modelo-base em markdown." rows={14} />
        <FieldTextarea form={form} name="usage_notes" label="Observacoes" placeholder="Notas de uso, cautelas e limites do modelo." />
        <ActiveToggle form={form} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Salvar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function PortfolioAndTaxonomyFields<TFormValues extends PortfolioScopedFormValues>({
  form,
  portfolios,
  taxonomies,
  taxonomyOptional = false
}: {
  form: UseFormReturn<TFormValues>;
  portfolios: Portfolio[];
  taxonomies: Taxonomy[];
  taxonomyOptional?: boolean;
}) {
  const portfolioField = "portfolio_id" as FieldPath<TFormValues>;
  const taxonomyField = "taxonomy_id" as FieldPath<TFormValues>;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Carteira</Label>
        <Select
          value={String(form.watch(portfolioField))}
          onValueChange={(value) => {
            form.setValue(portfolioField, value as TFormValues[FieldPath<TFormValues>], { shouldDirty: true });
            form.setValue(taxonomyField, (taxonomyOptional ? null : "") as TFormValues[FieldPath<TFormValues>]);
          }}
        >
          <SelectTrigger><SelectValue placeholder="Selecione a carteira" /></SelectTrigger>
          <SelectContent>
            {portfolios.map((portfolio) => (
              <SelectItem key={portfolio.id} value={portfolio.id}>
                {portfolio.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Taxonomia</Label>
        <Select
          value={String(form.watch(taxonomyField) ?? (taxonomyOptional ? "all" : ""))}
          onValueChange={(value) =>
            form.setValue(taxonomyField, (value === "all" ? null : value) as TFormValues[FieldPath<TFormValues>], {
              shouldDirty: true
            })
          }
        >
          <SelectTrigger><SelectValue placeholder={taxonomyOptional ? "Todas as taxonomias" : "Selecione a taxonomia"} /></SelectTrigger>
          <SelectContent>
            {taxonomyOptional ? <SelectItem value="all">Geral da carteira</SelectItem> : null}
            {taxonomies.map((taxonomy) => (
              <SelectItem key={taxonomy.id} value={taxonomy.id}>
                {taxonomy.code} - {taxonomy.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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

function ActiveToggle<TFormValues extends PortfolioScopedFormValues>({ form }: { form: UseFormReturn<TFormValues> }) {
  const activeField = "is_active" as FieldPath<TFormValues>;

  return (
    <div className="space-y-2">
      <Label>Status</Label>
      <Select
        value={String(form.watch(activeField))}
        onValueChange={(value) =>
          form.setValue(activeField, (value === "true") as TFormValues[FieldPath<TFormValues>], { shouldDirty: true })
        }
      >
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Ativo</SelectItem>
          <SelectItem value="false">Inativo</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function ReadonlyPromptBlock({
  title,
  description,
  value
}: {
  title: string;
  description: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <Textarea value={value} readOnly rows={18} className="mt-3 font-mono text-xs leading-5" />
    </div>
  );
}
