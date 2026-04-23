insert into public."AA_offices" (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Abrahao Advogados', 'abrahao-advogados')
on conflict (slug) do update
set name = excluded.name;

insert into public."AA_taxonomies" (office_id, code, name, description, is_active)
values
  ('00000000-0000-0000-0000-000000000001', 'A1', 'Demonstracao A1', 'Categoria visual de demonstracao para validar a interface inicial.', true),
  ('00000000-0000-0000-0000-000000000001', 'A2', 'Demonstracao A2', 'Categoria visual sem criterio juridico definitivo nesta fase.', true),
  ('00000000-0000-0000-0000-000000000001', 'B1', 'Demonstracao B1', 'Exemplo operacional para testar listagens, estados e CRUD.', true)
on conflict (office_id, code) do nothing;
