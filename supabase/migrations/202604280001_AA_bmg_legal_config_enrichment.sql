with bmg_portfolio as (
  select id, office_id
  from public."AA_portfolios"
  where slug = 'banco-bmg'
),
bmg_taxonomies as (
  select taxonomies.id, taxonomies.office_id, taxonomies.portfolio_id, taxonomies.code, taxonomies.name
  from public."AA_taxonomies" as taxonomies
  join bmg_portfolio as portfolio on portfolio.id = taxonomies.portfolio_id
  where taxonomies.code in ('BMG1', 'BMG2', 'BMG3', 'BMG4')
)
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
  taxonomies.office_id,
  taxonomies.portfolio_id,
  taxonomies.id,
  seeded.step_key,
  seeded.document_type,
  seeded.requirement_label,
  seeded.requirement_details,
  seeded.is_required,
  true
from bmg_taxonomies as taxonomies
join (
  values
    (
      'BMG1',
      'documentos_autor',
      'author_identity_document',
      'Documento de identidade do autor',
      'Validar se os dados pessoais do autor permitem confrontar a suposta contratacao consignada.',
      true
    ),
    (
      'BMG1',
      'documentos_autor',
      'author_address_proof',
      'Comprovante de endereco minimamente contemporaneo',
      'Ajuda a conferir aderencia cadastral, correspondencia do caso concreto e eventual divergencia com dados contratuais.',
      false
    ),
    (
      'BMG1',
      'pre_analise',
      'other',
      'Contrato, aceite ou gravacao da contratacao',
      'Priorizar instrumento contratual, assinatura, biometria, aceite eletronico, gravacao ou outro lastro da contratacao.',
      true
    ),
    (
      'BMG1',
      'pre_analise',
      'author_payment_proof',
      'Comprovante de liberacao ou credito',
      'Identificar TED, PIX, conta de destino, recibo de saque ou documento equivalente vinculado ao produto.',
      false
    ),
    (
      'BMG1',
      'defesa',
      'defense_documents',
      'Anexos defensivos da trilha contratual',
      'A defesa deve vir acompanhada dos documentos que demonstrem contratacao, liberacao ou uso do produto.',
      true
    ),

    (
      'BMG2',
      'documentos_autor',
      'author_identity_document',
      'Documento de identidade do autor',
      'Necessario para vincular o autor aos descontos alegados e aos dados constantes dos extratos.',
      true
    ),
    (
      'BMG2',
      'pre_analise',
      'other',
      'Extratos, historico de descontos ou comprovantes de consignacao',
      'Priorizar documentos que indiquem valor, periodicidade, rubrica, conta ou beneficio atingido.',
      true
    ),
    (
      'BMG2',
      'pre_analise',
      'author_payment_proof',
      'Comprovacao do prejuizo material alegado',
      'Considerar comprovantes de desconto, extrato bancario, HISCON, contracheque ou outros documentos equivalentes.',
      true
    ),
    (
      'BMG2',
      'defesa',
      'defense_documents',
      'Documentos defensivos de lastro dos descontos',
      'A defesa deve trazer extratos internos, contrato, historico do produto e demonstrativos suficientes para justificar a cobranca.',
      true
    ),

    (
      'BMG3',
      'documentos_autor',
      'author_identity_document',
      'Documento de identidade do autor',
      'Essencial para analisar divergencia de identidade, assinatura ou reconhecimento da operacao.',
      true
    ),
    (
      'BMG3',
      'documentos_autor',
      'author_screen_capture',
      'Boletim, prints, protocolos ou comunicacoes da fraude',
      'Podem reforcar a cronologia da alegacao de fraude ou contestacao extrajudicial.',
      false
    ),
    (
      'BMG3',
      'pre_analise',
      'other',
      'Trilha de autenticacao, logs ou comprovantes da operacao contestada',
      'Priorizar logs, IP, biometria, geolocalizacao, assinatura eletronica, comprovante de transferencia e trilha antifraude.',
      true
    ),
    (
      'BMG3',
      'defesa',
      'defense_documents',
      'Anexos defensivos de autenticacao da operacao',
      'A defesa deve vir acompanhada da cadeia de autenticacao e dos documentos que individualizem a operacao impugnada.',
      true
    ),

    (
      'BMG4',
      'documentos_autor',
      'author_identity_document',
      'Documento de identidade do autor',
      'Necessario para confrontar titularidade do produto e regularidade aparente da adesao ao cartao/RMC.',
      true
    ),
    (
      'BMG4',
      'pre_analise',
      'other',
      'Fatura, termo de adesao, comprovante de saque ou historico do cartao',
      'Priorizar documentos que demonstrem adesao ao cartao consignado, saque, reserva de margem e utilizacao do produto.',
      true
    ),
    (
      'BMG4',
      'documentos_autor',
      'author_payment_proof',
      'Documento do impacto financeiro alegado',
      'Considerar contracheque, extrato de beneficio, demonstrativo de reserva de margem ou comprovante equivalente.',
      true
    ),
    (
      'BMG4',
      'defesa',
      'defense_documents',
      'Documentos defensivos do cartao consignado/RMC',
      'A defesa deve anexar termo de adesao, prova de saque ou uso, fatura, margem e documentos correlatos.',
      true
    )
) as seeded(code, step_key, document_type, requirement_label, requirement_details, is_required)
  on seeded.code = taxonomies.code
