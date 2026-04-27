import { getWorkflowStepMeta, workflowSteps } from "@/features/case-workflow/lib/workflow-steps";
import { createClient } from "@/lib/supabase/server";
import type { CaseStatus, WorkflowStepKey } from "@/types/database";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const ACTIVE_CASE_STATUSES: CaseStatus[] = ["draft", "in_progress", "review_pending"];
const TOKEN_INPUT_KEYS = ["input_tokens", "prompt_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"];
const TOKEN_OUTPUT_KEYS = ["output_tokens", "completion_tokens"];
const TOKEN_TOTAL_KEYS = ["total_tokens"];

type BasicCaseRow = {
  id: string;
  status: CaseStatus;
  created_at: string;
};

type WorkflowRow = {
  case_id: string;
  status: string;
  started_at: string | null;
};

type WorkflowStepRow = {
  case_id: string;
  step_key: WorkflowStepKey;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  metadata?: Record<string, unknown> | null;
};

type TaxonomyCaseRow = {
  id: string;
  created_at: string;
  taxonomy: {
    code: string;
    name: string;
  } | null;
};

type RecentCaseRow = {
  id: string;
  case_number: string | null;
  title: string | null;
  status: CaseStatus;
  created_at: string;
};

type CasePartyRow = {
  case_id: string;
  role: string;
  name: string;
};

type PreAnalysisReportRow = {
  id: string;
  generated_at: string | null;
  created_at: string;
  status: string;
  input_summary: Record<string, unknown>;
};

type DocumentIngestionRow = {
  id: string;
  created_at: string;
  processed_at: string | null;
  metadata: Record<string, unknown>;
};

type KpiMetric = {
  label: string;
  value: string;
  helper: string;
};

export type DashboardKpis = {
  metrics: KpiMetric[];
};

export type TaxonomyChartBucket = {
  label: string;
  value: number;
};

export type TaxonomyChartDataset = {
  periodDays: 7 | 30 | 90;
  total: number;
  items: TaxonomyChartBucket[];
};

export type WorkflowTimeDatum = {
  stepKey: WorkflowStepKey;
  label: string;
  averageHours: number;
  averageLabel: string;
  sampleSize: number;
};

export type TokenUsageBreakdownItem = {
  key: "extraction" | "classification" | "pre_analysis" | "conformity";
  label: string;
  total: number;
};

export type TokenUsagePoint = {
  date: string;
  label: string;
  total: number;
};

export type TokenUsageMetrics = {
  hasTelemetry: boolean;
  currentMonthTotal: number;
  previousMonthTotal: number;
  deltaPercentage: number | null;
  breakdown: TokenUsageBreakdownItem[];
  daily: TokenUsagePoint[];
};

export type RecentCaseItem = {
  id: string;
  caseNumber: string | null;
  author: string;
  currentStepLabel: string;
  createdAt: string;
  status: CaseStatus;
};

function subtractDays(baseDate: Date, days: number) {
  return new Date(baseDate.getTime() - days * DAY_IN_MS);
}

function startOfMonth(baseDate: Date) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
}

function startOfPreviousMonth(baseDate: Date) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1);
}

function endOfPreviousMonth(baseDate: Date) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), 0, 23, 59, 59, 999);
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(value);
}

function formatDurationFromHours(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) {
    return "Sem dados";
  }

  if (hours >= 48) {
    return `${formatPercent(hours / 24)} dias`;
  }

  return `${formatPercent(hours)} h`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function extractTokenSummaryFromNode(node: Record<string, unknown>) {
  const hasKnownKey = [...TOKEN_INPUT_KEYS, ...TOKEN_OUTPUT_KEYS, ...TOKEN_TOTAL_KEYS].some((key) => key in node);

  if (!hasKnownKey) {
    return null;
  }

  const input = TOKEN_INPUT_KEYS.reduce((sum, key) => sum + toNumber(node[key]), 0);
  const output = TOKEN_OUTPUT_KEYS.reduce((sum, key) => sum + toNumber(node[key]), 0);
  const explicitTotal = TOKEN_TOTAL_KEYS.reduce((sum, key) => sum + toNumber(node[key]), 0);
  const total = explicitTotal > 0 ? explicitTotal : input + output;

  if (total <= 0) {
    return null;
  }

  return { input, output, total };
}

function collectTokenSummaries(value: unknown): Array<{ input: number; output: number; total: number }> {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectTokenSummaries(item));
  }

  const record = asRecord(value);
  if (!record) {
    return [];
  }

  const ownSummary = extractTokenSummaryFromNode(record);
  if (ownSummary) {
    return [ownSummary];
  }

  return Object.values(record).flatMap((item) => collectTokenSummaries(item));
}

