drop policy if exists "AA_case_entities_insert_same_office" on public."AA_case_entities";

create policy "AA_case_entities_insert_admin_same_office"
on public."AA_case_entities"
for insert
to authenticated
with check (public.aa_is_admin() and office_id = public.aa_current_office_id());
