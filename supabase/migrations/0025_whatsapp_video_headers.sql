alter table public.event_whatsapp_messages
  drop constraint if exists event_whatsapp_messages_header_kind_check;

alter table public.event_whatsapp_messages
  add constraint event_whatsapp_messages_header_kind_check
  check (header_kind in ('none', 'image', 'video'));

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
  16777216,
  array['image/jpeg', 'image/png', 'video/mp4']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on column public.event_whatsapp_messages.header_kind is
  'Cabeçalho aprovado no modelo da Meta: sem mídia, imagem ou vídeo.';

create table if not exists public.whatsapp_media_uploads (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  object_path text not null unique check (
    object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|mp4)$'
  ),
  media_kind text not null check (media_kind in ('image', 'video')),
  expected_mime_type text not null check (
    expected_mime_type in ('image/jpeg', 'image/png', 'video/mp4')
  ),
  expected_size integer not null check (expected_size between 1 and 16777216),
  status text not null default 'prepared' check (status in ('prepared', 'finalized')),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  finalized_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_media_uploads_pending_idx
  on public.whatsapp_media_uploads(requested_by, event_id, created_at desc)
  where status = 'prepared';

alter table public.whatsapp_media_uploads enable row level security;

revoke all on table public.whatsapp_media_uploads from public, anon, authenticated;

comment on table public.whatsapp_media_uploads is
  'Autorizações curtas para upload direto de mídias WhatsApp no Storage.';

notify pgrst, 'reload schema';
