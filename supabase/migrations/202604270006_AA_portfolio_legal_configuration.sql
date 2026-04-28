create table if not exists public."AA_portfolio_document_requirements" (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public."AA_offices"(id) on delete cascade,
  portfolio_id uuid not null references public."AA_portfolios"(id) on delete cascade,
  taxonomy_id uuid references public."AA_taxonomies"(id) on delete cascade,
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
  document_type text not null check (
    document_type in (
      'initial_petition',
      'author_documents',
      'author_identity_document',
      'author_address_proof',
      'author_payment_proof',
      'author_screen_capture',
      'initial_amendment',
      'initial_amendment_documents',
      'defense',
      'defense_documents',
      'other'
    )
  ),
  requirement_label text not null,
  requirement_details text,
  is_required boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public."AA_portfolio_legal_theses" (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public."AA_offices"(id) on delete cascade,
  portfolio_id uuid not null references public."AA_portfolios"(id) on delete cascade,
  taxonomy_id uuid references public."AA_taxonomies"(id) on delete cascade,
  title text not null,
  summary text not null,
  legal_basis text,
  applicability_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public."AA_portfolio_case_templates" (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public."AA_offices"(id) on delete cascade,
  portfolio_id uuid not null references public."AA_portfolios"(id) on delete cascade,
  taxonomy_id uuid not null references public."AA_taxonomies"(id) on delete cascade,
  title text not null,
  template_markdown text not null,
  usage_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_id, taxonomy_id, title)
);

create index if not exists aa_portfolio_document_requirements_lookup_idx on public."AA_portfolio_document_requirements"(portfolio_id, taxonomy_id, step_key, is_active);
create index if not exists aa_portfolio_legal_theses_lookup_idx on public."AA_portfolio_legal_theses"(portfolio_id, taxonomy_id, is_active);
create index if not exists aa_portfolio_case_templates_lookup_idx on public."AA_portfolio_case_templates"(portfolio_id, taxonomy_id, is_active);

drop trigger if exists aa_portfolio_document_requirements_set_updated_at on public."AA_portfolio_document_requirements";
create trigger aa_portfolio_document_requirements_set_updated_at
before update on public."AA_portfolio_document_requirements"
for each row execute function public.aa_set_updated_at();

drop trigger if exists aa_portfolio_legal_theses_set_updated_at on public."AA_portfolio_legal_theses";
create trigger aa_portfolio_legal_theses_set_updated_at
before update on public."AA_portfolio_legal_theses"
for each row execute function public.aa_set_updated_at();

drop trigger if exists aa_portfolio_case_templates_set_updated_at on public."AA_portfolio_case_templates";
create trigger aa_portfolio_case_templates_set_updated_at
before update on public."AA_portfolio_case_templates"
for each row execute function public.aa_set_updated_at();

create or replace function public.aa_taxonomy_portfolio_id(taxonomy_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select portfolio_id
  from public."AA_taxonomies"
  where id = taxonomy_uuid
  limit 1
$$;

alter table public."AA_portfolio_document_requirements" enable row level security;
alter table public."AA_portfolio_legal_theses" enable row level security;
alter table public."AA_portfolio_case_templates" enable row level security;

drop policy if exists "AA_portfolio_document_requirements_select_same_office" on public."AA_portfolio_document_requirements";
create policy "AA_portfolio_document_requirements_select_same_office"
on public."AA_portfolio_document_requirements"
for select
to authenticated
using (office_id = public.aa_current_office_id());

drop policy if exists "AA_portfolio_document_requirements_admin_manage_same_office" on public."AA_portfolio_document_requirements";
create policy "AA_portfolio_document_requirements_admin_manage_same_office"
on public."AA_portfolio_document_requirements"
for all
to authenticated
using (public.aa_is_admin() and office_id = public.aa_current_office_id())
with check (
  public.aa_is_admin()
  and office_id = public.aa_current_office_id()
  and public.aa_portfolio_office_id(portfolio_id) = public.aa_current_office_id()
  and (
    taxonomy_id is null
    or public.aa_taxonomy_portfolio_id(taxonomy_id) = portfolio_id
  )
);

drop policy if exists "AA_portfolio_legal_theses_select_same_office" on public."AA_portfolio_legal_theses";
create policy "AA_portfolio_legal_theses_select_same_office"
on public."AA_portfolio_legal_theses"
for select
to authenticated
using (office_id = public.aa_current_office_id());

drop policy if exists "AA_portfolio_legal_theses_admin_manage_same_office" on public."AA_portfolio_legal_theses";
create policy "AA_portfolio_legal_theses_admin_manage_same_office"
on public."AA_portfolio_legal_theses"
for all
to authenticated
using (public.aa_is_admin() and office_id = public.aa_current_office_id())
with check (
  public.aa_is_admin()
  and office_id = public.aa_current_office_id()
  and public.aa_portfolio_office_id(portfolio_id) = public.aa_current_office_id()
  and (
    taxonomy_id is null
    or public.aa_taxonomy_portfolio_id(taxonomy_id) = portfolio_id
  )
);

drop policy if exists "AA_portfolio_case_templates_select_same_office" on public."AA_portfolio_case_templates";
create policy "AA_portfolio_case_templates_select_same_office"
on public."AA_portfolio_case_templates"
for select
to authenticated
using (office_id = public.aa_current_office_id());

drop policy if exists "AA_portfolio_case_templates_admin_manage_same_office" on public."AA_portfolio_case_templates";
create policy "AA_portfolio_case_templates_admin_manage_same_office"
on public."AA_portfolio_case_templates"
for all
to authenticated
using (public.aa_is_admin() and office_id = public.aa_current_office_id())
with check (
  public.aa_is_admin()
  and office_id = public.aa_current_office_id()
  and public.aa_portfolio_office_id(portfolio_id) = public.aa_current_office_id()
  and public.aa_taxonomy_portfolio_id(taxonomy_id) = portfolio_id
);

insert into public."AA_portfolio_document_requirements" (
  office_id,
  portfolio_id,
  taxonomy_id,
  step_key,
  document_type,
  requirement_label,
  requirement_details,
  is_required,
  is_active
)
select
  portfolios.office_id,
  portfolios.id,
  null,
  seeded.step_key,
  seeded.document_type,
  seeded.requirement_label,
  seeded.requirement_details,
  true,
  true
from public."AA_portfolios" as portfolios
join (
  values
    ('max-milhas', 'documentos_autor', 'initial_petition', 'Peticao inicial obrigatoria', 'A peticao inicial e o documento base para leitura do caso e classificacao.'),
    ('max-milhas', 'defesa', 'defense', 'Contestacao obrigatoria', 'A etapa de defesa exige a contestacao principal anexada.'),
    ('banco-bmg', 'documentos_autor', 'initial_petition', 'Peticao inicial obrigatoria', 'A peticao inicial e o documento base para leitura do caso e enquadramento bancario.'),
    ('banco-bmg', 'defesa', 'defense', 'Contestacao obrigatoria', 'A etapa de defesa exige a contestacao principal anexada.')
) as seeded(slug, step_key, document_type, requirement_label, requirement_details)
  on seeded.slug = portfolios.slug
where not exists (
  select 1
  from public."AA_portfolio_document_requirements" as requirements
  where requirements.portfolio_id = portfolios.id
    and requirements.taxonomy_id is null
    and requirements.step_key = seeded.step_key
    and requirements.document_type = seeded.document_type
);

insert into public."AA_portfolio_legal_theses" (
  office_id,
  portfolio_id,
  taxonomy_id,
  title,
  summary,
  legal_basis,
  applicability_notes,
  is_active
)
select
  portfolios.office_id,
  portfolios.id,
  null,
  seeded.title,
  seeded.summary,
  seeded.legal_basis,
  seeded.applicability_notes,
  true
from public."AA_portfolios" as portfolios
join (
  values
    (
      'max-milhas',
      'Intermediacao sem responsabilidade solidaria automatica',
      'A defesa deve avaliar a ilegitimidade passiva e a ausencia de responsabilidade solidaria da intermediadora quando a falha principal estiver ligada à companhia aérea ou terceiro.',
      'STJ, AgInt nos EDcl no REsp 2066248/SP; art. 14, §3º, CDC.',
      'Aplicar com cautela, observando documentos de emissao, timeline e eventual participacao direta da carteira na falha.'
    ),
    (
      'banco-bmg',
      'Regularidade da contratacao e trilha documental',
      'A defesa deve demonstrar cadeia documental da contratação, liberação, aceite ou uso do produto quando a narrativa autoral negar vínculo.',
      'CDC, CPC, regulamentação bancária aplicável e instrumentos contratuais do produto.',
      'Conferir coerência entre contrato, comprovantes, extratos, gravações e eventual margem consignável.'
    )
) as seeded(slug, title, summary, legal_basis, applicability_notes)
  on seeded.slug = portfolios.slug
where not exists (
  select 1
  from public."AA_portfolio_legal_theses" as theses
  where theses.portfolio_id = portfolios.id
    and theses.taxonomy_id is null
    and theses.title = seeded.title
);

insert into public."AA_portfolio_case_templates" (
  office_id,
  portfolio_id,
  taxonomy_id,
  title,
  template_markdown,
  usage_notes,
  is_active
)
select
  taxonomies.office_id,
  taxonomies.portfolio_id,
  taxonomies.id,
  concat('Modelo base - ', taxonomies.code),
  concat(
    '# Contestacao base - ', taxonomies.code, E'\n\n',
    '## 1. Sintese objetiva dos fatos\n',
    '- Reconstituir a cronologia com base apenas nos documentos do processo.\n\n',
    '## 2. Pontos relevantes da defesa\n',
    '- Elencar os pontos centrais que devem ser enfrentados logo na abertura da peça.\n\n',
    '## 3. Preliminares e admissibilidade\n',
    '- Avaliar legitimidade, interesse processual, regularidade das partes e questões de competência quando pertinentes.\n\n',
    '## 4. Merito\n',
    '- Organizar a resposta aos pedidos com aderência ao tipo de caso e aos documentos anexados.\n\n',
    '## 5. Pedidos\n',
    '- Fechar a peça com pedidos coerentes com a linha defensiva validada para a carteira.'
  ),
  'Modelo base inicial para calibracao da carteira. Deve ser refinado juridicamente pelo administrador.',
  true
from public."AA_taxonomies" as taxonomies
join public."AA_portfolios" as portfolios on portfolios.id = taxonomies.portfolio_id
where portfolios.slug in ('max-milhas', 'banco-bmg')
  and not exists (
    select 1
    from public."AA_portfolio_case_templates" as templates
    where templates.portfolio_id = taxonomies.portfolio_id
      and templates.taxonomy_id = taxonomies.id
      and templates.title = concat('Modelo base - ', taxonomies.code)
  );
