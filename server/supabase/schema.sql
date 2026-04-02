create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  first_name text not null,
  last_name text not null,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  status_reason text,
  password_hash text not null,
  created_by uuid references public.app_users(id) on delete set null,
  last_login_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.parcels (
  id uuid primary key default gen_random_uuid(),
  tracking_number text not null unique,
  platform text not null check (platform in ('J&T', 'Shopee', 'NinjaVan', 'Lazada')),
  status text not null check (status in ('Pending', 'Outbound', 'Cancelled', 'Returned', 'Double Waybill')),
  date_added date not null default current_date,
  outbound_date date,
  created_by uuid references public.app_users(id) on delete set null,
  updated_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.parcel_reports (
  id uuid primary key default gen_random_uuid(),
  parcel_id uuid not null references public.parcels(id) on delete cascade,
  tracking_number text not null,
  remarks text not null,
  status text not null default 'Unresolved' check (status in ('Unresolved', 'Resolved')),
  reported_by uuid references public.app_users(id) on delete set null,
  updated_by uuid references public.app_users(id) on delete set null,
  reported_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organization_settings (
  id boolean primary key default true check (id),
  registration_code_hash text,
  registration_code_updated_at timestamptz,
  registration_code_updated_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  parcel_id uuid references public.parcels(id) on delete set null,
  tracking_number text,
  actor_id uuid references public.app_users(id) on delete set null,
  actor_name text,
  category text not null check (category in ('parcel', 'report', 'user', 'auth')),
  action text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_app_users_role_status on public.app_users(role, status);
create index if not exists idx_app_users_created_at on public.app_users(created_at desc);
create index if not exists idx_parcels_tracking_number on public.parcels(tracking_number);
create index if not exists idx_parcels_status on public.parcels(status);
create index if not exists idx_parcels_platform on public.parcels(platform);
create index if not exists idx_parcels_date_added on public.parcels(date_added desc);
create index if not exists idx_parcel_reports_status on public.parcel_reports(status);
create index if not exists idx_parcel_reports_tracking_number on public.parcel_reports(tracking_number);
create index if not exists idx_parcel_reports_reported_at on public.parcel_reports(reported_at desc);
create index if not exists idx_activity_logs_tracking_number on public.activity_logs(tracking_number);
create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at desc);

create or replace trigger set_app_users_updated_at
before update on public.app_users
for each row
execute function public.set_updated_at();

create or replace trigger set_parcels_updated_at
before update on public.parcels
for each row
execute function public.set_updated_at();

create or replace trigger set_parcel_reports_updated_at
before update on public.parcel_reports
for each row
execute function public.set_updated_at();

create or replace trigger set_organization_settings_updated_at
before update on public.organization_settings
for each row
execute function public.set_updated_at();

insert into public.organization_settings (id)
values (true)
on conflict (id) do nothing;

alter table public.app_users enable row level security;
alter table public.parcels enable row level security;
alter table public.parcel_reports enable row level security;
alter table public.organization_settings enable row level security;
alter table public.activity_logs enable row level security;
