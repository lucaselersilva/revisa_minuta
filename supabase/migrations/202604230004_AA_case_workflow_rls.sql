alter table public."AA_case_workflows" enable row level security;
alter table public."AA_case_workflow_steps" enable row level security;
alter table public."AA_workflow_rules" enable row level security;

drop policy if exists "AA_case_workflows_select_same_office" on public."AA_case_workflows";
create policy "AA_case_workflows_select_same_office"
on public."AA_case_workflows"
for select
to authenticated
using (public.aa_case_office_id(case_id) = public.aa_current_office_id());

drop policy if exists "AA_case_workflows_insert_same_office" on public."AA_case_workflows";
create policy "AA_case_workflows_insert_same_office"
on public."AA_case_workflows"
for insert
to authenticated
with check (public.aa_case_office_id(case_id) = public.aa_current_office_id());

drop policy if exists "AA_case_workflows_update_same_office" on public."AA_case_workflows";
create policy "AA_case_workflows_update_same_office"
on public."AA_case_workflows"
for update
to authenticated
using (public.aa_case_office_id(case_id) = public.aa_current_office_id())
with check (public.aa_case_office_id(case_id) = public.aa_current_office_id());

drop policy if exists "AA_case_workflow_steps_select_same_office" on public."AA_case_workflow_steps";
create policy "AA_case_workflow_steps_select_same_office"
on public."AA_case_workflow_steps"
for select
to authenticated
using (public.aa_case_office_id(case_id) = public.aa_current_office_id());

drop policy if exists "AA_case_workflow_steps_insert_same_office" on public."AA_case_workflow_steps";
create policy "AA_case_workflow_steps_insert_same_office"
on public."AA_case_workflow_steps"
for insert
to authenticated
with check (public.aa_case_office_id(case_id) = public.aa_current_office_id());

drop policy if exists "AA_case_workflow_steps_update_same_office" on public."AA_case_workflow_steps";
create policy "AA_case_workflow_steps_update_same_office"
on public."AA_case_workflow_steps"
for update
to authenticated
using (public.aa_case_office_id(case_id) = public.aa_current_office_id())
with check (public.aa_case_office_id(case_id) = public.aa_current_office_id());

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
with check (public.aa_is_admin() and office_id = public.aa_current_office_id());

drop policy if exists "AA_workflow_rules_admin_update_same_office" on public."AA_workflow_rules";
create policy "AA_workflow_rules_admin_update_same_office"
on public."AA_workflow_rules"
for update
to authenticated
using (public.aa_is_admin() and office_id = public.aa_current_office_id())
with check (public.aa_is_admin() and office_id = public.aa_current_office_id());

drop policy if exists "AA_workflow_rules_admin_delete_same_office" on public."AA_workflow_rules";
create policy "AA_workflow_rules_admin_delete_same_office"
on public."AA_workflow_rules"
for delete
to authenticated
using (public.aa_is_admin() and office_id = public.aa_current_office_id());
