alter table public.events
  add column if not exists whatsapp_template_name text,
  add column if not exists whatsapp_template_language text not null default 'pt_BR';

alter table public.events
  drop constraint if exists events_whatsapp_template_name_check;
alter table public.events
  add constraint events_whatsapp_template_name_check
  check (
    whatsapp_template_name is null
    or whatsapp_template_name ~ '^[a-z0-9_]{1,512}$'
  );

create table if not exists public.whatsapp_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  registration_id uuid references public.registrations(id) on delete set null,
  message_type text not null,
  recipient text not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_logs_event_created_idx
  on public.whatsapp_logs(event_id, created_at desc);
create index if not exists whatsapp_logs_registration_idx
  on public.whatsapp_logs(registration_id, created_at desc);
create unique index if not exists whatsapp_logs_event_reminder_once_idx
  on public.whatsapp_logs(event_id, registration_id, message_type)
  where status in ('pending', 'sent');

alter table public.whatsapp_logs enable row level security;

drop trigger if exists whatsapp_logs_set_updated_at on public.whatsapp_logs;
create trigger whatsapp_logs_set_updated_at
before update on public.whatsapp_logs
for each row execute function public.set_updated_at();

comment on table public.whatsapp_logs is
  'Histórico privado de mensagens transacionais enviadas pela WhatsApp Cloud API.';