function sumTokenTelemetry(value: unknown) {
  return collectTokenSummaries(value).reduce(
    (accumulator, item) => ({
      input: accumulator.input + item.input,
      output: accumulator.output + item.output,
      total: accumulator.total + item.total
    }),
    { input: 0, output: 0, total: 0 }
  );
}

function getDefenseGeneratedAt(metadata: Record<string, unknown> | null | undefined) {
  const defenseReport = asRecord(metadata?.defense_conformity_report);
  return typeof defenseReport?.generated_at === "string" ? defenseReport.generated_at : null;
}

function getStepDurationHours(step: Pick<WorkflowStepRow, "started_at" | "completed_at">) {
  if (!step.started_at || !step.completed_at) {
    return null;
  }

  const startedAt = new Date(step.started_at).getTime();
  const completedAt = new Date(step.completed_at).getTime();
  const diff = completedAt - startedAt;

  if (!Number.isFinite(diff) || diff <= 0) {
    return null;
  }

  return diff / (60 * 60 * 1000);
}

function buildWorkflowTimeData(steps: WorkflowStepRow[]) {
  return workflowSteps.map((stepMeta) => {
    const completedSteps = steps.filter((step) => step.step_key === stepMeta.key);
    const durations = completedSteps
      .map((step) => getStepDurationHours(step))
      .filter((value): value is number => value !== null);

    const averageHours =
      durations.length > 0 ? durations.reduce((sum, item) => sum + item, 0) / durations.length : 0;

    return {
      stepKey: stepMeta.key,
      label: stepMeta.title,
      averageHours,
      averageLabel: formatDurationFromHours(averageHours),
      sampleSize: durations.length
    };
  });
}

function getMonthBucket(date: Date, currentMonthStart: Date, previousMonthStart: Date, previousMonthEnd: Date) {
  if (date >= currentMonthStart) {
    return "current";
  }

  if (date >= previousMonthStart && date <= previousMonthEnd) {
    return "previous";
  }

  return null;
}

/**
 * Aggregates the top KPI cards from cases, reports, workflows and workflow step transitions.
 * Active cases are inferred from non-final statuses, analyses sum pre-analysis plus defense reports in the last 30 days,
 * average workflow time uses completed step durations, and completion rate uses finished workflows over started workflows.
 */
export async function getDashboardKpis(): Promise<DashboardKpis> {
  const supabase = await createClient();
  const last30Days = subtractDays(new Date(), 30).toISOString();

  const [casesResult, workflowsResult, stepsResult, reportsResult, defenseStepsResult] = await Promise.all([
    supabase.from("AA_cases").select("id, status, created_at").returns<BasicCaseRow[]>(),
    supabase.from("AA_case_workflows").select("case_id, status, started_at").returns<WorkflowRow[]>(),
    supabase
      .from("AA_case_workflow_steps")
      .select("case_id, step_key, status, started_at, completed_at")
      .in("status", ["completed", "skipped"])
      .returns<WorkflowStepRow[]>(),
    supabase
      .from("AA_pre_analysis_reports")
      .select("id, generated_at, created_at, status")
      .eq("status", "completed")
      .gte("generated_at", last30Days)
      .returns<Array<Pick<PreAnalysisReportRow, "id" | "generated_at" | "created_at" | "status">>>(),
    supabase
      .from("AA_case_workflow_steps")
      .select("metadata")
      .eq("step_key", "defesa")
      .returns<Array<Pick<WorkflowStepRow, "metadata">>>()
  ]);

  const cases = casesResult.data ?? [];
  const workflows = workflowsResult.data ?? [];
  const steps = stepsResult.data ?? [];
  const reports = reportsResult.data ?? [];
  const defenseSteps = defenseStepsResult.data ?? [];
  const now = new Date();
  const last30DaysDate = subtractDays(now, 30);

  const activeCases = cases.filter((item) => ACTIVE_CASE_STATUSES.includes(item.status)).length;
  const analysesCompleted = reports.length +
    defenseSteps.filter((step) => {
      const generatedAt = getDefenseGeneratedAt(step.metadata);
      return generatedAt ? new Date(generatedAt) >= last30DaysDate : false;
    }).length;

  const workflowTimeData = buildWorkflowTimeData(steps);
  const allDurationValues = workflowTimeData
    .map((item) => item.averageHours)
    .filter((value) => Number.isFinite(value) && value > 0);
  const overallAverageHours =
    allDurationValues.length > 0
      ? allDurationValues.reduce((sum, value) => sum + value, 0) / allDurationValues.length
      : 0;

  const startedWorkflows = workflows.filter((item) => item.started_at).length;
  const completedWorkflows = workflows.filter((item) => item.status === "completed").length;
  const completionRate = startedWorkflows > 0 ? (completedWorkflows / startedWorkflows) * 100 : 0;

  return {
    metrics: [
      {
        label: "Casos ativos",
        value: formatNumber(activeCases),
        helper:
          activeCases > 0
            ? `${formatNumber(cases.length)} processos no escritorio`
            : "Nenhum processo ativo no momento"
      },
      {
        label: "Analises concluidas",
        value: formatNumber(analysesCompleted),
        helper:
          analysesCompleted > 0
            ? "Relatorios gerados nos ultimos 30 dias"
            : "Nenhum relatorio concluido nos ultimos 30 dias"
      },
      {
        label: "Tempo medio por etapa",
        value: formatDurationFromHours(overallAverageHours),
        helper:
          allDurationValues.length > 0
            ? "Media calculada a partir de etapas concluidas"
            : "Ainda nao ha transicoes suficientes no workflow"
      },
      {
        label: "Taxa de conclusao",
        value: startedWorkflows > 0 ? `${formatPercent(completionRate)}%` : "Sem dados",
        helper:
          startedWorkflows > 0
            ? `${formatNumber(completedWorkflows)} de ${formatNumber(startedWorkflows)} casos chegaram ao fim`
            : "Nenhum caso iniciou o workflow ainda"
      }
    ]
  };
}

