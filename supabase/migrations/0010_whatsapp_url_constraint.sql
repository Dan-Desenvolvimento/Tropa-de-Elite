begin;

alter table public.events
  drop constraint if exists valid_whatsapp_url;

alter table public.events
  add constraint valid_whatsapp_url check (
    whatsapp_group_url is null
    or whatsapp_group_url ~* '^https://(chat[.]whatsapp[.]com|wa[.]me)/[^[:space:]]+$'
  );

comment on constraint valid_whatsapp_url on public.events
  is 'Aceita links HTTPS de convite do WhatsApp e links wa.me.';

commit;
