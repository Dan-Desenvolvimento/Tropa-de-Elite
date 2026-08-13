alter table public.whatsapp_logs
  drop constraint if exists whatsapp_logs_status_check;

alter table public.whatsapp_logs
  add constraint whatsapp_logs_status_check
  check (status in ('pending', 'sent', 'delivered', 'read', 'failed'));

alter table public.whatsapp_logs
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz;

create index if not exists whatsapp_logs_provider_message_idx
  on public.whatsapp_logs(provider_message_id)
  where provider_message_id is not null;

notify pgrst, 'reload schema';
