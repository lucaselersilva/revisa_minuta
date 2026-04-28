create table if not exists public."AA_portfolios" (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public."AA_offices"(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  segment text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (office_id, slug),
  unique (office_id, name)
);

create index if not exists aa_portfolios_office_id_idx on public."AA_portfolios"(office_id);
create index if not exists aa_portfolios_active_idx on public."AA_portfolios"(office_id, is_active);

drop trigger if exists aa_portfolios_set_updated_at on public."AA_portfolios";
create trigger aa_portfolios_set_updated_at
before update on public."AA_portfolios"
for each row execute function public.aa_set_updated_at();

insert into public."AA_portfolios" (office_id, name, slug, description, segment)
select
  offices.id,
  'Carteira principal',
  'principal',
  'Carteira inicial criada automaticamente para compatibilidade com a estrutura multi-carteira.',
  null
from public."AA_offices" as offices
where not exists (
  select 1
  from public."AA_portfolios" as portfolios
  where portfolios.office_id = offices.id
);

alter table public."AA_cases"
add column if not exists portfolio_id uuid references public."AA_portfolios"(id) on delete restrict;

alter table public."AA_case_entities"
add column if not exists portfolio_id uuid references public."AA_portfolios"(id) on delete restrict;

alter table public."AA_taxonomies"
add column if not exists portfolio_id uuid references public."AA_portfolios"(id) on delete cascade;

alter table public."AA_workflow_rules"
add column if not exists portfolio_id uuid references public."AA_portfolios"(id) on delete cascade;

update public."AA_case_entities" as entities
set portfolio_id = portfolios.id
from public."AA_portfolios" as portfolios
where entities.portfolio_id is null
  and portfolios.office_id = entities.office_id
  and portfolios.slug = 'principal';

update public."AA_taxonomies" as taxonomies
set portfolio_id = portfolios.id
from public."AA_portfolios" as portfolios
where taxonomies.portfolio_id is null
  and portfolios.office_id = taxonomies.office_id
  and portfolios.slug = 'principal';

update public."AA_workflow_rules" as rules
set portfolio_id = portfolios.id
from public."AA_portfolios" as portfolios
where rules.portfolio_id is null
  and portfolios.office_id = rules.office_id
  and portfolios.slug = 'principal';

update public."AA_cases" as cases
set portfolio_id = coalesce(
  (
    select entities.portfolio_id
    from public."AA_case_entity_links" as links
    join public."AA_case_entities" as entities on entities.id = links.entity_id
    where links.case_id = cases.id
    order by links.id
    limit 1
  ),
  (
    select portfolios.id
    from public."AA_portfolios" as portfolios
    where portfolios.office_id = cases.office_id
    order by portfolios.created_at
    limit 1
  )
)
where cases.portfolio_id is null;

alter table public."AA_cases"
alter column portfolio_id set not null;

alter table public."AA_case_entities"
alter column portfolio_id set not null;

alter table public."AA_taxonomies"
alter column portfolio_id set not null;

alter table public."AA_workflow_rules"
alter column portfolio_id set not null;

alter table public."AA_cases"
drop constraint if exists "AA_cases_portfolio_id_fkey";

alter table public."AA_cases"
add constraint "AA_cases_portfolio_id_fkey"
foreign key (portfolio_id) references public."AA_portfolios"(id) on delete restrict;

alter table public."AA_case_entities"
drop constraint if exists "AA_case_entities_portfolio_id_fkey";

alter table public."AA_case_entities"
add constraint "AA_case_entities_portfolio_id_fkey"
foreign key (portfolio_id) references public."AA_portfolios"(id) on delete restrict;

alter table public."AA_taxonomies"
drop constraint if exists "AA_taxonomies_office_id_code_key";

alter table public."AA_taxonomies"
add constraint "AA_taxonomies_portfolio_id_code_key" unique (portfolio_id, code);

alter table public."AA_workflow_rules"
drop constraint if exists "AA_workflow_rules_office_id_step_key_rule_key_key";

alter table public."AA_workflow_rules"
add constraint "AA_workflow_rules_portfolio_id_step_key_rule_key_key" unique (portfolio_id, step_key, rule_key);

create index if not exists aa_cases_portfolio_id_idx on public."AA_cases"(portfolio_id);
create index if not exists aa_case_entities_portfolio_id_idx on public."AA_case_entities"(portfolio_id);
create index if not exists aa_taxonomies_portfolio_id_idx on public."AA_taxonomies"(portfolio_id, is_active);
create index if not exists aa_workflow_rules_portfolio_id_idx on public."AA_workflow_rules"(portfolio_id, step_key, is_active);

create or replace function public.aa_portfolio_office_id(portfolio_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select office_id
  from public."AA_portfolios"
  where id = portfolio_uuid
  limit 1
$$;

create or replace function public.aa_case_portfolio_id(case_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select portfolio_id
  from public."AA_cases"
  where id = case_uuid
  limit 1
$$;
