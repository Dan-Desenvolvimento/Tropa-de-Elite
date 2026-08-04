create or replace function public.is_global_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active and p.global_role = 'admin'
  );
$$;

create or replace function public.has_event_role(target_event_id uuid, allowed_roles public.staff_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_global_admin() or exists (
    select 1
    from public.event_staff es
    join public.profiles p on p.id = es.user_id and p.active
    where es.event_id = target_event_id
      and es.user_id = auth.uid()
      and es.role = any(allowed_roles)
  );
$$;

create or replace function public.create_event_registration(
  target_event_id uuid,
  participant_name text,
  participant_email text,
  participant_phone text,
  participant_city text,
  answers jsonb,
  accepted_privacy boolean,
  accepted_communications boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_event public.events%rowtype;
  confirmed_count integer;
  final_status public.registration_status;
  new_registration public.registrations%rowtype;
  normalized_email public.citext := lower(trim(participant_email))::public.citext;
  normalized_phone text := regexp_replace(participant_phone, '[^0-9]', '', 'g');
  generated_token text;
  generated_code text;
begin
  if not accepted_privacy then
    return jsonb_build_object('success', false, 'code', 'PRIVACY_CONSENT_REQUIRED');
  end if;

  select * into selected_event
  from public.events
  where id = target_event_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'code', 'EVENT_NOT_FOUND');
  end if;

  if selected_event.registration_status <> 'open'
    or (selected_event.registration_open_at is not null and now() < selected_event.registration_open_at)
    or (selected_event.registration_close_at is not null and now() > selected_event.registration_close_at) then
    return jsonb_build_object('success', false, 'code', 'REGISTRATION_CLOSED');
  end if;

  if exists (
    select 1 from public.registrations r
    where r.event_id = target_event_id
      and (r.email = normalized_email or r.phone = normalized_phone)
      and r.status <> 'cancelled'
  ) then
    return jsonb_build_object('success', false, 'code', 'DUPLICATE_REGISTRATION');
  end if;

  select count(*) into confirmed_count
  from public.registrations r
  where r.event_id = target_event_id and r.status = 'confirmed';

  if selected_event.capacity is null or confirmed_count < selected_event.capacity then
    final_status := 'confirmed';
  elsif selected_event.waitlist_enabled then
    final_status := 'waitlist';
  else
    return jsonb_build_object('success', false, 'code', 'EVENT_SOLD_OUT');
  end if;

  generated_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  loop
    generated_code := 'TDE-' || upper(substr(encode(extensions.gen_random_bytes(5), 'hex'), 1, 6));
    exit when not exists (
      select 1 from public.registrations r
      where r.event_id = target_event_id and r.ticket_code = generated_code
    );
  end loop;

  insert into public.registrations (
    event_id, full_name, email, phone, city, custom_answers,
    privacy_consent, privacy_policy_version, communications_consent,
    status, ticket_code, ticket_token
  ) values (
    target_event_id, trim(participant_name), normalized_email, normalized_phone,
    trim(participant_city), coalesce(answers, '{}'::jsonb), true,
    selected_event.privacy_policy_version, accepted_communications,
    final_status, generated_code, generated_token
  ) returning * into new_registration;

  if selected_event.capacity is not null
    and final_status = 'confirmed'
    and confirmed_count + 1 >= selected_event.capacity then
    update public.events
    set registration_status = case when waitlist_enabled then registration_status else 'sold_out' end
    where id = target_event_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'registration_id', new_registration.id,
    'status', new_registration.status,
    'ticket_token', new_registration.ticket_token,
    'ticket_code', new_registration.ticket_code
  );
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'code', 'DUPLICATE_REGISTRATION');
end;
$$;