/**
 * Groups cases by assigned taxonomy using the case creation date as the period anchor.
 * The 7, 30 and 90 day buckets are precomputed server-side so the client filter only swaps datasets.
 */
export async function getTaxonomyDatasets(): Promise<TaxonomyChartDataset[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("AA_cases")
    .select("id, created_at, taxonomy:AA_taxonomies(code, name)")
    .not("taxonomy_id", "is", null)
    .returns<TaxonomyCaseRow[]>();

  if (error || !data) {
    return [7, 30, 90].map((periodDays) => ({
      periodDays: periodDays as 7 | 30 | 90,
      total: 0,
      items: []
    }));
  }

  const now = new Date();
  const periods: Array<7 | 30 | 90> = [7, 30, 90];

  return periods.map((periodDays) => {
    const threshold = subtractDays(now, periodDays);
    const counts = new Map<string, number>();

    data.forEach((item) => {
      const createdAt = new Date(item.created_at);

      if (createdAt < threshold) {
        return;
      }

      const label = item.taxonomy ? `${item.taxonomy.code} - ${item.taxonomy.name}` : "Nao classificada";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });

    const items = Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label, "pt-BR"));

    return {
      periodDays,
      total: items.reduce((sum, item) => sum + item.value, 0),
      items
    };
  });
}

/**
 * Calculates the average residence time for each workflow step from started_at to completed_at.
 * Only completed or skipped steps with both timestamps are used so the average reflects real transitions.
 */
export async function getWorkflowTimeData(): Promise<WorkflowTimeDatum[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("AA_case_workflow_steps")
    .select("case_id, step_key, status, started_at, completed_at")
    .in("status", ["completed", "skipped"])
    .returns<WorkflowStepRow[]>();

  if (error || !data) {
    return workflowSteps.map((step) => ({
      stepKey: step.key,
      label: step.title,
      averageHours: 0,
      averageLabel: "Sem dados",
      sampleSize: 0
    }));
  }

  return buildWorkflowTimeData(data);
}

/**
 * Reads token telemetry from persisted metadata where available and aggregates month-over-month totals,
 * operation breakdown and a 30 day daily series. If no persisted token counters exist yet, the panel stays empty.
 */
