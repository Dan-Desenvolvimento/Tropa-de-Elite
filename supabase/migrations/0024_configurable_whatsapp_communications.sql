create table if not exists public.event_whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 3 and 80),
  description text check (description is null or char_length(description) <= 240),
  template_name text not null check (
    char_length(template_name) between 1 and 512
    and template_name ~ '^[a-z0-9_]+$'
  ),
  template_language text not null default 'pt_BR'
    check (template_language ~ '^[a-z]{2,3}(_[A-Z]{2})?$'),
  preview_body text not null default '' check (char_length(preview_body) <= 4096),
  header_kind text not null default 'none' check (header_kind in ('none', 'image')),
  header_media_url text check (
    header_media_url is null
    or header_media_url ~ '^/[A-Za-z0-9/_.-]+$'
    or (
      header_media_url ~ '^https://'
      and header_media_url !~ '[[:space:]]'
      and header_media_url !~ '^https://[^/]*@'
    )
  ),
  body_variables jsonb not null default '[]'::jsonb check (jsonb_typeof(body_variables) = 'array'),
  button_config jsonb not null default '{"mode":"none"}'::jsonb check (jsonb_typeof(button_config) = 'object'),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, display_name),
  unique (event_id, template_name, template_language)
);

create index if not exists event_whatsapp_messages_event_idx
  on public.event_whatsapp_messages(event_id, active desc, sort_order, created_at);

alter table public.event_whatsapp_messages enable row level security;

create policy event_whatsapp_messages_read
on public.event_whatsapp_messages
for select
to authenticated
using (
  public.has_event_permission(event_id, 'edit_event')
  or public.has_event_permission(event_id, 'manage_registrations')
  or public.has_event_permission(event_id, 'view_reports')
);

create policy event_whatsapp_messages_edit
on public.event_whatsapp_messages
for all
to authenticated
using (public.has_event_permission(event_id, 'edit_event'))
with check (public.has_event_permission(event_id, 'edit_event'));

drop trigger if exists event_whatsapp_messages_set_updated_at on public.event_whatsapp_messages;
create trigger event_whatsapp_messages_set_updated_at
before update on public.event_whatsapp_messages
for each row execute function public.set_updated_at();

create table if not exists public.whatsapp_dispatches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  message_config_id uuid references public.event_whatsapp_messages(id) on delete set null,
  registration_id uuid references public.registrations(id) on delete set null,
  scope text not null check (scope in ('bulk', 'test', 'individual')),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'partial', 'failed', 'cancelled')),
  idempotency_key uuid not null unique,
  config_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(config_snapshot) = 'object'),
  target_registration_ids uuid[] not null default '{}'::uuid[]
    check (cardinality(target_registration_ids) <= 10000),
  eligible_count integer not null default 0 check (eligible_count >= 0),
  processed_count integer not null default 0 check (processed_count >= 0),
  sent_count integer not null default 0 check (sent_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  invalid_phone_count integer not null default 0 check (invalid_phone_count >= 0),
  requested_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  finished_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_dispatches_event_created_idx
  on public.whatsapp_dispatches(event_id, created_at desc);
create index if not exists whatsapp_dispatches_config_created_idx
  on public.whatsapp_dispatches(message_config_id, created_at desc)
  where message_config_id is not null;
create index if not exists whatsapp_dispatches_recovery_idx
  on public.whatsapp_dispatches(status, lease_expires_at)
  where status in ('queued', 'processing');
create unique index if not exists whatsapp_dispatches_one_bulk_running_idx
  on public.whatsapp_dispatches(event_id, message_config_id)
  where scope = 'bulk' and status in ('queued', 'processing');

alter table public.whatsapp_dispatches enable row level security;

create policy whatsapp_dispatches_read
on public.whatsapp_dispatches
for select
to authenticated
using (
  public.has_event_permission(event_id, 'edit_event')
  or public.has_event_permission(event_id, 'manage_registrations')
  or public.has_event_permission(event_id, 'view_reports')
);

create policy whatsapp_dispatches_create
on public.whatsapp_dispatches
for insert
to authenticated
with check (
  public.has_event_permission(event_id, 'manage_registrations')
  and requested_by = auth.uid()
);

drop trigger if exists whatsapp_dispatches_set_updated_at on public.whatsapp_dispatches;
create trigger whatsapp_dispatches_set_updated_at
before update on public.whatsapp_dispatches
for each row execute function public.set_updated_at();

create or replace function public.prevent_running_whatsapp_message_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.whatsapp_dispatches d
    where d.message_config_id = old.id
      and d.status in ('queued', 'processing')
  ) then
    raise exception 'A comunicação possui um envio em andamento.'
      using errcode = '55000';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists event_whatsapp_messages_block_running_changes
  on public.event_whatsapp_messages;
