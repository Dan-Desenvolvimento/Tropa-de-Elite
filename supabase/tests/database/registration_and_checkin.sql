begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(27);

select ok(
  has_table_privilege('service_role', 'public.profiles', 'SELECT,UPDATE'),
  'service_role possui acesso SQL para as APIs administrativas'
);

select ok(
  has_table_privilege('authenticated', 'public.events', 'SELECT,INSERT,UPDATE,DELETE'),
  'authenticated possui grants e continua limitado pelas políticas RLS'
);

select is(
  public.consume_rate_limit('database_test', 'same-client', 1, 60)->>'allowed',
  'true',
  'primeira tentativa do rate limit é permitida'
);

select is(
  public.consume_rate_limit('database_test', 'same-client', 1, 60)->>'allowed',
  'false',
  'tentativa acima do limite é bloqueada'
);

insert into public.events (
  id, name, slug, start_at, venue_name, address, city, capacity,
  waitlist_enabled, registration_status, privacy_policy_url
) values (
  '10000000-0000-0000-0000-000000000001',
  'Evento de teste',
  'evento-de-teste',
  now() + interval '10 days',
  'Auditório',
  'Rua Teste, 1',
  'Vitória da Conquista',
  1,
  true,
  'open',
  'https://example.com/privacidade'
);

select ok(
  (public.create_event_registration(
    '10000000-0000-0000-0000-000000000001',
    'Maria da Silva', 'maria@example.com', '77999998888', 'Vitória da Conquista',
    '{}'::jsonb, true, false
  )->>'success')::boolean,
  'inscrição válida é criada'
);

select is(
  (select status::text from public.registrations where email = 'maria@example.com'),
  'confirmed',
  'primeira inscrição é confirmada'
);

select is(
  public.create_event_registration(
    '10000000-0000-0000-0000-000000000001',
    'Maria Duplicada', 'maria@example.com', '77911112222', 'Vitória da Conquista',
    '{}'::jsonb, true, false
  )->>'code',
  'DUPLICATE_REGISTRATION',
  'e-mail duplicado é bloqueado'
);

select is(
  (select count(*)::integer from public.registrations where event_id = '10000000-0000-0000-0000-000000000001'),
  1,
  'duplicidade não cria uma segunda linha'
);

select is(
  public.create_event_registration(
    '10000000-0000-0000-0000-000000000001',
    'João da Silva', 'joao@example.com', '77988887777', 'Vitória da Conquista',
    '{}'::jsonb, true, false
  )->>'status',
  'waitlist',
  'inscrição além da capacidade entra na lista de espera'
);

select is(
  (select count(*)::integer from public.registrations where event_id = '10000000-0000-0000-0000-000000000001' and status = 'confirmed'),
  1,
  'capacidade confirmada não é ultrapassada'
);

select is(
  (select count(*)::integer from public.registrations where event_id = '10000000-0000-0000-0000-000000000001' and status = 'waitlist'),
  1,
  'lista de espera contém o excedente'
);

select ok(
  (select ticket_token not like '%maria%' and ticket_token not like '%@%' from public.registrations where email = 'maria@example.com'),
  'token do QR Code não contém dados pessoais'
);

insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '20000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'operador@example.com',
  '{}'::jsonb, '{"full_name":"Operador Teste"}'::jsonb, now(), now()
);

insert into public.event_staff (event_id, user_id, role)
values (
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'checkin_operator'
);

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);

select is(
  public.lookup_event_ticket(
    '10000000-0000-0000-0000-000000000001',
    (select ticket_token from public.registrations where email = 'maria@example.com')
  )->>'code',
  'TICKET_FOUND',
  'operador autorizado localiza ingresso'
);

select is(
  public.process_event_checkin(
    '10000000-0000-0000-0000-000000000001',
    (select ticket_token from public.registrations where email = 'maria@example.com'),
    'qr', false, '{}'::jsonb, null
  )->>'code',
  'CHECKIN_SUCCESS',
  'primeira leitura registra entrada'
);

select is(
  (select count(*)::integer from public.registrations where checked_in_at is not null and email = 'maria@example.com'),
  1,
  'check-in foi persistido'
);

select is(
  public.process_event_checkin(
    '10000000-0000-0000-0000-000000000001',
    (select ticket_token from public.registrations where email = 'maria@example.com'),
    'qr', false, '{}'::jsonb, null
  )->>'code',
  'ALREADY_CHECKED_IN',
  'segunda leitura é identificada'
);

select is(
  (select count(*)::integer from public.registrations where checked_in_at is not null and email = 'maria@example.com'),
  1,
  'segunda leitura não cria nova entrada'
);

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);

select is(
  public.lookup_event_ticket(
    '10000000-0000-0000-0000-000000000001',
    (select ticket_token from public.registrations where email = 'maria@example.com')
  )->>'code',
  'UNAUTHORIZED',
  'usuário sem vínculo não pode consultar ingresso'
);

