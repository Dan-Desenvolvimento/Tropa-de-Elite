create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;
set search_path = public, extensions;

select plan(4);

delete from public.events where id = '40000000-0000-0000-0000-000000000002';
delete from auth.users where id = '40000000-0000-0000-0000-000000000001';

begin;
insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '40000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'concorrencia@example.com',
  '{}'::jsonb, '{"full_name":"Operador Concorrência"}'::jsonb, now(), now()
);

insert into public.events (
  id, name, slug, start_at, venue_name, address, city, capacity,
  waitlist_enabled, registration_status, privacy_policy_url
) values (
  '40000000-0000-0000-0000-000000000002', 'Evento concorrência',
  'evento-concorrencia', now() + interval '5 days', 'Auditório',
  'Rua Teste, 4', 'Salvador', 10, false, 'open', 'https://example.com/privacidade'
);

insert into public.event_staff (event_id, user_id, role) values (
  '40000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000001',
  'checkin_operator'
);

insert into public.registrations (
  id, event_id, full_name, email, phone, city, custom_answers,
  privacy_consent, privacy_policy_version, communications_consent,
  status, ticket_code, ticket_token
) values (
  '40000000-0000-0000-0000-000000000003',
  '40000000-0000-0000-0000-000000000002', 'Participante Concorrente',
  'participante.concorrente@example.com', '77955554444', 'Salvador', '{}'::jsonb,
  true, '1.0', false, 'confirmed', 'TDE-RACE', 'TOKEN-RACE'
);
commit;

select extensions.dblink_connect(
  'checkin_a',
  'host=host.docker.internal port=56422 dbname=' || current_database() || ' user=postgres password=postgres'
);
select extensions.dblink_connect(
  'checkin_b',
  'host=host.docker.internal port=56422 dbname=' || current_database() || ' user=postgres password=postgres'
);

select * from extensions.dblink(
  'checkin_a',
  $$select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', false)$$
) as configured(value text);
select * from extensions.dblink(
  'checkin_b',
  $$select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', false)$$
) as configured(value text);

select extensions.dblink_send_query(
  'checkin_a',
  $$select public.process_event_checkin(
    '40000000-0000-0000-0000-000000000002', 'TOKEN-RACE',
    'qr', false, '{"device":"a"}'::jsonb, null
  )$$
);
select extensions.dblink_send_query(
  'checkin_b',
  $$select public.process_event_checkin(
    '40000000-0000-0000-0000-000000000002', 'TOKEN-RACE',
    'qr', false, '{"device":"b"}'::jsonb, null
  )$$
);

create temporary table concurrency_results (result jsonb);
insert into concurrency_results
select result from extensions.dblink_get_result('checkin_a') as response(result jsonb);
insert into concurrency_results
select result from extensions.dblink_get_result('checkin_b') as response(result jsonb);

select is(
  (select count(*) from concurrency_results where result->>'code' = 'CHECKIN_SUCCESS'),
  1::bigint,
  'duas leituras simultâneas produzem exatamente um check-in'
);
select is(
  (select count(*) from concurrency_results where result->>'code' = 'ALREADY_CHECKED_IN'),
  1::bigint,
  'a segunda leitura concorrente é identificada como já utilizada'
);
select ok(
  (select checked_in_at is not null from public.registrations where id = '40000000-0000-0000-0000-000000000003'),
  'entrada concorrente é persistida na inscrição'
);
select is(
  (select count(*) from public.checkin_logs where registration_id = '40000000-0000-0000-0000-000000000003'),
  2::bigint,
  'as duas tentativas concorrentes ficam registradas no log'
);

select extensions.dblink_disconnect('checkin_a');
select extensions.dblink_disconnect('checkin_b');
delete from public.events where id = '40000000-0000-0000-0000-000000000002';
delete from auth.users where id = '40000000-0000-0000-0000-000000000001';

select * from finish();
