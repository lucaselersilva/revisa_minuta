alter table public."AA_offices" enable row level security;
alter table public."AA_profiles" enable row level security;
alter table public."AA_user_invites" enable row level security;
alter table public."AA_taxonomies" enable row level security;
alter table public."AA_audit_logs" enable row level security;

drop policy if exists "AA_offices_select_own" on public."AA_offices";
create policy "AA_offices_select_own"
on public."AA_offices"
for select
to authenticated
using (id = public.aa_current_office_id());

drop policy if exists "AA_profiles_select_same_office" on public."AA_profiles";
create policy "AA_profiles_select_same_office"
on public."AA_profiles"
for select
to authenticated
using (office_id = public.aa_current_office_id() or id = auth.uid());

drop policy if exists "AA_profiles_update_self_basic" on public."AA_profiles";
create policy "AA_profiles_update_self_basic"
on public."AA_profiles"
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and office_id = public.aa_current_office_id());

drop policy if exists "AA_profiles_admin_manage_same_office" on public."AA_profiles";
create policy "AA_profiles_admin_manage_same_office"
on public."AA_profiles"
for all
to authenticated
using (public.aa_is_admin() and office_id = public.aa_current_office_id())
with check (public.aa_is_admin() and office_id = public.aa_current_office_id());

drop policy if exists "AA_user_invites_admin_select_same_office" on public."AA_user_invites";
create policy "AA_user_invites_admin_select_same_office"
on public."AA_user_invites"
for select
to authenticated
using (public.aa_is_admin() and office_id = public.aa_current_office_id());

drop policy if exists "AA_user_invites_admin_insert_same_office" on public."AA_user_invites";
create policy "AA_user_invites_admin_insert_same_office"
on public."AA_user_invites"
for insert
to authenticated
with check (
  public.aa_is_admin()
  and office_id = public.aa_current_office_id()
  and invited_by = auth.uid()
);

drop policy if exists "AA_user_invites_admin_update_same_office" on public."AA_user_invites";
create policy "AA_user_invites_admin_update_same_office"
on public."AA_user_invites"
for update
to authenticated
using (public.aa_is_admin() and office_id = public.aa_current_office_id())
with check (public.aa_is_admin() and office_id = public.aa_current_office_id());

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
with check (public.aa_is_admin() and office_id = public.aa_current_office_id());

drop policy if exists "AA_taxonomies_admin_update_same_office" on public."AA_taxonomies";
create policy "AA_taxonomies_admin_update_same_office"
on public."AA_taxonomies"
for update
to authenticated
using (public.aa_is_admin() and office_id = public.aa_current_office_id())
with check (public.aa_is_admin() and office_id = public.aa_current_office_id());

drop policy if exists "AA_audit_logs_admin_read_same_office" on public."AA_audit_logs";
create policy "AA_audit_logs_admin_read_same_office"
on public."AA_audit_logs"
for select
to authenticated
using (public.aa_is_admin() and office_id = public.aa_current_office_id());

drop policy if exists "AA_audit_logs_admin_insert_same_office" on public."AA_audit_logs";
create policy "AA_audit_logs_admin_insert_same_office"
on public."AA_audit_logs"
for insert
to authenticated
with check (
  public.aa_is_admin()
  and office_id = public.aa_current_office_id()
  and actor_profile_id = auth.uid()
);