update public.profiles
set global_role = 'admin'
where id = '20000000-0000-0000-0000-000000000001';
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);

select is(
  (
    select listed.full_name
    from public.list_event_registrations_admin(
      '10000000-0000-0000-0000-000000000001', '', null, 0, 1, 'name_asc'
    ) listed
  ),
  'João da Silva',
  'lista administrativa respeita ordenação por nome'
);

select is(
  public.lookup_event_ticket(
    '10000000-0000-0000-0000-000000000001',
    'TOKEN-INEXISTENTE'
  )->>'code',
  'INVALID_TOKEN',
  'QR Code inválido não localiza cadastro'
);

select is(
  public.process_event_checkin(
    '10000000-0000-0000-0000-000000000001',
    (select ticket_token from public.registrations where email = 'joao@example.com'),
    'qr', false, '{}'::jsonb, null
  )->>'code',
  'WAITLIST_REGISTRATION',
  'participante em lista de espera não entra automaticamente'
);

update public.registrations
set status = 'cancelled', cancelled_at = now(), cancellation_reason = 'Teste automatizado'
where email = 'joao@example.com';

select is(
  public.process_event_checkin(
    '10000000-0000-0000-0000-000000000001',
    (select ticket_token from public.registrations where email = 'joao@example.com'),
    'qr', false, '{}'::jsonb, null
  )->>'code',
  'CANCELLED_REGISTRATION',
  'inscrição cancelada não pode fazer check-in'
);

insert into public.registrations (
  event_id, full_name, email, phone, city, custom_answers,
  privacy_consent, privacy_policy_version, communications_consent,
  status, ticket_code, ticket_token
) values (
  '10000000-0000-0000-0000-000000000001', 'Check-in Manual',
  'manual@example.com', '77977776666', 'Salvador', '{}'::jsonb,
  true, '1.0', false, 'confirmed', 'TDE-MANUAL', 'TOKEN-MANUAL'
);

select is(
  public.process_event_checkin(
    '10000000-0000-0000-0000-000000000001',
    'TDE-MANUAL', 'manual', false, '{}'::jsonb, null
  )->>'code',
  'CHECKIN_SUCCESS',
  'check-in manual é aceito para operador autorizado'
);

select is(
  (select checkin_method::text from public.registrations where email = 'manual@example.com'),
  'manual',
  'método manual é persistido na inscrição'
);

insert into public.registrations (
  event_id, full_name, email, phone, city, custom_answers,
  privacy_consent, privacy_policy_version, communications_consent,
  status, ticket_code, ticket_token
) values (
  '10000000-0000-0000-0000-000000000001', 'Evento Encerrado',
  'encerrado@example.com', '77966665555', 'Salvador', '{}'::jsonb,
  true, '1.0', false, 'confirmed', 'TDE-CLOSED', 'TOKEN-CLOSED'
);
update public.events set registration_status = 'finished' where id = '10000000-0000-0000-0000-000000000001';

select is(
  public.process_event_checkin(
    '10000000-0000-0000-0000-000000000001',
    'TOKEN-CLOSED', 'qr', false, '{}'::jsonb, null
  )->>'code',
  'EVENT_CLOSED',
  'evento encerrado bloqueia check-in'
);
update public.events set registration_status = 'open' where id = '10000000-0000-0000-0000-000000000001';

insert into public.events (
  id, name, slug, start_at, venue_name, address, city, capacity,
  waitlist_enabled, registration_status, privacy_policy_url
) values (
  '10000000-0000-0000-0000-000000000002', 'Evento capacidade 300',
  'evento-capacidade-300', now() + interval '20 days', 'Auditório',
  'Rua Teste, 2', 'Salvador', 300, true, 'open', 'https://example.com/privacidade'
);

insert into public.registrations (
  event_id, full_name, email, phone, city, custom_answers,
  privacy_consent, privacy_policy_version, communications_consent,
  status, ticket_code, ticket_token
)
select
  '10000000-0000-0000-0000-000000000002', 'Participante ' || series,
  'capacidade' || series || '@example.com', '77' || lpad(series::text, 9, '0'),
  'Salvador', '{}'::jsonb, true, '1.0', false, 'confirmed',
  'CAP-' || lpad(series::text, 6, '0'), 'TOKEN-CAP-' || series
from generate_series(1, 300) series;

select is(
  public.create_event_registration(
    '10000000-0000-0000-0000-000000000002',
    'Participante 301', 'capacidade301@example.com', '77999990001', 'Salvador',
    '{}'::jsonb, true, false
  )->>'status',
  'waitlist',
  'inscrição número 301 entra na lista de espera'
);

select is(
  (select count(*)::integer from public.registrations where event_id = '10000000-0000-0000-0000-000000000002' and status = 'confirmed'),
  300,
  'capacidade de 300 confirma exatamente 300 participantes'
);

select * from finish();
rollback;
