do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'registrations'
      and column_name = 'job_role'
  ) then
    raise exception
      'Apply the company and job role migration before this update.';
  end if;
end;
$$;

create or replace function public.lookup_event_ticket(
  target_event_id uuid,
  ticket_value text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_registration public.registrations%rowtype;
  operator_name text;
begin
  if not public.has_event_role(
    target_event_id,
    array['admin', 'checkin_operator']::public.staff_role[]
  ) then
    return jsonb_build_object(
      'success',
      false,
      'code',
      'UNAUTHORIZED'
    );
  end if;

  select *
  into target_registration
  from public.registrations r
  where r.event_id = target_event_id
    and (
      r.ticket_token = ticket_value
      or r.ticket_code = upper(trim(ticket_value))
    );

  if not found then
    return jsonb_build_object(
      'success',
      false,
      'code',
      'INVALID_TOKEN'
    );
  end if;

  if target_registration.checked_in_by is not null then
    select p.full_name
    into operator_name
    from public.profiles p
    where p.id = target_registration.checked_in_by;
  end if;

  return jsonb_build_object(
    'success',
    true,
    'code',
    case
      when target_registration.status = 'cancelled'
        then 'CANCELLED_REGISTRATION'
      when target_registration.status = 'waitlist'
        then 'WAITLIST_REGISTRATION'
      when target_registration.checked_in_at is not null
        then 'ALREADY_CHECKED_IN'
      else 'TICKET_FOUND'
    end,
    'registration_id',
    target_registration.id,
    'full_name',
    target_registration.full_name,
    'ticket_code',
    target_registration.ticket_code,
    'registration_status',
    target_registration.status,
    'checked_in_at',
    target_registration.checked_in_at,
    'checked_in_by_name',
    operator_name,
    'company_name',
    target_registration.company_name,
    'job_role',
    target_registration.job_role,
    'job_role_other',
    target_registration.job_role_other,
    'potential_business_owner',
    coalesce(
      target_registration.job_role in (
        'owner',
        'ceo',
        'director'
      ),
      false
    )
  );
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
  select *
  into target_registration
  from public.registrations r
  where r.event_id = target_event_id
    and (
      r.ticket_token = ticket_value
      or r.ticket_code = upper(trim(ticket_value))
    )
  for update;

  if not found then
    return jsonb_build_object(
      'success',
      false,
      'code',
      'INVALID_TOKEN'
    );
  end if;

  if not public.has_event_role(
    target_registration.event_id,
    array['admin', 'checkin_operator']::public.staff_role[]
  ) then
    return jsonb_build_object(
      'success',
      false,
      'code',
      'UNAUTHORIZED'
    );
  end if;

  select registration_status
  into event_state
  from public.events
  where id = target_registration.event_id;

  if event_state in ('finished', 'cancelled') then
    result_code := 'EVENT_CLOSED';
  elsif target_registration.status = 'cancelled' then
    result_code := 'CANCELLED_REGISTRATION';
  elsif target_registration.status = 'waitlist'
    and (
      not allow_waitlist
      or not public.has_event_role(
        target_event_id,
        array['admin']::public.staff_role[]
      )
    ) then
    result_code := 'WAITLIST_REGISTRATION';
  elsif target_registration.checked_in_at is not null then
    result_code := 'ALREADY_CHECKED_IN';
    effective_checkin_at := target_registration.checked_in_at;

    select p.full_name
    into effective_operator_name
    from public.profiles p
    where p.id = target_registration.checked_in_by;
  else
    effective_checkin_at := now();

    update public.registrations
    set
      status = case
        when status = 'waitlist' then 'confirmed'
        else status
      end,
      checked_in_at = effective_checkin_at,
      checked_in_by = auth.uid(),
      checkin_method = requested_method
    where id = target_registration.id;

    select p.full_name
    into effective_operator_name
    from public.profiles p
    where p.id = auth.uid();

    result_code := 'CHECKIN_SUCCESS';
  end if;

  insert into public.checkin_logs (
    event_id,
    registration_id,
    operator_id,
    method,
    result,
    device_info,
    ip_hash
  )
  values (
    target_registration.event_id,
    target_registration.id,
    auth.uid(),
    requested_method,
    result_code,
    coalesce(device_metadata, '{}'::jsonb),
    request_ip_hash
  );

  return jsonb_build_object(
    'success',
    result_code = 'CHECKIN_SUCCESS',
    'code',
    result_code,
    'registration_id',
    target_registration.id,
    'full_name',
    target_registration.full_name,
    'ticket_code',
    target_registration.ticket_code,
    'checked_in_at',
    effective_checkin_at,
    'checked_in_by_name',
    effective_operator_name,
    'company_name',
    target_registration.company_name,
    'job_role',
    target_registration.job_role,
    'job_role_other',
    target_registration.job_role_other,
    'potential_business_owner',
    coalesce(
      target_registration.job_role in (
        'owner',
        'ceo',
        'director'
      ),
      false
    )
  );
end;
$$;

revoke all on function public.lookup_event_ticket(
  uuid,
  text
) from public, anon;

grant execute on function public.lookup_event_ticket(
  uuid,
  text
) to authenticated;

revoke all on function public.process_event_checkin(
  uuid,
  text,
  public.checkin_method,
  boolean,
  jsonb,
  text
) from public, anon;

grant execute on function public.process_event_checkin(
  uuid,
  text,
  public.checkin_method,
  boolean,
  jsonb,
  text
) to authenticated;

notify pgrst, 'reload schema';
