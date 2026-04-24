alter table public."AA_author_external_searches" enable row level security;
alter table public."AA_author_external_processes" enable row level security;

drop policy if exists "AA_author_external_searches_select_same_office" on public."AA_author_external_searches";
create policy "AA_author_external_searches_select_same_office"
on public."AA_author_external_searches"
for select
to authenticated
using (office_id = public.aa_current_office_id());

drop policy if exists "AA_author_external_searches_insert_same_office" on public."AA_author_external_searches";
create policy "AA_author_external_searches_insert_same_office"
on public."AA_author_external_searches"
for insert
to authenticated
with check (
  office_id = public.aa_current_office_id()
  and public.aa_case_office_id(case_id) = public.aa_current_office_id()
);

drop policy if exists "AA_author_external_searches_update_same_office" on public."AA_author_external_searches";
create policy "AA_author_external_searches_update_same_office"
on public."AA_author_external_searches"
for update
to authenticated
using (office_id = public.aa_current_office_id())
with check (
  office_id = public.aa_current_office_id()
  and public.aa_case_office_id(case_id) = public.aa_current_office_id()
);

drop policy if exists "AA_author_external_processes_select_same_office" on public."AA_author_external_processes";
create policy "AA_author_external_processes_select_same_office"
on public."AA_author_external_processes"
for select
to authenticated
using (office_id = public.aa_current_office_id());

drop policy if exists "AA_author_external_processes_insert_same_office" on public."AA_author_external_processes";
create policy "AA_author_external_processes_insert_same_office"
on public."AA_author_external_processes"
for insert
to authenticated
with check (
  office_id = public.aa_current_office_id()
  and public.aa_case_office_id(case_id) = public.aa_current_office_id()
  and public.aa_author_external_search_office_id(search_id) = public.aa_current_office_id()
);

drop policy if exists "AA_author_external_processes_update_same_office" on public."AA_author_external_processes";
create policy "AA_author_external_processes_update_same_office"
on public."AA_author_external_processes"
for update
to authenticated
using (office_id = public.aa_current_office_id())
with check (
  office_id = public.aa_current_office_id()
  and public.aa_case_office_id(case_id) = public.aa_current_office_id()
  and public.aa_author_external_search_office_id(search_id) = public.aa_current_office_id()
);
