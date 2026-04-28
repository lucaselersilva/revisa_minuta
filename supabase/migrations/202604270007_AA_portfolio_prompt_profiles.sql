create table if not exists public."AA_portfolio_prompt_profiles" (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public."AA_offices"(id) on delete cascade,
  portfolio_id uuid not null references public."AA_portfolios"(id) on delete cascade,
  taxonomy_id uuid references public."AA_taxonomies"(id) on delete cascade,
  analysis_type text not null check (analysis_type in ('pre_analysis', 'defense_conformity')),
  profile_name text not null,
  instruction_priority text,
  must_check_items text,
  forbidden_assumptions text,
  preferred_reasoning_style text,
  output_emphasis text,
  additional_instructions text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_id, taxonomy_id, analysis_type, profile_name)
);

create index if not exists aa_portfolio_prompt_profiles_lookup_idx
  on public."AA_portfolio_prompt_profiles"(portfolio_id, taxonomy_id, analysis_type, is_active);

drop trigger if exists aa_portfolio_prompt_profiles_set_updated_at on public."AA_portfolio_prompt_profiles";
create trigger aa_portfolio_prompt_profiles_set_updated_at
before update on public."AA_portfolio_prompt_profiles"
for each row execute function public.aa_set_updated_at();

alter table public."AA_portfolio_prompt_profiles" enable row level security;

drop policy if exists "AA_portfolio_prompt_profiles_select_same_office" on public."AA_portfolio_prompt_profiles";
create policy "AA_portfolio_prompt_profiles_select_same_office"
on public."AA_portfolio_prompt_profiles"
for select
to authenticated
using (office_id = public.aa_current_office_id());

drop policy if exists "AA_portfolio_prompt_profiles_admin_manage_same_office" on public."AA_portfolio_prompt_profiles";
create policy "AA_portfolio_prompt_profiles_admin_manage_same_office"
on public."AA_portfolio_prompt_profiles"
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

insert into public."AA_portfolio_prompt_profiles" (
  office_id,
  portfolio_id,
  taxonomy_id,
  analysis_type,
  profile_name,
  instruction_priority,
  must_check_items,
  forbidden_assumptions,
  preferred_reasoning_style,
  output_emphasis,
  additional_instructions,
  is_active
)
select
  portfolios.office_id,
  portfolios.id,
  null,
  seeded.analysis_type,
  seeded.profile_name,
  seeded.instruction_priority,
  seeded.must_check_items,
  seeded.forbidden_assumptions,
  seeded.preferred_reasoning_style,
  seeded.output_emphasis,
  seeded.additional_instructions,
  true
from public."AA_portfolios" as portfolios
join (
  values
    (
      'max-milhas',
      'pre_analysis',
      'Perfil inicial - Pre-analise',
      'Priorizar rastreabilidade da cadeia de compra, reserva, atendimento e eventual responsabilidade da intermediadora.',
      'Verificar localizador, reserva, voucher, comprovante de compra, comprovantes de pagamento, comunicacoes com plataforma e cronologia da falha alegada.',
      'Nao presumir responsabilidade solidaria automatica da intermediadora nem falha direta sem lastro documental do caso.',
      'Leitura comparativa entre narrativa, documentos do autor e cadeia operacional do servico.',
      'Fragilidades documentais, lacunas de nexo causal, divergencias entre fornecedor principal e intermediadora e suficiência minima dos pedidos.',
      'Se houver documento de turismo, diferenciar com clareza intermediadora, companhia, hotel, fornecedor final e canal de suporte.'
    ),
    (
      'max-milhas',
      'defense_conformity',
      'Perfil inicial - Conformidade da defesa',
      'Priorizar se a contestacao enfrenta legitimidade, cadeia de fornecimento, documentos do autor, danos alegados e fatos supervenientes.',
      'Verificar aderencia da contestacao ao modelo-base, enfrentamento dos pedidos, coerencia com cronologia e citacao dos documentos defensivos relevantes.',
      'Nao exigir tese padrao quando ela nao for pertinente ao caso concreto e nao tratar ausencia de retorica como falha material se o ponto estiver efetivamente rebatido.',
      'Confronto objetivo entre narrativa autoral, laudo previo e resposta defensiva.',
      'Pedidos nao enfrentados, rebuttal incompleto, fragilidade de lastro documental e coerencia argumentativa.',
      'Em turismo/intermediacao, conferir especialmente se a peca separa a atuacao da intermediadora da falha imputada ao fornecedor final.'
    ),
    (
      'banco-bmg',
      'pre_analysis',
      'Perfil inicial - Pre-analise',
      'Priorizar trilha de contratacao, liberacao ou uso do produto, identidade do contratante, descontos/extratos e coerencia entre contrato e narrativa autoral.',
      'Verificar contrato, aceite, gravacao, comprovantes de liberacao, extratos, historico de descontos, margem consignavel, documentos pessoais e comprovantes bancarios.',
      'Nao presumir fraude, contratacao inexistente ou regularidade da contratacao sem apoio documental suficiente.',
      'Leitura tecnico-documental focada em contratacao, vinculacao subjetiva e materialidade financeira.',
      'Correspondencia entre identidade, assinatura, conta, beneficio, descontos e documentos de suporte a liberacao ou uso.',
      'Quando houver produtos bancarios distintos, separar claramente consignado, cartao, saque complementar, refinanciamento e descontos indevidos.'
    ),
    (
      'banco-bmg',
      'defense_conformity',
      'Perfil inicial - Conformidade da defesa',
      'Priorizar se a contestacao demonstra cadeia documental da contratacao, liberacao/uso, legitimidade dos descontos e resposta aos pedidos indenizatorios.',
      'Verificar se a defesa enfrenta narrativa de nao contratacao, fraude, descontos indevidos, negativacao, dano moral e repeticao de indébito com documentos aderentes.',
      'Nao considerar a defesa suficiente apenas por citar tese abstrata se faltar vinculo com contrato, extrato, gravacao ou comprovante concreto do caso.',
      'Confronto documental entre narrativa bancaria do autor, laudo previo e contestacao apresentada.',
      'Pontos materiais nao rebatidos, ausencia de suporte contratual, fragilidade no nexo entre documentos bancarios e o autor e lacunas sobre cronologia de descontos.',
      'Em casos bancarios, a aderencia documental concreta vale mais do que fundamentacao abstrata desacompanhada de lastro.'
    )
) as seeded(
  slug,
  analysis_type,
  profile_name,
  instruction_priority,
  must_check_items,
  forbidden_assumptions,
  preferred_reasoning_style,
  output_emphasis,
  additional_instructions
)
  on seeded.slug = portfolios.slug
where not exists (
  select 1
  from public."AA_portfolio_prompt_profiles" as profiles
  where profiles.portfolio_id = portfolios.id
    and profiles.taxonomy_id is null
    and profiles.analysis_type = seeded.analysis_type
    and profiles.profile_name = seeded.profile_name
);
