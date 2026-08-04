create extension if not exists citext;
create extension if not exists pgcrypto;

create type public.event_status as enum (
  'draft', 'open', 'closed', 'sold_out', 'finished', 'cancelled'
);
create type public.registration_status as enum ('confirmed', 'waitlist', 'cancelled');
create type public.staff_role as enum ('admin', 'checkin_operator');
create type public.checkin_method as enum ('qr', 'manual');
create type public.email_delivery_status as enum ('pending', 'sent', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) >= 2),
  global_role public.staff_role not null default 'checkin_operator',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 3),
  slug citext not null unique check (slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  cover_image_url text,
  logo_image_url text,
  start_at timestamptz not null,
  end_at timestamptz,
  timezone text not null default 'America/Bahia',
  venue_name text not null,
  address text not null,
  city text not null,
  capacity integer check (capacity is null or capacity > 0),
  waitlist_enabled boolean not null default false,
  show_remaining_slots boolean not null default false,
  whatsapp_group_url text,
  registration_status public.event_status not null default 'draft',
  registration_open_at timestamptz,
  registration_close_at timestamptz,
  email_subject text,
  confirmation_message text,
  support_email citext,
  privacy_policy_url text,
  privacy_policy_version text not null default '1.0',
  custom_fields jsonb not null default '[]'::jsonb,
  require_checkin_confirmation boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_event_period check (end_at is null or end_at > start_at),
  constraint valid_registration_period check (
    registration_close_at is null or registration_open_at is null or registration_close_at > registration_open_at
  ),
  constraint valid_whatsapp_url check (
    whatsapp_group_url is null or whatsapp_group_url ~ '^https://(chat\\.whatsapp\\.com|wa\\.me)/'
  )
);

create table public.event_staff (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.staff_role not null,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) >= 3),
  email citext not null,
  phone text not null check (phone ~ '^[0-9]{10,13}$'),
  city text not null check (char_length(trim(city)) >= 2),
  custom_answers jsonb not null default '{}'::jsonb,
  privacy_consent boolean not null check (privacy_consent),
  privacy_consent_at timestamptz not null default now(),
  privacy_policy_version text not null,
  communications_consent boolean not null default false,
  status public.registration_status not null,
  ticket_code text not null,
  ticket_token text not null,
  registered_at timestamptz not null default now(),
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users(id),
  checkin_method public.checkin_method,
  cancelled_at timestamptz,
  cancellation_reason text,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, email),
  unique (event_id, ticket_code),
  unique (ticket_token),
  constraint valid_checkin_fields check (
    (checked_in_at is null and checked_in_by is null and checkin_method is null)
    or (checked_in_at is not null and checked_in_by is not null and checkin_method is not null)
  )
);

create unique index registrations_active_phone_unique
  on public.registrations(event_id, phone)
  where status <> 'cancelled';
create index registrations_event_status_idx on public.registrations(event_id, status);
create index registrations_event_registered_idx on public.registrations(event_id, registered_at desc);
create index registrations_event_checkin_idx on public.registrations(event_id, checked_in_at);
create index registrations_name_search_idx on public.registrations(event_id, lower(full_name));

create table public.checkin_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  registration_id uuid references public.registrations(id) on delete set null,
  operator_id uuid references auth.users(id) on delete set null,
  method public.checkin_method not null,
  result text not null,
  device_info jsonb not null default '{}'::jsonb,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index checkin_logs_event_created_idx on public.checkin_logs(event_id, created_at desc);

create table public.email_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  registration_id uuid references public.registrations(id) on delete set null,
  email_type text not null,
  provider_message_id text,
  recipient citext not null,
  status public.email_delivery_status not null default 'pending',
  error_message text,
  attempt_count integer not null default 1 check (attempt_count > 0),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index email_logs_registration_idx on public.email_logs(registration_id, created_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_event_created_idx on public.audit_logs(event_id, created_at desc);

create table public.rate_limit_entries (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  key_hash text not null,
  window_started_at timestamptz not null,
  attempts integer not null default 1,
  expires_at timestamptz not null,
  unique (scope, key_hash, window_started_at)
);
create index rate_limit_expiry_idx on public.rate_limit_entries(expires_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger events_set_updated_at before update on public.events
for each row execute function public.set_updated_at();
create trigger registrations_set_updated_at before update on public.registrations
for each row execute function public.set_updated_at();
create trigger email_logs_set_updated_at before update on public.email_logs
for each row execute function public.set_updated_at();