export async function getTokenUsageMetrics(): Promise<TokenUsageMetrics> {
  const supabase = await createClient();
  const now = new Date();
  const last30Days = subtractDays(now, 29);
  const currentMonthStart = startOfMonth(now);
  const previousMonthStart = startOfPreviousMonth(now);
  const previousMonthEnd = endOfPreviousMonth(now);

  const [ingestionsResult, workflowStepsResult, reportsResult] = await Promise.all([
    supabase
      .from("AA_document_ingestions")
      .select("id, created_at, processed_at, metadata")
      .returns<DocumentIngestionRow[]>(),
    supabase
      .from("AA_case_workflow_steps")
      .select("step_key, created_at, metadata")
      .in("step_key", ["cadastro_inicial", "defesa"])
      .returns<Array<Pick<WorkflowStepRow, "step_key" | "metadata"> & { created_at?: string }>>(),
    supabase
      .from("AA_pre_analysis_reports")
      .select("id, generated_at, created_at, status, input_summary")
      .eq("status", "completed")
      .returns<PreAnalysisReportRow[]>()
  ]);

  const breakdownMap = new Map<TokenUsageBreakdownItem["key"], number>([
    ["extraction", 0],
    ["classification", 0],
    ["pre_analysis", 0],
    ["conformity", 0]
  ]);
  const dailyMap = new Map<string, number>();
  let currentMonthTotal = 0;
  let previousMonthTotal = 0;
  let hasTelemetry = false;

  for (let index = 0; index < 30; index += 1) {
    const date = subtractDays(now, 29 - index);
    dailyMap.set(formatDateKey(date), 0);
  }

  const addTelemetry = (operation: TokenUsageBreakdownItem["key"], timestamp: string | null, source: unknown) => {
    const totals = sumTokenTelemetry(source);

    if (totals.total <= 0 || !timestamp) {
      return;
    }

    hasTelemetry = true;
    breakdownMap.set(operation, (breakdownMap.get(operation) ?? 0) + totals.total);

    const eventDate = new Date(timestamp);
    const monthBucket = getMonthBucket(eventDate, currentMonthStart, previousMonthStart, previousMonthEnd);
    if (monthBucket === "current") {
      currentMonthTotal += totals.total;
    } else if (monthBucket === "previous") {
      previousMonthTotal += totals.total;
    }

    if (eventDate >= last30Days) {
      const key = formatDateKey(eventDate);
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + totals.total);
    }
  };

  (ingestionsResult.data ?? []).forEach((item) => {
    addTelemetry("extraction", item.processed_at ?? item.created_at, item.metadata);
  });

  (workflowStepsResult.data ?? []).forEach((item) => {
    if (item.step_key === "cadastro_inicial") {
      addTelemetry("classification", item.created_at ?? null, asRecord(item.metadata)?.ai_taxonomy_classification ?? null);
      return;
    }

    addTelemetry("conformity", getDefenseGeneratedAt(item.metadata), asRecord(item.metadata)?.defense_conformity_report ?? null);
  });

  (reportsResult.data ?? []).forEach((item) => {
    addTelemetry("pre_analysis", item.generated_at ?? item.created_at, item.input_summary);
  });

  const daily = Array.from(dailyMap.entries()).map(([date, total]) => ({
    date,
    label: formatShortDate(new Date(date)),
    total
  }));

  const deltaPercentage =
    previousMonthTotal > 0 ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 : null;

  return {
    hasTelemetry,
    currentMonthTotal,
    previousMonthTotal,
    deltaPercentage,
    breakdown: [
      { key: "extraction", label: "Extracao", total: breakdownMap.get("extraction") ?? 0 },
      { key: "classification", label: "Classificacao", total: breakdownMap.get("classification") ?? 0 },
      { key: "pre_analysis", label: "Pre-analise", total: breakdownMap.get("pre_analysis") ?? 0 },
      { key: "conformity", label: "Conformidade", total: breakdownMap.get("conformity") ?? 0 }
    ],
    daily
  };
}

/**
 * Builds the recent cases table from the latest cases plus their current workflow step and first author.
 * Case parties are filtered by author role and workflow labels come from the shared 7 step definition.
 */
export async function getRecentCases(): Promise<RecentCaseItem[]> {
  const supabase = await createClient();
  const casesResult = await supabase
    .from("AA_cases")
    .select("id, case_number, title, status, created_at")
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<RecentCaseRow[]>();

  const cases = casesResult.data ?? [];
  if (cases.length === 0) {
    return [];
  }

  const caseIds = cases.map((item) => item.id);
  const [workflowsResult, partiesResult] = await Promise.all([
    supabase
      .from("AA_case_workflows")
      .select("case_id, current_step")
      .in("case_id", caseIds)
      .returns<Array<{ case_id: string; current_step: WorkflowStepKey }>>(),
    supabase
      .from("AA_case_parties")
      .select("case_id, role, name, created_at")
      .eq("role", "author")
      .in("case_id", caseIds)
      .order("created_at", { ascending: true })
      .returns<Array<CasePartyRow & { created_at: string }>>()
  ]);

  const workflowMap = new Map((workflowsResult.data ?? []).map((item) => [item.case_id, item.current_step]));
  const authorMap = new Map<string, string>();

  (partiesResult.data ?? []).forEach((party) => {
    if (!authorMap.has(party.case_id)) {
      authorMap.set(party.case_id, party.name);
    }
  });

  return cases.map((item) => {
    const currentStepKey = workflowMap.get(item.id) ?? "cadastro_inicial";
    return {
      id: item.id,
      caseNumber: item.case_number,
      author: authorMap.get(item.id) ?? item.title ?? "Autor nao informado",
      currentStepLabel: getWorkflowStepMeta(currentStepKey).title,
      createdAt: item.created_at,
      status: item.status
    };
  });
}
