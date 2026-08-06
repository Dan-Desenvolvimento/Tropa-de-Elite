create or replace function
  public.list_event_registrations_admin(
    target_event_id uuid,
    search_term text default '',
    status_filter public.registration_status default null,
    page_offset integer default 0,
    page_limit integer default 25,
    sort_order text default 'newest'
  )
returns table (
  registration_id uuid,
  full_name text,
  email text,
  phone text,
  city text,
  company_name text,
  job_role text,
  job_role_other text,
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
  if not (
    public.has_event_permission(target_event_id, 'view_registrations')
    or public.has_event_permission(target_event_id, 'manage_registrations')
    or public.has_event_permission(target_event_id, 'anonymize_registrations')
  ) then
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
        or lower(coalesce(r.company_name, '')) like '%' || lower(trim(search_term)) || '%'
        or lower(coalesce(r.job_role_other, '')) like '%' || lower(trim(search_term)) || '%'
        or lower(coalesce(r.job_role, '')) like '%' || lower(trim(search_term)) || '%'
        or (
          lower(trim(search_term)) in (
            'empresario',
            'empresário',
            'empresaria',
            'empresária',
            'e1'
          )
          and r.job_role in ('owner', 'ceo', 'director')
        )
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
    f.company_name,
    f.job_role,
    f.job_role_other,
    f.status,
    f.ticket_code,
    f.registered_at,
    f.checked_in_at,
    p.full_name,
    count(*) over()
  from filtered f
  left join public.profiles p on p.id = f.checked_in_by
  order by
    case when sort_order = 'oldest' then f.registered_at end asc,
    case when sort_order = 'name_asc' then lower(f.full_name) end asc,
    case when sort_order = 'name_desc' then lower(f.full_name) end desc,
    case
      when sort_order not in ('oldest', 'name_asc', 'name_desc')
      then f.registered_at
    end desc,
    f.id asc
  offset greatest(page_offset, 0)
  limit least(greatest(page_limit, 1), 100);
end;
$$;

revoke all on function
  public.list_event_registrations_admin(
    uuid,
    text,
    public.registration_status,
    integer,
    integer,
    text
  )
from public;

grant execute on function
  public.list_event_registrations_admin(
    uuid,
    text,
    public.registration_status,
    integer,
    integer,
    text
  )
to authenticated;
