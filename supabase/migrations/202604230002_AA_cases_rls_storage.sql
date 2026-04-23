alter table public."AA_cases" enable row level security;
alter table public."AA_case_parties" enable row level security;
alter table public."AA_case_entities" enable row level security;
alter table public."AA_case_entity_links" enable row level security;
alter table public."AA_case_documents" enable row level security;
alter table public."AA_case_history" enable row level security;

drop policy if exists "AA_cases_select_same_office" on public."AA_cases";
create policy "AA_cases_select_same_office"
on public."AA_cases"
for select
to authenticated
using (office_id = public.aa_current_office_id());

drop policy if exists "AA_cases_insert_same_office" on public."AA_cases";
create policy "AA_cases_insert_same_office"
on public."AA_cases"
for insert
to authenticated
with check (
  office_id = public.aa_current_office_id()
  and created_by = auth.uid()
  and (
    taxonomy_id is null
    or exists (
      select 1
      from public."AA_taxonomies"
      where id = taxonomy_id
        and office_id = public.aa_current_office_id()
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
  and (
    taxonomy_id is null
    or exists (
      select 1
      from public."AA_taxonomies"
      where id = taxonomy_id
        and office_id = public.aa_current_office_id()
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

drop policy if exists "AA_cases_delete_admin_same_office" on public."AA_cases";
create policy "AA_cases_delete_admin_same_office"
on public."AA_cases"
for delete
to authenticated
using (public.aa_is_admin() and office_id = public.aa_current_office_id());

drop policy if exists "AA_case_parties_select_same_office" on public."AA_case_parties";
create policy "AA_case_parties_select_same_office"
on public."AA_case_parties"
for select
to authenticated
using (public.aa_case_office_id(case_id) = public.aa_current_office_id());

drop policy if exists "AA_case_parties_insert_same_office" on public."AA_case_parties";
create policy "AA_case_parties_insert_same_office"
on public."AA_case_parties"
for insert
to authenticated
with check (public.aa_case_office_id(case_id) = public.aa_current_office_id());

drop policy if exists "AA_case_parties_update_admin_same_office" on public."AA_case_parties";
create policy "AA_case_parties_update_admin_same_office"
on public."AA_case_parties"
for update
to authenticated
using (public.aa_is_admin() and public.aa_case_office_id(case_id) = public.aa_current_office_id())
with check (public.aa_is_admin() and public.aa_case_office_id(case_id) = public.aa_current_office_id());

drop policy if exists "AA_case_parties_delete_admin_same_office" on public."AA_case_parties";
create policy "AA_case_parties_delete_admin_same_office"
on public."AA_case_parties"
for delete
to authenticated
using (public.aa_is_admin() and public.aa_case_office_id(case_id) = public.aa_current_office_id());

drop policy if exists "AA_case_entities_select_same_office" on public."AA_case_entities";
create policy "AA_case_entities_select_same_office"
on public."AA_case_entities"
for select
to authenticated
using (office_id = public.aa_current_office_id());

drop policy if exists "AA_case_entities_insert_same_office" on public."AA_case_entities";
create policy "AA_case_entities_insert_same_office"
on public."AA_case_entities"
for insert
to authenticated
with check (office_id = public.aa_current_office_id());

drop policy if exists "AA_case_entities_admin_update_same_office" on public."AA_case_entities";
create policy "AA_case_entities_admin_update_same_office"
on public."AA_case_entities"
for update
to authenticated
using (public.aa_is_admin() and office_id = public.aa_current_office_id())
with check (public.aa_is_admin() and office_id = public.aa_current_office_id());

drop policy if exists "AA_case_entities_admin_delete_same_office" on public."AA_case_entities";
create policy "AA_case_entities_admin_delete_same_office"
on public."AA_case_entities"
for delete
to authenticated
using (public.aa_is_admin() and office_id = public.aa_current_office_id());

drop policy if exists "AA_case_entity_links_select_same_office" on public."AA_case_entity_links";
create policy "AA_case_entity_links_select_same_office"
on public."AA_case_entity_links"
for select
to authenticated
using (public.aa_case_office_id(case_id) = public.aa_current_office_id());

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
  )
);

drop policy if exists "AA_case_entity_links_delete_admin_same_office" on public."AA_case_entity_links";
create policy "AA_case_entity_links_delete_admin_same_office"
on public."AA_case_entity_links"
for delete
to authenticated
using (public.aa_is_admin() and public.aa_case_office_id(case_id) = public.aa_current_office_id());

drop policy if exists "AA_case_documents_select_same_office" on public."AA_case_documents";
create policy "AA_case_documents_select_same_office"
on public."AA_case_documents"
for select
to authenticated
using (public.aa_case_office_id(case_id) = public.aa_current_office_id());

drop policy if exists "AA_case_documents_insert_same_office" on public."AA_case_documents";
create policy "AA_case_documents_insert_same_office"
on public."AA_case_documents"
for insert
to authenticated
with check (
  public.aa_case_office_id(case_id) = public.aa_current_office_id()
  and uploaded_by = auth.uid()
);

drop policy if exists "AA_case_documents_delete_admin_same_office" on public."AA_case_documents";
create policy "AA_case_documents_delete_admin_same_office"
on public."AA_case_documents"
for delete
to authenticated
using (public.aa_is_admin() and public.aa_case_office_id(case_id) = public.aa_current_office_id());

drop policy if exists "AA_case_history_select_same_office" on public."AA_case_history";
create policy "AA_case_history_select_same_office"
on public."AA_case_history"
for select
to authenticated
using (public.aa_case_office_id(case_id) = public.aa_current_office_id());

drop policy if exists "AA_case_history_insert_same_office" on public."AA_case_history";
create policy "AA_case_history_insert_same_office"
on public."AA_case_history"
for insert
to authenticated
with check (
  public.aa_case_office_id(case_id) = public.aa_current_office_id()
  and performed_by = auth.uid()
);

drop policy if exists "AA_audit_logs_admin_read_same_office" on public."AA_audit_logs";
drop policy if exists "AA_audit_logs_select_same_office" on public."AA_audit_logs";
create policy "AA_audit_logs_select_same_office"
on public."AA_audit_logs"
for select
to authenticated
using (office_id = public.aa_current_office_id());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'aa-case-files',
  'aa-case-files',
  false,
  52428800,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "AA_case_files_select_same_office" on storage.objects;
create policy "AA_case_files_select_same_office"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'aa-case-files'
  and split_part(name, '/', 1)::uuid = public.aa_current_office_id()
);

drop policy if exists "AA_case_files_insert_same_office" on storage.objects;
create policy "AA_case_files_insert_same_office"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'aa-case-files'
  and split_part(name, '/', 1)::uuid = public.aa_current_office_id()
);

drop policy if exists "AA_case_files_update_admin_same_office" on storage.objects;
create policy "AA_case_files_update_admin_same_office"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'aa-case-files'
  and public.aa_is_admin()
  and split_part(name, '/', 1)::uuid = public.aa_current_office_id()
)
with check (
  bucket_id = 'aa-case-files'
  and public.aa_is_admin()
  and split_part(name, '/', 1)::uuid = public.aa_current_office_id()
);

drop policy if exists "AA_case_files_delete_admin_same_office" on storage.objects;
create policy "AA_case_files_delete_admin_same_office"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'aa-case-files'
  and public.aa_is_admin()
  and split_part(name, '/', 1)::uuid = public.aa_current_office_id()
);
