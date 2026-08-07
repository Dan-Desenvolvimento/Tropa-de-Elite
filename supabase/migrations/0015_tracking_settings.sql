create table if not exists public.app_tracking_settings (
  id boolean primary key default true check (id),
  meta_pixel_id text,
  meta_api_access_token text,
  meta_api_enabled boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.app_tracking_settings enable row level security;

create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name in ('page_view', 'cta_click', 'registration_completed', 'ticket_view')),
  source text not null check (source in ('site', 'form')),
  path text not null check (char_length(path) between 1 and 500),
  event_id uuid references public.events(id) on delete set null,
  registration_id uuid references public.registrations(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.tracking_events enable row level security;

create index if not exists tracking_events_created_at_idx on public.tracking_events (created_at desc);
create index if not exists tracking_events_event_name_idx on public.tracking_events (event_name, source, created_at desc);
create index if not exists tracking_events_event_id_idx on public.tracking_events (event_id, created_at desc);

comment on table public.app_tracking_settings is 'Configuração privada de pixels e API de conversões; acesso somente pelo service role.';
comment on table public.tracking_events is 'Eventos agregáveis de navegação e conversão, sem armazenamento de IP.';