where not exists (
  select 1
  from public."AA_portfolio_document_requirements" as requirements
  where requirements.portfolio_id = taxonomies.portfolio_id
    and requirements.taxonomy_id = taxonomies.id
    and requirements.step_key = seeded.step_key
    and requirements.document_type = seeded.document_type
    and requirements.requirement_label = seeded.requirement_label
);

with bmg_taxonomies as (
  select taxonomies.id, taxonomies.office_id, taxonomies.portfolio_id, taxonomies.code
  from public."AA_taxonomies" as taxonomies
  join public."AA_portfolios" as portfolios on portfolios.id = taxonomies.portfolio_id
  where portfolios.slug = 'banco-bmg'
    and taxonomies.code in ('BMG1', 'BMG2', 'BMG3', 'BMG4')
)
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
  taxonomies.office_id,
  taxonomies.portfolio_id,
  taxonomies.id,
  seeded.title,
  seeded.summary,
  seeded.legal_basis,
  seeded.applicability_notes,
  true
from bmg_taxonomies as taxonomies
join (
  values
    (
      'BMG1',
      'Regularidade formal da contratacao consignada',
      'A defesa deve verificar se ha contrato, aceite, assinatura, biometria, gravacao ou outro lastro apto a demonstrar a contratacao do produto consignado.',
      'CPC, CDC, instrumentos contratuais do produto e regulamentacao bancaria aplicavel.',
      'Cruzar sempre com identidade do autor, cronologia da liberacao e coerencia entre contrato e documentos financeiros.'
    ),
    (
      'BMG1',
      'Liberacao do credito e vinculo com o autor',
      'Mesmo em contratacao contestada, a defesa deve buscar demonstrar se houve liberacao do valor, conta de destino e nexo entre o credito e o autor.',
      'Regras gerais de prova documental e registros operacionais da instituicao financeira.',
      'Se a conta de destino ou os dados do recebedor forem divergentes, isso deve aparecer como fragilidade relevante.'
    ),
    (
      'BMG2',
      'Necessidade de demonstracao especifica dos descontos',
      'Em descontos indevidos, a defesa deve individualizar rubrica, periodicidade, origem do desconto e vinculo com produto ou contrato especifico.',
      'CDC, CPC e regras de onus da prova aplicaveis ao caso concreto.',
      'Extratos genericos ou sem identificacao clara do produto tendem a ser insuficientes.'
    ),
    (
      'BMG2',
      'Coerencia entre contrato, extrato e historico operacional',
      'A aderencia entre contrato, extrato e historico do produto e central para sustentar a regularidade dos descontos questionados.',
      'CPC, CDC e instrumentos internos da operacao bancaria.',
      'Se houver divergencia de datas, valores ou rubricas, registrar como risco defensivo.'
    ),
    (
      'BMG3',
      'Cadeia de autenticacao da operacao impugnada',
      'Quando houver alegacao de fraude ou operacao nao reconhecida, a defesa deve demonstrar autenticacao, logs ou trilha de confirmacao da operacao.',
      'CPC, CDC e registros operacionais eletrônicos pertinentes.',
      'Nao presumir fraude ou regularidade: a qualidade da trilha de autenticacao e o ponto central.'
    ),
    (
      'BMG3',
      'Distincao entre indicio de fraude e prova conclusiva',
      'A leitura defensiva deve separar inconsistencias aparentes de efetiva prova de fraude, sempre com cautela e rastreabilidade.',
      'CDC e regras de valoração da prova documental.',
      'Evitar conclusoes peremptorias quando faltarem logs, gravacoes ou identificadores robustos.'
    ),
    (
      'BMG4',
      'Dever de esclarecer adesao a cartao consignado e RMC',
      'A defesa deve demonstrar se houve adesao especifica ao cartao consignado/RMC, com documentos de aceite, saque ou uso do produto.',
      'CDC, dever de informacao e regulamentacao incidente sobre produtos consignados.',
      'Foco em diferenciar emprestimo consignado comum de cartao consignado com reserva de margem.'
    ),
    (
      'BMG4',
      'Materialidade do uso do produto e da reserva de margem',
      'A regularidade do produto depende de lastro sobre saque, uso, fatura, margem consignavel e historico financeiro correspondente.',
      'CPC, CDC e registros do produto bancario.',
      'Se houver apenas adesao abstrata sem prova de uso ou reflexo financeiro, a defesa fica fragilizada.'
    )
) as seeded(code, title, summary, legal_basis, applicability_notes)
  on seeded.code = taxonomies.code
