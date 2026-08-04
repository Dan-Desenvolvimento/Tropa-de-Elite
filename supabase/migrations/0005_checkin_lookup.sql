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
    return jsonb_build_object('success', false, 'code', 'UNAUTHORIZED');
  end if;

  select * into target_registration
  from public.registrations r
  where r.event_id = target_event_id
    and (r.ticket_token = ticket_value or r.ticket_code = upper(trim(ticket_value)));

  if not found then
    return jsonb_build_object('success', false, 'code', 'INVALID_TOKEN');
  end if;

  if target_registration.checked_in_by is not null then
    select p.full_name into operator_name
    from public.profiles p where p.id = target_registration.checked_in_by;
  end if;

  return jsonb_build_object(
    'success', true,
    'code', case
      when target_registration.status = 'cancelled' then 'CANCELLED_REGISTRATION'
      when target_registration.status = 'waitlist' then 'WAITLIST_REGISTRATION'
      when target_registration.checked_in_at is not null then 'ALREADY_CHECKED_IN'
      else 'TICKET_FOUND'
    end,
    'registration_id', target_registration.id,
    'full_name', target_registration.full_name,
    'ticket_code', target_registration.ticket_code,
    'registration_status', target_registration.status,
    'checked_in_at', target_registration.checked_in_at,
    'checked_in_by_name', operator_name
  );
end;
$$;

revoke all on function public.lookup_event_ticket(uuid, text) from public, anon;
grant execute on function public.lookup_event_ticket(uuid, text) to authenticated;
