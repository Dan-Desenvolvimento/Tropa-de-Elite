alter table public.tracking_events
  drop constraint if exists tracking_events_event_name_check;

alter table public.tracking_events
  add constraint tracking_events_event_name_check
  check (event_name in ('page_view', 'form_started', 'cta_click', 'registration_completed', 'ticket_view'));

comment on column public.tracking_events.metadata is
  'Metadados do funil e atribuição de marketing. Não armazenar segredos ou dados sensíveis sem necessidade.';