where not exists (
  select 1
  from public."AA_portfolio_legal_theses" as theses
  where theses.portfolio_id = taxonomies.portfolio_id
    and theses.taxonomy_id = taxonomies.id
    and theses.title = seeded.title
);

with bmg_taxonomies as (
  select taxonomies.id, taxonomies.office_id, taxonomies.portfolio_id, taxonomies.code, taxonomies.name
  from public."AA_taxonomies" as taxonomies
  join public."AA_portfolios" as portfolios on portfolios.id = taxonomies.portfolio_id
  where portfolios.slug = 'banco-bmg'
    and taxonomies.code in ('BMG1', 'BMG2', 'BMG3', 'BMG4')
)
update public."AA_portfolio_case_templates" as templates
set
  template_markdown = seeded.template_markdown,
  usage_notes = seeded.usage_notes,
  updated_at = now()
from (
  select
    taxonomies.id as taxonomy_id,
    concat('Modelo base - ', taxonomies.code) as expected_title,
    case
      when taxonomies.code = 'BMG1' then concat(
        '# Contestacao base - ', taxonomies.code, E'\n\n',
        '## 1. Sintese objetiva dos fatos\n',
        '- Delimitar a narrativa autoral sobre a contratacao consignada, negacao de vinculo e pedidos formulados.\n\n',
        '## 2. Documentos essenciais da defesa\n',
        '- Identificar contrato, aceite, assinatura, biometria, gravacao, comprovante de liberacao e conta de destino.\n\n',
        '## 3. Preliminares e admissibilidade\n',
        '- Verificar ilegitimidade, interesse processual e outras questoes formais apenas se aderentes ao caso concreto.\n\n',
        '## 4. Merito\n',
        '- Enfrentar especificamente contratacao, cadeia documental, liberacao do credito, vinculo com o autor e extensao do dano alegado.\n\n',
        '## 5. Pedidos\n',
        '- Ajustar pedidos finais a partir da robustez documental efetivamente reunida.'
      )
      when taxonomies.code = 'BMG2' then concat(
        '# Contestacao base - ', taxonomies.code, E'\n\n',
        '## 1. Sintese objetiva dos fatos\n',
        '- Delimitar quais descontos sao impugnados, em que periodo, em qual beneficio ou conta e qual a narrativa de prejuizo.\n\n',
        '## 2. Documentos essenciais da defesa\n',
        '- Priorizar extratos, historico do produto, contrato correspondente, identificacao da rubrica e memoria dos descontos.\n\n',
        '## 3. Pontos de confronto\n',
        '- Organizar divergencias de valores, rubricas, datas e lastro contratual dos descontos.\n\n',
        '## 4. Merito\n',
        '- Responder a regularidade ou irregularidade dos descontos com aderencia documental individualizada.\n\n',
        '## 5. Pedidos\n',
        '- Fechar a peca considerando repeticao de indébito, dano moral e eventual improcedencia parcial.'
      )
      when taxonomies.code = 'BMG3' then concat(
        '# Contestacao base - ', taxonomies.code, E'\n\n',
        '## 1. Sintese objetiva dos fatos\n',
        '- Delimitar a alegacao de fraude, operacao nao reconhecida e o pedido central da inicial.\n\n',
        '## 2. Trilha de autenticacao\n',
        '- Organizar logs, aceite, assinatura, biometria, geolocalizacao, conta de destino, comprovantes e cronologia da operacao.\n\n',
        '## 3. Pontos de atencao defensivos\n',
        '- Diferenciar indicios de inconsistencias, fragilidades da trilha e elementos concretos de autenticacao.\n\n',
        '## 4. Merito\n',
        '- Enfrentar de forma objetiva a narrativa de fraude, o vinculo subjetivo da operacao e os danos alegados.\n\n',
        '## 5. Pedidos\n',
        '- Encerrar a defesa com pedidos coerentes com a consistencia da cadeia de autenticacao reunida.'
      )
      else concat(
        '# Contestacao base - ', taxonomies.code, E'\n\n',
        '## 1. Sintese objetiva dos fatos\n',
        '- Delimitar a narrativa sobre cartao consignado, RMC, saque, uso do produto e impacto financeiro alegado.\n\n',
        '## 2. Documentos essenciais da defesa\n',
        '- Priorizar termo de adesao, comprovante de saque ou uso, fatura, historico do cartao, margem consignavel e extratos relacionados.\n\n',
        '## 3. Pontos de confronto\n',
        '- Distinguir adesao ao cartao/RMC de emprestimo consignado comum e enfrentar o dever de informacao no caso concreto.\n\n',
        '## 4. Merito\n',
        '- Responder especificamente reserva de margem, utilizacao do produto, cobrancas e danos alegados.\n\n',
        '## 5. Pedidos\n',
        '- Ajustar pedidos finais de acordo com a prova de adesao, uso e materialidade financeira do produto.'
      )
    end as template_markdown,
    case
      when taxonomies.code = 'BMG1' then 'Modelo base para casos de contratacao contestada de consignado, com foco em contrato, aceite e liberacao do credito.'
      when taxonomies.code = 'BMG2' then 'Modelo base para descontos indevidos, com foco em rubrica, extrato, contrato e individualizacao do prejuizo.'
      when taxonomies.code = 'BMG3' then 'Modelo base para fraude ou operacao nao reconhecida, com foco em trilha de autenticacao e rastreabilidade da operacao.'
      else 'Modelo base para cartao consignado e RMC, com foco em adesao especifica, uso do produto, margem e efeitos financeiros.'
    end as usage_notes
  from bmg_taxonomies as taxonomies
) as seeded
where templates.taxonomy_id = seeded.taxonomy_id
  and templates.title = seeded.expected_title;
