create table if not exists public."AA_author_external_searches" (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public."AA_offices"(id) on delete cascade,
  case_id uuid not null references public."AA_cases"(id) on delete cascade,
  party_id uuid not null references public."AA_case_parties"(id) on delete cascade,
  provider text not null check (provider in ('escavador')),
  cpf text not null,
  tribunal text not null,
  status text not null check (
    status in ('pending', 'completed', 'failed', 'not_found')
  ),
  provider_search_id text,
  provider_result_url text,
  request_payload jsonb not null default '{}'::jsonb,
  raw_response jsonb not null default '{}'::jsonb,
  error_message text,
  requested_by uuid references public."AA_profiles"(id) on delete set null,
  requested_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, party_id, provider, cpf, tribunal)
);

create table if not exists public."AA_author_external_processes" (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public."AA_offices"(id) on delete cascade,
  case_id uuid not null references public."AA_cases"(id) on delete cascade,
  party_id uuid not null references public."AA_case_parties"(id) on delete cascade,
  search_id uuid not null references public."AA_author_external_searches"(id) on delete cascade,
  provider text not null check (provider in ('escavador')),
  process_number text not null,
  tribunal text,
  role_hint text,
  subject_summary text,
  last_movement_at text,
  source_link text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aa_author_external_searches_case_id_idx
  on public."AA_author_external_searches"(case_id, requested_at desc);
create index if not exists aa_author_external_searches_party_id_idx
  on public."AA_author_external_searches"(party_id);
create index if not exists aa_author_external_searches_status_idx
  on public."AA_author_external_searches"(office_id, status);
create index if not exists aa_author_external_processes_case_id_idx
  on public."AA_author_external_processes"(case_id, created_at desc);
create index if not exists aa_author_external_processes_party_id_idx
  on public."AA_author_external_processes"(party_id);
create index if not exists aa_author_external_processes_search_id_idx
  on public."AA_author_external_processes"(search_id);
create unique index if not exists aa_author_external_processes_unique_search_process_idx
  on public."AA_author_external_processes"(search_id, process_number, coalesce(tribunal, ''));

drop trigger if exists aa_author_external_searches_set_updated_at on public."AA_author_external_searches";
create trigger aa_author_external_searches_set_updated_at
before update on public."AA_author_external_searches"
for each row execute function public.aa_set_updated_at();

drop trigger if exists aa_author_external_processes_set_updated_at on public."AA_author_external_processes";
create trigger aa_author_external_processes_set_updated_at
before update on public."AA_author_external_processes"
for each row execute function public.aa_set_updated_at();

create or replace function public.aa_author_external_search_office_id(search_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select office_id
  from public."AA_author_external_searches"
  where id = search_uuid
  limit 1
$$;
