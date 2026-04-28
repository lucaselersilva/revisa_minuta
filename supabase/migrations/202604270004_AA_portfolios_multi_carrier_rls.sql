alter table public."AA_portfolios" enable row level security;

drop policy if exists "AA_portfolios_select_same_office" on public."AA_portfolios";
create policy "AA_portfolios_select_same_office"
on public."AA_portfolios"
for select
to authenticated
using (office_id = public.aa_current_office_id());

drop policy if exists "AA_portfolios_admin_insert_same_office" on public."AA_portfolios";
create policy "AA_portfolios_admin_insert_same_office"
on public."AA_portfolios"
for insert
to authenticated
with check (public.aa_is_admin() and office_id = public.aa_current_office_id());

drop policy if exists "AA_portfolios_admin_update_same_office" on public."AA_portfolios";
create policy "AA_portfolios_admin_update_same_office"
on public."AA_portfolios"
for update
to authenticated
using (public.aa_is_admin() and office_id = public.aa_current_office_id())
with check (public.aa_is_admin() and office_id = public.aa_current_office_id());

drop policy if exists "AA_portfolios_admin_delete_same_office" on public."AA_portfolios";
create policy "AA_portfolios_admin_delete_same_office"
on public."AA_portfolios"
for delete
to authenticated
using (public.aa_is_admin() and office_id = public.aa_current_office_id());

drop policy if exists "AA_taxonomies_select_same_office" on public."AA_taxonomies";
create policy "AA_taxonomies_select_same_office"
on public."AA_taxonomies"
for select
to authenticated
using (office_id = public.aa_current_office_id());

drop policy if exists "AA_taxonomies_admin_insert_same_office" on public."AA_taxonomies";
create policy "AA_taxonomies_admin_insert_same_office"
on public."AA_taxonomies"
for insert
to authenticated
with check (
  public.aa_is_admin()
  and office_id = public.aa_current_office_id()
  and public.aa_portfolio_office_id(portfolio_id) = public.aa_current_office_id()
);

drop policy if exists "AA_taxonomies_admin_update_same_office" on public."AA_taxonomies";
create policy "AA_taxonomies_admin_update_same_office"
on public."AA_taxonomies"
for update
to authenticated
using (public.aa_is_admin() and office_id = public.aa_current_office_id())
with check (
  public.aa_is_admin()
  and office_id = public.aa_current_office_id()
  and public.aa_portfolio_office_id(portfolio_id) = public.aa_current_office_id()
);

drop policy if exists "AA_cases_insert_same_office" on public."AA_cases";
create policy "AA_cases_insert_same_office"
on public."AA_cases"
for insert
to authenticated
with check (
  office_id = public.aa_current_office_id()
  and created_by = auth.uid()
  and public.aa_portfolio_office_id(portfolio_id) = public.aa_current_office_id()
  and (
    taxonomy_id is null
    or exists (
      select 1
      from public."AA_taxonomies"
      where id = taxonomy_id
        and office_id = public.aa_current_office_id()
        and portfolio_id = "AA_cases".portfolio_id
    )
  )
  and (
    responsible_lawyer_id is null
    or exists (
      select 1
      from public."AA_profiles"
      where id = responsible_lawyer_id
        and office_id = public.aa_current_office_id()
        and is_active = true
    )
  )
);

drop policy if exists "AA_cases_update_admin_same_office" on public."AA_cases";
create policy "AA_cases_update_admin_same_office"
on public."AA_cases"
for update
to authenticated
using (public.aa_is_admin() and office_id = public.aa_current_office_id())
with check (
  public.aa_is_admin()
  and office_id = public.aa_current_office_id()
  and public.aa_portfolio_office_id(portfolio_id) = public.aa_current_office_id()
  and (
    taxonomy_id is null
    or exists (
      select 1
      from public."AA_taxonomies"
      where id = taxonomy_id
        and office_id = public.aa_current_office_id()
        and portfolio_id = "AA_cases".portfolio_id
    )
  )
  and (
    responsible_lawyer_id is null
    or exists (
      select 1
      from public."AA_profiles"
      where id = responsible_lawyer_id
        and office_id = public.aa_current_office_id()
        and is_active = true
    )
  )
);

drop policy if exists "AA_case_entities_select_same_office" on public."AA_case_entities";
create policy "AA_case_entities_select_same_office"
on public."AA_case_entities"
for select
to authenticated
using (office_id = public.aa_current_office_id());

drop policy if exists "AA_case_entities_insert_admin_same_office" on public."AA_case_entities";
create policy "AA_case_entities_insert_admin_same_office"
on public."AA_case_entities"
for insert
to authenticated
with check (
  public.aa_is_admin()
  and office_id = public.aa_current_office_id()
  and public.aa_portfolio_office_id(portfolio_id) = public.aa_current_office_id()
);

drop policy if exists "AA_case_entities_admin_update_same_office" on public."AA_case_entities";
create policy "AA_case_entities_admin_update_same_office"
on public."AA_case_entities"
for update
to authenticated
using (public.aa_is_admin() and office_id = public.aa_current_office_id())
with check (
  public.aa_is_admin()
  and office_id = public.aa_current_office_id()
  and public.aa_portfolio_office_id(portfolio_id) = public.aa_current_office_id()
);

drop policy if exists "AA_case_entity_links_insert_same_office" on public."AA_case_entity_links";
create policy "AA_case_entity_links_insert_same_office"
on public."AA_case_entity_links"
for insert
to authenticated
with check (
  public.aa_case_office_id(case_id) = public.aa_current_office_id()
  and exists (
    select 1
    from public."AA_case_entities"
    where id = entity_id
      and office_id = public.aa_current_office_id()
      and portfolio_id = public.aa_case_portfolio_id(case_id)
  )
);

drop policy if exists "AA_workflow_rules_select_same_office" on public."AA_workflow_rules";
create policy "AA_workflow_rules_select_same_office"
on public."AA_workflow_rules"
for select
to authenticated
using (office_id = public.aa_current_office_id());

drop policy if exists "AA_workflow_rules_admin_insert_same_office" on public."AA_workflow_rules";
create policy "AA_workflow_rules_admin_insert_same_office"
on public."AA_workflow_rules"
for insert
to authenticated
with check (
  public.aa_is_admin()
  and office_id = public.aa_current_office_id()
  and public.aa_portfolio_office_id(portfolio_id) = public.aa_current_office_id()
);

drop policy if exists "AA_workflow_rules_admin_update_same_office" on public."AA_workflow_rules";
create policy "AA_workflow_rules_admin_update_same_office"
on public."AA_workflow_rules"
for update
to authenticated
using (public.aa_is_admin() and office_id = public.aa_current_office_id())
with check (
  public.aa_is_admin()
  and office_id = public.aa_current_office_id()
  and public.aa_portfolio_office_id(portfolio_id) = public.aa_current_office_id()
);