create or replace function public.process_event_checkin(
  target_event_id uuid,
  ticket_value text,
  requested_method public.checkin_method default 'qr',
  allow_waitlist boolean default false,
  device_metadata jsonb default '{}'::jsonb,
  request_ip_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_registration public.registrations%rowtype;
  event_state public.event_status;
  result_code text;
  effective_checkin_at timestamptz;
  effective_operator_name text;
begin
  select * into target_registration
  from public.registrations r
  where r.event_id = target_event_id
    and (r.ticket_token = ticket_value or r.ticket_code = upper(trim(ticket_value)))
  for update;

  if not found then
    return jsonb_build_object('success', false, 'code', 'INVALID_TOKEN');
  end if;

  if not public.has_event_role(
    target_registration.event_id,
    array['admin', 'checkin_operator']::public.staff_role[]
  ) then
    return jsonb_build_object('success', false, 'code', 'UNAUTHORIZED');
  end if;

  select registration_status into event_state
  from public.events where id = target_registration.event_id;

  if event_state in ('finished', 'cancelled') then
    result_code := 'EVENT_CLOSED';
  elsif target_registration.status = 'cancelled' then
    result_code := 'CANCELLED_REGISTRATION';
  elsif target_registration.status = 'waitlist' and (
    not allow_waitlist
    or not public.has_event_role(target_event_id, array['admin']::public.staff_role[])
  ) then
    result_code := 'WAITLIST_REGISTRATION';
  elsif target_registration.checked_in_at is not null then
    result_code := 'ALREADY_CHECKED_IN';
    effective_checkin_at := target_registration.checked_in_at;
    select p.full_name into effective_operator_name
    from public.profiles p where p.id = target_registration.checked_in_by;
  else
    effective_checkin_at := now();
    update public.registrations
    set
      status = case when status = 'waitlist' then 'confirmed' else status end,
      checked_in_at = effective_checkin_at,
      checked_in_by = auth.uid(),
      checkin_method = requested_method
    where id = target_registration.id;
    select p.full_name into effective_operator_name
    from public.profiles p where p.id = auth.uid();
    result_code := 'CHECKIN_SUCCESS';
  end if;

  insert into public.checkin_logs (
    event_id, registration_id, operator_id, method, result, device_info, ip_hash
  ) values (
    target_registration.event_id, target_registration.id, auth.uid(),
    requested_method, result_code, coalesce(device_metadata, '{}'::jsonb), request_ip_hash
  );

  return jsonb_build_object(
    'success', result_code = 'CHECKIN_SUCCESS',
    'code', result_code,
    'registration_id', target_registration.id,
    'full_name', target_registration.full_name,
    'ticket_code', target_registration.ticket_code,
    'checked_in_at', effective_checkin_at,
    'checked_in_by_name', effective_operator_name
  );
end;
$$;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_staff enable row level security;
alter table public.registrations enable row level security;
alter table public.checkin_logs enable row level security;
alter table public.email_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.rate_limit_entries enable row level security;

create policy profiles_self_read on public.profiles
for select to authenticated using (id = auth.uid() or public.is_global_admin());
create policy profiles_admin_manage on public.profiles
for all to authenticated using (public.is_global_admin()) with check (public.is_global_admin());

create policy events_staff_read on public.events
for select to authenticated using (
  public.has_event_role(id, array['admin', 'checkin_operator']::public.staff_role[])
);
create policy events_admin_manage on public.events
for all to authenticated using (
  public.has_event_role(id, array['admin']::public.staff_role[])
) with check (
  public.is_global_admin() or public.has_event_role(id, array['admin']::public.staff_role[])
);

create policy event_staff_read on public.event_staff
for select to authenticated using (
  user_id = auth.uid() or public.has_event_role(event_id, array['admin']::public.staff_role[])
);
create policy event_staff_admin_manage on public.event_staff
for all to authenticated using (
  public.has_event_role(event_id, array['admin']::public.staff_role[])
) with check (
  public.has_event_role(event_id, array['admin']::public.staff_role[])
);

create policy registrations_admin_read on public.registrations
for select to authenticated using (
  public.has_event_role(event_id, array['admin']::public.staff_role[])
);
create policy registrations_admin_update on public.registrations
for update to authenticated using (
  public.has_event_role(event_id, array['admin']::public.staff_role[])
) with check (
  public.has_event_role(event_id, array['admin']::public.staff_role[])
);

create policy checkin_logs_staff_read on public.checkin_logs
for select to authenticated using (
  public.has_event_role(event_id, array['admin', 'checkin_operator']::public.staff_role[])
);
create policy email_logs_admin_read on public.email_logs
for select to authenticated using (
  public.has_event_role(event_id, array['admin']::public.staff_role[])
);
create policy audit_logs_admin_read on public.audit_logs
for select to authenticated using (
  public.has_event_role(event_id, array['admin']::public.staff_role[])
);

revoke all on function public.create_event_registration(uuid, text, text, text, text, jsonb, boolean, boolean) from public, anon, authenticated;
grant execute on function public.create_event_registration(uuid, text, text, text, text, jsonb, boolean, boolean) to service_role;

revoke all on function public.process_event_checkin(uuid, text, public.checkin_method, boolean, jsonb, text) from public, anon;
grant execute on function public.process_event_checkin(uuid, text, public.checkin_method, boolean, jsonb, text) to authenticated;

revoke all on function public.is_global_admin() from public, anon;
grant execute on function public.is_global_admin() to authenticated;
revoke all on function public.has_event_role(uuid, public.staff_role[]) from public, anon;
grant execute on function public.has_event_role(uuid, public.staff_role[]) to authenticated;