create trigger event_whatsapp_messages_block_running_changes
before update or delete on public.event_whatsapp_messages
for each row execute function public.prevent_running_whatsapp_message_changes();

alter table public.whatsapp_logs
  add column if not exists dispatch_id uuid references public.whatsapp_dispatches(id) on delete set null,
  add column if not exists message_config_id uuid references public.event_whatsapp_messages(id) on delete set null,
  add column if not exists template_name text,
  add column if not exists template_language text,
  add column if not exists payload_snapshot jsonb;

create policy whatsapp_logs_read
on public.whatsapp_logs
for select
to authenticated
using (
  public.has_event_permission(event_id, 'manage_registrations')
  or public.has_event_permission(event_id, 'view_reports')
  or public.has_event_permission(event_id, 'view_logs')
);

alter table public.whatsapp_logs
  drop constraint if exists whatsapp_logs_payload_snapshot_object_check;
alter table public.whatsapp_logs
  add constraint whatsapp_logs_payload_snapshot_object_check
  check (payload_snapshot is null or jsonb_typeof(payload_snapshot) = 'object');

drop index if exists public.whatsapp_logs_event_reminder_once_idx;
create unique index if not exists whatsapp_logs_legacy_once_idx
  on public.whatsapp_logs(event_id, registration_id, message_type)
  where dispatch_id is null and status in ('pending', 'sent', 'delivered', 'read');
create unique index if not exists whatsapp_logs_dispatch_registration_idx
  on public.whatsapp_logs(dispatch_id, registration_id)
  where dispatch_id is not null and registration_id is not null;
create index if not exists whatsapp_logs_dispatch_idx
  on public.whatsapp_logs(dispatch_id, created_at)
  where dispatch_id is not null;

insert into public.event_whatsapp_messages (
  event_id,
  display_name,
  description,
  template_name,
  template_language,
  preview_body,
  header_kind,
  header_media_url,
  body_variables,
  button_config,
  active,
  sort_order,
  created_by
)
select
  e.id,
  'Lembrete com ingresso',
  'Modelo já utilizado para enviar o ingresso individual aos participantes.',
  e.whatsapp_template_name,
  e.whatsapp_template_language,
  E'Olá, {{1}}!\n\nEste é um lembrete referente à sua inscrição confirmada no evento {{2}}.\n\nData: {{3}}\nHorário: {{4}}\nLocal: {{5}}\n\nSeu ingresso individual está disponível no botão abaixo.',
  'image',
  '/cabecalho-whatsapp-evento.png',
  jsonb_build_array(
    jsonb_build_object('position', 1, 'source', 'participant.first_name'),
    jsonb_build_object('position', 2, 'source', 'event.name'),
    jsonb_build_object('position', 3, 'source', 'event.date_long'),
    jsonb_build_object('position', 4, 'source', 'event.time'),
    jsonb_build_object('position', 5, 'source', 'event.full_location')
  ),
  jsonb_build_object(
    'mode', 'dynamic',
    'index', 0,
    'source', 'participant.ticket_path',
    'transform', 'leading_slash',
    'baseUrl', 'https://tropa.filipezetech.com/ingresso',
    'label', 'ACESSAR MEU INGRESSO'
  ),
  true,
  0,
  e.created_by
from public.events e
where e.whatsapp_template_name is not null
on conflict (event_id, template_name, template_language) do nothing;

comment on table public.event_whatsapp_messages is
  'Modelos configuráveis do WhatsApp vinculados a cada evento.';
comment on table public.whatsapp_dispatches is
  'Cada solicitação de teste, envio individual ou envio em massa pelo WhatsApp.';

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'whatsapp-media',
  'whatsapp-media',
  true,
  5242880,
  array['image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';
