alter table public.events
  drop constraint if exists events_whatsapp_template_name_check;

alter table public.events
  add constraint events_whatsapp_template_name_check
  check (
    whatsapp_template_name is null
    or (
      char_length(whatsapp_template_name) between 1 and 512
      and whatsapp_template_name ~ '^[a-z0-9_]+$'
    )
  );

notify pgrst, 'reload schema';
