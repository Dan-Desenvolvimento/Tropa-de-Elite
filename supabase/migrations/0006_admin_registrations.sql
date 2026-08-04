create or replace function public.list_event_registrations_admin(
  target_event_id uuid,
  search_term text default '',
  status_filter public.registration_status default null,
  page_offset integer default 0,
  page_limit integer default 25
)
returns table (
  registration_id uuid,
  full_name text,
  email text,
  phone text,
  city text,
  registration_status public.registration_status,
  ticket_code text,
  registered_at timestamptz,
  checked_in_at timestamptz,
  checked_in_by_name text,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_event_role(target_event_id, array['admin']::public.staff_role[]) then
    raise exception 'UNAUTHORIZED';
  end if;

  return query
  with filtered as (
    select r.*
    from public.registrations r
    where r.event_id = target_event_id
      and (status_filter is null or r.status = status_filter)
      and (
        trim(search_term) = ''
        or lower(r.full_name) like '%' || lower(trim(search_term)) || '%'
        or lower(r.email::text) like '%' || lower(trim(search_term)) || '%'
        or (
          length(regexp_replace(search_term, '[^0-9]', '', 'g')) >= 3
          and r.phone like '%' || regexp_replace(search_term, '[^0-9]', '', 'g') || '%'
        )
        or r.ticket_code = upper(trim(search_term))
      )
  )
  select
    f.id,
    f.full_name,
    f.email::text,
    f.phone,
    f.city,
    f.status,
    f.ticket_code,
    f.registered_at,
    f.checked_in_at,
    p.full_name,
    count(*) over()
  from filtered f
  left join public.profiles p on p.id = f.checked_in_by
  order by f.registered_at desc
  offset greatest(page_offset, 0)
  limit least(greatest(page_limit, 1), 100);
end;
$$;

revoke all on function public.list_event_registrations_admin(uuid, text, public.registration_status, integer, integer) from public, anon;
grant execute on function public.list_event_registrations_admin(uuid, text, public.registration_status, integer, integer) to authenticated;
