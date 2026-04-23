create table if not exists public."AA_case_workflows" (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public."AA_cases"(id) on delete cascade,
  current_step text not null check (
    current_step in (
      'cadastro_inicial',
      'documentos_autor',
      'emenda_inicial',
      'pre_analise',
      'defesa',
      'revisao_final',
      'relatorio'
    )
  ),
  status text not null default 'not_started' check (
    status in ('not_started', 'in_progress', 'blocked', 'completed')
  ),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id)
);

create table if not exists public."AA_case_workflow_steps" (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public."AA_cases"(id) on delete cascade,
  step_key text not null check (
    step_key in (
      'cadastro_inicial',
      'documentos_autor',
      'emenda_inicial',
      'pre_analise',
      'defesa',
      'revisao_final',
      'relatorio'
    )
  ),
  step_order integer not null,
  status text not null check (
    status in ('locked', 'available', 'in_progress', 'completed', 'skipped')
  ),
  is_required boolean not null default true,
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, step_key)
);

create table if not exists public."AA_workflow_rules" (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public."AA_offices"(id) on delete cascade,
  step_key text not null,
  rule_key text not null,
  rule_label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (office_id, step_key, rule_key)
);

create index if not exists aa_case_workflows_case_id_idx on public."AA_case_workflows"(case_id);
create index if not exists aa_case_workflows_status_idx on public."AA_case_workflows"(status);
create index if not exists aa_case_workflow_steps_case_id_idx on public."AA_case_workflow_steps"(case_id, step_order);
create index if not exists aa_case_workflow_steps_status_idx on public."AA_case_workflow_steps"(case_id, status);
create index if not exists aa_workflow_rules_office_id_idx on public."AA_workflow_rules"(office_id, step_key, is_active);

drop trigger if exists aa_case_workflows_set_updated_at on public."AA_case_workflows";
create trigger aa_case_workflows_set_updated_at
before update on public."AA_case_workflows"
for each row execute function public.aa_set_updated_at();

drop trigger if exists aa_case_workflow_steps_set_updated_at on public."AA_case_workflow_steps";
create trigger aa_case_workflow_steps_set_updated_at
before update on public."AA_case_workflow_steps"
for each row execute function public.aa_set_updated_at();

drop trigger if exists aa_workflow_rules_set_updated_at on public."AA_workflow_rules";
create trigger aa_workflow_rules_set_updated_at
before update on public."AA_workflow_rules"
for each row execute function public.aa_set_updated_at();

insert into public."AA_workflow_rules" (office_id, step_key, rule_key, rule_label)
select id, step_key, rule_key, rule_label
from public."AA_offices"
cross join (
  values
    ('cadastro_inicial', 'case_basic_data_required', 'Dados basicos, taxonomia, responsavel, partes e empresa representada'),
    ('documentos_autor', 'initial_petition_required', 'Peticao inicial ou documentos do autor anexados'),
    ('documentos_autor', 'author_documents_required', 'Documentos do autor anexados quando aplicavel'),
    ('defesa', 'defense_document_required', 'Contestacao anexada')
) as defaults(step_key, rule_key, rule_label)
on conflict (office_id, step_key, rule_key) do nothing;

insert into public."AA_case_workflows" (case_id, current_step, status, started_at)
select id, 'cadastro_inicial', 'in_progress', now()
from public."AA_cases"
on conflict (case_id) do nothing;

insert into public."AA_case_workflow_steps" (case_id, step_key, step_order, status, is_required, started_at)
select
  cases.id,
  defaults.step_key,
  defaults.step_order,
  case when defaults.step_key = 'cadastro_inicial' then 'available' else 'locked' end,
  defaults.is_required,
  case when defaults.step_key = 'cadastro_inicial' then now() else null end
from public."AA_cases" as cases
cross join (
  values
    ('cadastro_inicial', 1, true),
    ('documentos_autor', 2, true),
    ('emenda_inicial', 3, false),
    ('pre_analise', 4, true),
    ('defesa', 5, true),
    ('revisao_final', 6, true),
    ('relatorio', 7, true)
) as defaults(step_key, step_order, is_required)
on conflict (case_id, step_key) do nothing;
