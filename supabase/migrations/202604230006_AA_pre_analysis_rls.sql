alter table public."AA_document_ingestions" enable row level security;
alter table public."AA_pre_analysis_reports" enable row level security;
alter table public."AA_pre_analysis_acknowledgements" enable row level security;

drop policy if exists "AA_document_ingestions_select_same_office" on public."AA_document_ingestions";
create policy "AA_document_ingestions_select_same_office"
on public."AA_document_ingestions"
for select
to authenticated
using (office_id = public.aa_current_office_id());

drop policy if exists "AA_document_ingestions_insert_same_office" on public."AA_document_ingestions";
create policy "AA_document_ingestions_insert_same_office"
on public."AA_document_ingestions"
for insert
to authenticated
with check (
  office_id = public.aa_current_office_id()
  and public.aa_case_document_office_id(case_document_id) = public.aa_current_office_id()
);

drop policy if exists "AA_document_ingestions_update_same_office" on public."AA_document_ingestions";
create policy "AA_document_ingestions_update_same_office"
on public."AA_document_ingestions"
for update
to authenticated
using (office_id = public.aa_current_office_id())
with check (
  office_id = public.aa_current_office_id()
  and public.aa_case_document_office_id(case_document_id) = public.aa_current_office_id()
);

drop policy if exists "AA_pre_analysis_reports_select_same_office" on public."AA_pre_analysis_reports";
create policy "AA_pre_analysis_reports_select_same_office"
on public."AA_pre_analysis_reports"
for select
to authenticated
using (office_id = public.aa_current_office_id());

drop policy if exists "AA_pre_analysis_reports_insert_same_office" on public."AA_pre_analysis_reports";
create policy "AA_pre_analysis_reports_insert_same_office"
on public."AA_pre_analysis_reports"
for insert
to authenticated
with check (
  office_id = public.aa_current_office_id()
  and public.aa_case_office_id(case_id) = public.aa_current_office_id()
);

drop policy if exists "AA_pre_analysis_reports_update_same_office" on public."AA_pre_analysis_reports";
create policy "AA_pre_analysis_reports_update_same_office"
on public."AA_pre_analysis_reports"
for update
to authenticated
using (office_id = public.aa_current_office_id())
with check (
  office_id = public.aa_current_office_id()
  and public.aa_case_office_id(case_id) = public.aa_current_office_id()
);

drop policy if exists "AA_pre_analysis_ack_select_same_office" on public."AA_pre_analysis_acknowledgements";
create policy "AA_pre_analysis_ack_select_same_office"
on public."AA_pre_analysis_acknowledgements"
for select
to authenticated
using (office_id = public.aa_current_office_id());

drop policy if exists "AA_pre_analysis_ack_insert_same_office" on public."AA_pre_analysis_acknowledgements";
create policy "AA_pre_analysis_ack_insert_same_office"
on public."AA_pre_analysis_acknowledgements"
for insert
to authenticated
with check (
  office_id = public.aa_current_office_id()
  and public.aa_case_office_id(case_id) = public.aa_current_office_id()
  and public.aa_pre_analysis_report_office_id(report_id) = public.aa_current_office_id()
  and acknowledged_by = auth.uid()
);
