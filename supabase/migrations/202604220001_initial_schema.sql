create extension if not exists "pgcrypto";

create table if not exists public."AA_offices" (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public."AA_profiles" (
  id uuid primary key references auth.users(id) on delete cascade,
  office_id uuid references public."AA_offices"(id),
  full_name text,
  role text not null check (role in ('admin', 'lawyer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public."AA_user_invites" (
  id uuid primary key default gen_random_uuid(),
  office_id uuid references public."AA_offices"(id),
  email text not null,
  role text not null check (role in ('admin', 'lawyer')),
  invited_by uuid references public."AA_profiles"(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public."AA_taxonomies" (
  id uuid primary key default gen_random_uuid(),
  office_id uuid references public."AA_offices"(id),
  code text not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (office_id, code)
);

create table if not exists public."AA_audit_logs" (
  id uuid primary key default gen_random_uuid(),
  office_id uuid references public."AA_offices"(id),
  actor_profile_id uuid references public."AA_profiles"(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists aa_profiles_office_id_idx on public."AA_profiles"(office_id);
create index if not exists aa_user_invites_office_id_idx on public."AA_user_invites"(office_id);
create index if not exists aa_taxonomies_office_id_idx on public."AA_taxonomies"(office_id);
create index if not exists aa_taxonomies_active_idx on public."AA_taxonomies"(office_id, is_active);
create index if not exists aa_audit_logs_office_id_idx on public."AA_audit_logs"(office_id);

create or replace function public.aa_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists aa_offices_set_updated_at on public."AA_offices";
create trigger aa_offices_set_updated_at
before update on public."AA_offices"
for each row execute function public.aa_set_updated_at();

drop trigger if exists aa_profiles_set_updated_at on public."AA_profiles";
create trigger aa_profiles_set_updated_at
before update on public."AA_profiles"
for each row execute function public.aa_set_updated_at();

drop trigger if exists aa_user_invites_set_updated_at on public."AA_user_invites";
create trigger aa_user_invites_set_updated_at
before update on public."AA_user_invites"
for each row execute function public.aa_set_updated_at();

drop trigger if exists aa_taxonomies_set_updated_at on public."AA_taxonomies";
create trigger aa_taxonomies_set_updated_at
before update on public."AA_taxonomies"
for each row execute function public.aa_set_updated_at();

create or replace function public.aa_current_profile()
returns public."AA_profiles"
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public."AA_profiles"
  where id = auth.uid()
    and is_active = true
  limit 1
$$;

create or replace function public.aa_current_office_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select office_id
  from public."AA_profiles"
  where id = auth.uid()
    and is_active = true
  limit 1
$$;

create or replace function public.aa_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public."AA_profiles"
    where id = auth.uid()
      and is_active = true
      and role = 'admin'
  )
$$;
