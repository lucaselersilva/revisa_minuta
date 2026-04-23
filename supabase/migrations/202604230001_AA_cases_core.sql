create table if not exists public."AA_cases" (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public."AA_offices"(id) on delete cascade,
  case_number text,
  title text,
  description text,
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'review_pending', 'completed')),
  taxonomy_id uuid references public."AA_taxonomies"(id) on delete set null,
  responsible_lawyer_id uuid references public."AA_profiles"(id) on delete set null,
  created_by uuid references public."AA_profiles"(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public."AA_case_parties" (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public."AA_cases"(id) on delete cascade,
  role text not null check (role in ('author', 'defendant', 'third_party')),
  name text not null,
  document text,
  created_at timestamptz not null default now()
);

create table if not exists public."AA_case_entities" (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public."AA_offices"(id) on delete cascade,
  name text not null,
  document text,
  created_at timestamptz not null default now()
);

create table if not exists public."AA_case_entity_links" (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public."AA_cases"(id) on delete cascade,
  entity_id uuid not null references public."AA_case_entities"(id) on delete cascade,
  unique (case_id, entity_id)
);

create table if not exists public."AA_case_documents" (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public."AA_cases"(id) on delete cascade,
  uploaded_by uuid references public."AA_profiles"(id) on delete set null,
  document_type text not null check (
    document_type in (
      'initial_petition',
      'author_documents',
      'initial_amendment',
      'defense',
      'defense_documents',
      'other'
    )
  ),
  file_path text not null,
  file_name text,
  file_size integer,
  mime_type text,
  stage text not null check (
    stage in (
      'initial',
      'pre_analysis',
      'defense',
      'final_review'
    )
  ),
  created_at timestamptz not null default now()
);

create table if not exists public."AA_case_history" (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public."AA_cases"(id) on delete cascade,
  action text not null,
  performed_by uuid references public."AA_profiles"(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists aa_cases_office_id_idx on public."AA_cases"(office_id);
create index if not exists aa_cases_status_idx on public."AA_cases"(office_id, status);
create index if not exists aa_cases_taxonomy_id_idx on public."AA_cases"(taxonomy_id);
create index if not exists aa_cases_responsible_lawyer_id_idx on public."AA_cases"(responsible_lawyer_id);
create index if not exists aa_case_parties_case_id_idx on public."AA_case_parties"(case_id);
create index if not exists aa_case_entities_office_id_idx on public."AA_case_entities"(office_id);
create index if not exists aa_case_entity_links_case_id_idx on public."AA_case_entity_links"(case_id);
create index if not exists aa_case_entity_links_entity_id_idx on public."AA_case_entity_links"(entity_id);
create index if not exists aa_case_documents_case_id_idx on public."AA_case_documents"(case_id);
create index if not exists aa_case_documents_stage_idx on public."AA_case_documents"(case_id, stage);
create index if not exists aa_case_history_case_id_idx on public."AA_case_history"(case_id, created_at desc);

drop trigger if exists aa_cases_set_updated_at on public."AA_cases";
create trigger aa_cases_set_updated_at
before update on public."AA_cases"
for each row execute function public.aa_set_updated_at();

create or replace function public.aa_case_office_id(case_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select office_id
  from public."AA_cases"
  where id = case_uuid
  limit 1
$$;
