create table if not exists public."AA_document_ingestions" (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public."AA_offices"(id) on delete cascade,
  case_document_id uuid not null references public."AA_case_documents"(id) on delete cascade,
  status text not null check (
    status in ('pending', 'processing', 'processed', 'failed', 'unsupported', 'empty_text')
  ),
  parser_type text,
  extracted_text text,
  extracted_text_length integer,
  detected_language text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_document_id)
);

create table if not exists public."AA_pre_analysis_reports" (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public."AA_offices"(id) on delete cascade,
  case_id uuid not null references public."AA_cases"(id) on delete cascade,
  version integer not null,
  status text not null check (
    status in ('draft', 'completed', 'failed')
  ),
  model_provider text not null default 'anthropic',
  model_name text,
  input_summary jsonb not null default '{}'::jsonb,
  prompt_version text,
  report_json jsonb,
  report_markdown text,
  generated_by uuid references public."AA_profiles"(id) on delete set null,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, version)
);

create table if not exists public."AA_pre_analysis_acknowledgements" (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public."AA_offices"(id) on delete cascade,
  case_id uuid not null references public."AA_cases"(id) on delete cascade,
  report_id uuid not null references public."AA_pre_analysis_reports"(id) on delete cascade,
  acknowledged_by uuid not null references public."AA_profiles"(id) on delete cascade,
  acknowledged_at timestamptz not null default now()
);

create index if not exists aa_document_ingestions_office_id_idx on public."AA_document_ingestions"(office_id);
create index if not exists aa_document_ingestions_case_document_id_idx on public."AA_document_ingestions"(case_document_id);
create index if not exists aa_document_ingestions_status_idx on public."AA_document_ingestions"(office_id, status);
create index if not exists aa_pre_analysis_reports_case_id_idx on public."AA_pre_analysis_reports"(case_id, version desc);
create index if not exists aa_pre_analysis_reports_office_id_idx on public."AA_pre_analysis_reports"(office_id);
create index if not exists aa_pre_analysis_ack_case_id_idx on public."AA_pre_analysis_acknowledgements"(case_id, acknowledged_at desc);
create index if not exists aa_pre_analysis_ack_report_id_idx on public."AA_pre_analysis_acknowledgements"(report_id);

drop trigger if exists aa_document_ingestions_set_updated_at on public."AA_document_ingestions";
create trigger aa_document_ingestions_set_updated_at
before update on public."AA_document_ingestions"
for each row execute function public.aa_set_updated_at();

drop trigger if exists aa_pre_analysis_reports_set_updated_at on public."AA_pre_analysis_reports";
create trigger aa_pre_analysis_reports_set_updated_at
before update on public."AA_pre_analysis_reports"
for each row execute function public.aa_set_updated_at();

create or replace function public.aa_case_document_office_id(case_document_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cases.office_id
  from public."AA_case_documents" documents
  join public."AA_cases" cases on cases.id = documents.case_id
  where documents.id = case_document_uuid
  limit 1
$$;

create or replace function public.aa_pre_analysis_report_office_id(report_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select office_id
  from public."AA_pre_analysis_reports"
  where id = report_uuid
  limit 1
$$;
