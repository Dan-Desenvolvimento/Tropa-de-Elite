create or replace function public.get_event_dashboard_summaries()
returns table (
  event_id uuid,
  event_name text,
  event_slug text,
  event_status public.event_status,
  start_at timestamptz,
  is_future boolean,
  capacity integer,
  confirmed_count bigint,
  waitlist_count bigint,
  cancelled_count bigint,
  checkin_count bigint,
  email_sent_count bigint,
  email_failed_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.id,
    e.name,
    e.slug::text,
    e.registration_status,
    e.start_at,
    e.start_at > now(),
    e.capacity,
    count(r.id) filter (where r.status = 'confirmed'),
    count(r.id) filter (where r.status = 'waitlist'),
    count(r.id) filter (where r.status = 'cancelled'),
    count(r.id) filter (where r.checked_in_at is not null),
    (select count(*) from public.email_logs el where el.event_id = e.id and el.status = 'sent'),
    (select count(*) from public.email_logs el where el.event_id = e.id and el.status = 'failed')
  from public.events e
  left join public.registrations r on r.event_id = e.id
  where public.has_event_role(
    e.id,
    array['admin', 'checkin_operator']::public.staff_role[]
  )
  group by e.id;
$$;

revoke all on function public.get_event_dashboard_summaries() from public, anon;
grant execute on function public.get_event_dashboard_summaries() to authenticated;

create or replace function public.search_event_registrations(
  target_event_id uuid,
  search_term text,
  result_limit integer default 20
)
returns table (
  registration_id uuid,
  full_name text,
  masked_email text,
  masked_phone text,
  ticket_code text,
  registration_status public.registration_status,
  checked_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_event_role(
    target_event_id,
    array['admin', 'checkin_operator']::public.staff_role[]
  ) then
    raise exception 'UNAUTHORIZED';
  end if;

  return query
  select
    r.id,
    r.full_name,
    case
      when position('@' in r.email::text) > 2 then
        left(r.email::text, 2) || '***' || substring(r.email::text from position('@' in r.email::text))
      else '***'
    end,
    case
      when length(r.phone) >= 4 then '(**) *****-' || right(r.phone, 4)
      else '***'
    end,
    r.ticket_code,
    r.status,
    r.checked_in_at
  from public.registrations r
  where r.event_id = target_event_id
    and (
      search_term is null
      or trim(search_term) = ''
      or lower(r.full_name) like '%' || lower(trim(search_term)) || '%'
      or lower(r.email::text) = lower(trim(search_term))
      or (
        length(regexp_replace(search_term, '[^0-9]', '', 'g')) >= 3
        and r.phone like '%' || regexp_replace(search_term, '[^0-9]', '', 'g') || '%'
      )
      or r.ticket_code = upper(trim(search_term))
    )
  order by r.full_name
  limit least(greatest(result_limit, 1), 50);
end;
$$;

revoke all on function public.search_event_registrations(uuid, text, integer) from public, anon;
grant execute on function public.search_event_registrations(uuid, text, integer) to authenticated;
