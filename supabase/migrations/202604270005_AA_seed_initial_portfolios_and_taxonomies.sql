update public."AA_portfolios"
set
  name = 'Max Milhas',
  slug = 'max-milhas',
  description = 'Carteira inicial do projeto, dedicada aos casos de intermediação de passagens e serviços correlatos.',
  segment = 'turismo',
  is_active = true
where slug = 'principal';

insert into public."AA_portfolios" (office_id, name, slug, description, segment, is_active)
select
  offices.id,
  'Max Milhas',
  'max-milhas',
  'Carteira inicial do projeto, dedicada aos casos de intermediação de passagens e serviços correlatos.',
  'turismo',
  true
from public."AA_offices" as offices
where not exists (
  select 1
  from public."AA_portfolios" as portfolios
  where portfolios.office_id = offices.id
    and portfolios.slug = 'max-milhas'
);

insert into public."AA_portfolios" (office_id, name, slug, description, segment, is_active)
select
  offices.id,
  'Banco BMG',
  'banco-bmg',
  'Carteira inicial para casos bancários, com foco em contratação contestada, descontos e fraude.',
  'bancario',
  true
from public."AA_offices" as offices
where not exists (
  select 1
  from public."AA_portfolios" as portfolios
  where portfolios.office_id = offices.id
    and portfolios.slug = 'banco-bmg'
);

update public."AA_cases" as cases
set portfolio_id = portfolios.id
from public."AA_portfolios" as portfolios
where portfolios.office_id = cases.office_id
  and portfolios.slug = 'max-milhas';

update public."AA_case_entities" as entities
set portfolio_id = portfolios.id
from public."AA_portfolios" as portfolios
where portfolios.office_id = entities.office_id
  and portfolios.slug = 'max-milhas';

update public."AA_taxonomies" as taxonomies
set portfolio_id = portfolios.id
from public."AA_portfolios" as portfolios
where portfolios.office_id = taxonomies.office_id
  and portfolios.slug = 'max-milhas';

update public."AA_workflow_rules" as rules
set portfolio_id = portfolios.id
from public."AA_portfolios" as portfolios
where portfolios.office_id = rules.office_id
  and portfolios.slug = 'max-milhas';

insert into public."AA_workflow_rules" (office_id, portfolio_id, step_key, rule_key, rule_label)
select portfolios.office_id, portfolios.id, defaults.step_key, defaults.rule_key, defaults.rule_label
from public."AA_portfolios" as portfolios
cross join (
  values
    ('cadastro_inicial', 'case_basic_data_required', 'Dados basicos, carteira, taxonomia, responsavel, partes e empresa representada'),
    ('documentos_autor', 'initial_petition_required', 'Peticao inicial anexada'),
    ('defesa', 'defense_document_required', 'Contestacao anexada')
) as defaults(step_key, rule_key, rule_label)
where portfolios.slug in ('max-milhas', 'banco-bmg')
on conflict (portfolio_id, step_key, rule_key) do update
set rule_label = excluded.rule_label,
    is_active = true,
    updated_at = now();

insert into public."AA_taxonomies" (office_id, portfolio_id, code, name, description, is_active)
select
  portfolios.office_id,
  portfolios.id,
  seeded.code,
  seeded.name,
  seeded.description,
  true
from public."AA_portfolios" as portfolios
join (
  values
    ('max-milhas', 'A1', 'Ausencia de reembolso apos cancelamento pela re', 'Caso frequente de cancelamento unilateral com ausencia de devolucao ao consumidor.'),
    ('max-milhas', 'A2', 'Demora excessiva no reembolso', 'Reembolso reconhecido em tese, mas com prazo excessivo ou sem comprovacao operacional suficiente.'),
    ('max-milhas', 'B1', 'Cancelamento com impacto direto na viagem', 'Cancelamento que obrigou a parte autora a alterar o modo de deslocamento ou recomprar o trajeto.'),
    ('max-milhas', 'C1', 'Alteracao unilateral do voo ou embarque impedido', 'Mudanca operacional atribuida a companhia aérea ou à emissão que inviabilizou o embarque.'),
    ('max-milhas', 'D4', 'Direito de arrependimento com cobranca indevida', 'Pedido ancorado no art. 49 do CDC, com discussão sobre prazo e estorno.'),
    ('max-milhas', 'E1', 'Erro na emissao ou dados do passageiro', 'Falha de emissao, grafia ou inconsistência em nome e dados da passagem.'),
    ('banco-bmg', 'BMG1', 'Contratacao contestada de emprestimo consignado', 'Autor nega a contratação ou questiona a regularidade do instrumento de crédito consignado.'),
    ('banco-bmg', 'BMG2', 'Descontos indevidos em beneficio ou conta', 'Discussão sobre descontos recorrentes sem lastro contratual suficiente ou sem clareza operacional.'),
    ('banco-bmg', 'BMG3', 'Fraude ou operacao nao reconhecida', 'Alegação de fraude, desvio de identidade ou liberação de crédito para terceiro.'),
    ('banco-bmg', 'BMG4', 'Cartao consignado ou RMC contestado', 'Controvérsia sobre reserva de margem consignável, saque, cartão e dever de informação.')
) as seeded(slug, code, name, description) on seeded.slug = portfolios.slug
on conflict (portfolio_id, code) do update
set name = excluded.name,
    description = excluded.description,
    is_active = true,
    updated_at = now();
