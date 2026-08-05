alter table public.profiles
  add column if not exists is_owner boolean not null default false,
  add column if not exists can_create_events boolean not null default false,
  add column if not exists can_manage_team boolean not null default false;

alter table public.event_staff
  add column if not exists can_edit_event boolean not null default false,
  add column if not exists can_checkin boolean not null default false,
  add column if not exists can_view_registrations boolean not null default false,
  add column if not exists can_manage_registrations boolean not null default false,
  add column if not exists can_anonymize_registrations boolean not null default false,
  add column if not exists can_view_reports boolean not null default false,
  add column if not exists can_view_logs boolean not null default false;

update public.profiles
set
  can_create_events = true,
  can_manage_team = true
where global_role = 'admin';

update public.profiles
set is_owner = true
where id = (
  select p.id
  from public.profiles p
  where p.active
    and p.global_role = 'admin'
  order by p.created_at asc, p.id asc
  limit 1
)
and not exists (
  select 1
  from public.profiles p
  where p.is_owner
);

update public.event_staff
set can_checkin = true
where role = 'checkin_operator';

update public.event_staff
set
  can_edit_event = true,
  can_checkin = true,
  can_view_registrations = true,
  can_manage_registrations = true,
  can_anonymize_registrations = true,
  can_view_reports = true,
  can_view_logs = true
where role = 'admin';

insert into public.event_staff (
  event_id,
  user_id,
  role,
  can_edit_event,
  can_checkin,
  can_view_registrations,
  can_manage_registrations,
  can_anonymize_registrations,
  can_view_reports,
  can_view_logs
)
select
  e.id,
  p.id,
  'admin'::public.staff_role,
  true,
  true,
  true,
  true,
  true,
  true,
  true
from public.events e
cross join public.profiles p
where p.global_role = 'admin'
on conflict (event_id, user_id)
do update set
  role = excluded.role,
  can_edit_event = excluded.can_edit_event,
  can_checkin = excluded.can_checkin,
  can_view_registrations = excluded.can_view_registrations,
  can_manage_registrations = excluded.can_manage_registrations,
  can_anonymize_registrations =
    excluded.can_anonymize_registrations,
  can_view_reports = excluded.can_view_reports,
  can_view_logs = excluded.can_view_logs;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active
      and p.is_owner
  );
$$;

create or replace function public.has_global_permission(
  permission_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active
      and (
        p.is_owner
        or case permission_name
          when 'create_events' then p.can_create_events
          when 'manage_team' then p.can_manage_team
          else false
        end
      )
  );
$$;

create or replace function public.has_event_permission(
  target_event_id uuid,
  permission_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_owner()
    or exists (
      select 1
      from public.event_staff es
      join public.profiles p
        on p.id = es.user_id
       and p.active
      where es.event_id = target_event_id
        and es.user_id = auth.uid()
        and case permission_name
          when 'edit_event'
            then es.can_edit_event
          when 'checkin'
            then es.can_checkin
          when 'view_registrations'
            then es.can_view_registrations
          when 'manage_registrations'
            then es.can_manage_registrations
          when 'anonymize_registrations'
            then es.can_anonymize_registrations
          when 'view_reports'
            then es.can_view_reports
          when 'view_logs'
            then es.can_view_logs
          else false
        end
    );
$$;

create or replace function public.has_any_event_permission(
  target_event_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_owner()
    or exists (
      select 1
      from public.event_staff es
      join public.profiles p
        on p.id = es.user_id
       and p.active
      where es.event_id = target_event_id
        and es.user_id = auth.uid()
        and (
          es.can_edit_event
          or es.can_checkin
          or es.can_view_registrations
          or es.can_manage_registrations
          or es.can_anonymize_registrations
          or es.can_view_reports
          or es.can_view_logs
        )
    );
$$;

create or replace function public.is_global_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_owner();
$$;

create or replace function public.has_event_role(
  target_event_id uuid,
  allowed_roles public.staff_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_owner()
    or (
      'checkin_operator'::public.staff_role = any(allowed_roles)
      and public.has_event_permission(target_event_id, 'checkin')
    )
    or (
      'admin'::public.staff_role = any(allowed_roles)
      and (
        public.has_event_permission(target_event_id, 'edit_event')
        or public.has_event_permission(
          target_event_id,
          'view_registrations'
        )
        or public.has_event_permission(
          target_event_id,
          'manage_registrations'
        )
        or public.has_event_permission(
          target_event_id,
          'anonymize_registrations'
        )
        or public.has_event_permission(
          target_event_id,
          'view_reports'
        )
        or public.has_event_permission(
          target_event_id,
          'view_logs'
        )
      )
    );
$$;

create or replace function public.replace_staff_permissions(
  target_user_id uuid,
  owner_access boolean,
  create_events_access boolean,
  manage_team_access boolean,
  event_permissions jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_was_owner boolean;
  has_elevated_event_access boolean;
begin
  select p.is_owner
  into target_was_owner
  from public.profiles p
  where p.id = target_user_id
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if target_was_owner
    and not owner_access
    and (
      select count(*)
      from public.profiles p
      where p.active
        and p.is_owner
    ) <= 1 then
    raise exception 'LAST_OWNER';
  end if;

  select exists (
    select 1
    from jsonb_array_elements(
      coalesce(event_permissions, '[]'::jsonb)
    ) item
    where
      coalesce((item->>'canEditEvent')::boolean, false)
      or coalesce(
        (item->>'canViewRegistrations')::boolean,
        false
      )
      or coalesce(
        (item->>'canManageRegistrations')::boolean,
        false
      )
      or coalesce(
        (item->>'canAnonymizeRegistrations')::boolean,
        false
      )
      or coalesce(
        (item->>'canViewReports')::boolean,
        false
      )
      or coalesce(
        (item->>'canViewLogs')::boolean,
        false
      )
  )
  into has_elevated_event_access;

  update public.profiles
  set
    is_owner = owner_access,
    can_create_events =
      case when owner_access then true
      else create_events_access end,
    can_manage_team =
      case when owner_access then true
      else manage_team_access end,
    global_role =
      case
        when owner_access
          or create_events_access
          or manage_team_access
          or has_elevated_event_access
        then 'admin'::public.staff_role
        else 'checkin_operator'::public.staff_role
      end
  where id = target_user_id;

  delete from public.event_staff
  where user_id = target_user_id;

  if not owner_access then
    insert into public.event_staff (
      event_id,
      user_id,
      role,
      can_edit_event,
      can_checkin,
      can_view_registrations,
      can_manage_registrations,
      can_anonymize_registrations,
      can_view_reports,
      can_view_logs
    )
    select
      event_data.event_id,
      target_user_id,
      case
        when
          event_data.can_edit_event
          or event_data.can_view_registrations
          or event_data.can_manage_registrations
          or event_data.can_anonymize_registrations
          or event_data.can_view_reports
          or event_data.can_view_logs
        then 'admin'::public.staff_role
        else 'checkin_operator'::public.staff_role
      end,
      event_data.can_edit_event,
      event_data.can_checkin,
      event_data.can_view_registrations,
      event_data.can_manage_registrations,
      event_data.can_anonymize_registrations,
      event_data.can_view_reports,
      event_data.can_view_logs
    from (
      select distinct on ((item->>'eventId')::uuid)
        (item->>'eventId')::uuid as event_id,
        coalesce(
          (item->>'canEditEvent')::boolean,
          false
        ) as can_edit_event,
        coalesce(
          (item->>'canCheckin')::boolean,
          false
        ) as can_checkin,
        coalesce(
          (item->>'canViewRegistrations')::boolean,
          false
        ) as can_view_registrations,
        coalesce(
          (item->>'canManageRegistrations')::boolean,
          false
        ) as can_manage_registrations,
        coalesce(
          (item->>'canAnonymizeRegistrations')::boolean,
          false
        ) as can_anonymize_registrations,
        coalesce(
          (item->>'canViewReports')::boolean,
          false
        ) as can_view_reports,
        coalesce(
          (item->>'canViewLogs')::boolean,
          false
        ) as can_view_logs
      from jsonb_array_elements(
        coalesce(event_permissions, '[]'::jsonb)
      ) item
    ) event_data
    join public.events e
      on e.id = event_data.event_id
    where
      event_data.can_edit_event
      or event_data.can_checkin
      or event_data.can_view_registrations
      or event_data.can_manage_registrations
      or event_data.can_anonymize_registrations
      or event_data.can_view_reports
      or event_data.can_view_logs;
  end if;
end;
$$;

revoke all on function public.replace_staff_permissions(
  uuid,
  boolean,
  boolean,
  boolean,
  jsonb
) from public, anon, authenticated;

grant execute on function public.replace_staff_permissions(
  uuid,
  boolean,
  boolean,
  boolean,
  jsonb
) to service_role;

drop policy if exists profiles_self_read
  on public.profiles;
drop policy if exists profiles_admin_manage
  on public.profiles;
drop policy if exists profiles_owner_manage
  on public.profiles;

create policy profiles_self_read
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.has_global_permission('manage_team')
);

create policy profiles_owner_manage
on public.profiles
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists events_staff_read
  on public.events;
drop policy if exists events_admin_manage
  on public.events;
drop policy if exists events_create
  on public.events;
drop policy if exists events_edit
  on public.events;

create policy events_staff_read
on public.events
for select
to authenticated
using (public.has_any_event_permission(id));

create policy events_create
on public.events
for insert
to authenticated
with check (
  public.has_global_permission('create_events')
);

create policy events_edit
on public.events
for update
to authenticated
using (
  public.has_event_permission(id, 'edit_event')
)
with check (
  public.has_event_permission(id, 'edit_event')
);

drop policy if exists event_staff_read
  on public.event_staff;
drop policy if exists event_staff_admin_manage
  on public.event_staff;
drop policy if exists event_staff_owner_manage
  on public.event_staff;

create policy event_staff_read
on public.event_staff
for select
to authenticated
using (
  user_id = auth.uid()
  or public.has_global_permission('manage_team')
);

create policy event_staff_owner_manage
on public.event_staff
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists registrations_admin_read
  on public.registrations;
drop policy if exists registrations_admin_update
  on public.registrations;
drop policy if exists registrations_permission_read
  on public.registrations;
drop policy if exists registrations_permission_update
  on public.registrations;

create policy registrations_permission_read
on public.registrations
for select
to authenticated
using (
  public.has_event_permission(
    event_id,
    'view_registrations'
  )
  or public.has_event_permission(
    event_id,
    'manage_registrations'
  )
  or public.has_event_permission(
    event_id,
    'anonymize_registrations'
  )
);

create policy registrations_permission_update
on public.registrations
for update
to authenticated
using (
  public.has_event_permission(
    event_id,
    'manage_registrations'
  )
  or public.has_event_permission(
    event_id,
    'anonymize_registrations'
  )
)
with check (
  public.has_event_permission(
    event_id,
    'manage_registrations'
  )
  or public.has_event_permission(
    event_id,
    'anonymize_registrations'
  )
);

drop policy if exists checkin_logs_staff_read
  on public.checkin_logs;
drop policy if exists checkin_logs_permission_read
  on public.checkin_logs;

create policy checkin_logs_permission_read
on public.checkin_logs
for select
to authenticated
using (
  public.has_event_permission(event_id, 'checkin')
  or public.has_event_permission(
    event_id,
    'view_reports'
  )
  or public.has_event_permission(
    event_id,
    'view_logs'
  )
);

drop policy if exists email_logs_admin_read
  on public.email_logs;
drop policy if exists email_logs_permission_read
  on public.email_logs;

create policy email_logs_permission_read
on public.email_logs
for select
to authenticated
using (
  public.has_event_permission(
    event_id,
    'view_registrations'
  )
  or public.has_event_permission(
    event_id,
    'manage_registrations'
  )
  or public.has_event_permission(
    event_id,
    'view_logs'
  )
);

drop policy if exists audit_logs_admin_read
  on public.audit_logs;
drop policy if exists audit_logs_permission_read
  on public.audit_logs;

create policy audit_logs_permission_read
on public.audit_logs
for select
to authenticated
using (
  public.has_event_permission(event_id, 'view_logs')
);

drop function if exists
  public.get_event_dashboard_summaries();

create function public.get_event_dashboard_summaries()
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
  email_failed_count bigint,
  can_edit_event boolean,
  can_checkin boolean,
  can_view_registrations boolean,
  can_manage_registrations boolean,
  can_anonymize_registrations boolean,
  can_view_reports boolean,
  can_view_logs boolean
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
    count(r.id)
      filter (where r.status = 'confirmed'),
    count(r.id)
      filter (where r.status = 'waitlist'),
    count(r.id)
      filter (where r.status = 'cancelled'),
    count(r.id)
      filter (where r.checked_in_at is not null),
    (
      select count(*)
      from public.email_logs el
      where el.event_id = e.id
        and el.status = 'sent'
    ),
    (
      select count(*)
      from public.email_logs el
      where el.event_id = e.id
        and el.status = 'failed'
    ),
    public.has_event_permission(
      e.id,
      'edit_event'
    ),
    public.has_event_permission(
      e.id,
      'checkin'
    ),
    public.has_event_permission(
      e.id,
      'view_registrations'
    ),
    public.has_event_permission(
      e.id,
      'manage_registrations'
    ),
    public.has_event_permission(
      e.id,
      'anonymize_registrations'
    ),
    public.has_event_permission(
      e.id,
      'view_reports'
    ),
    public.has_event_permission(
      e.id,
      'view_logs'
    )
  from public.events e
  left join public.registrations r
    on r.event_id = e.id
  where public.has_any_event_permission(e.id)
  group by e.id;
$$;

revoke all on function
  public.get_event_dashboard_summaries()
from public, anon;

grant execute on function
  public.get_event_dashboard_summaries()
to authenticated;

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
    public.has_event_permission(
      target_event_id,
      'view_registrations'
    )
    or public.has_event_permission(
      target_event_id,
      'manage_registrations'
    )
    or public.has_event_permission(
      target_event_id,
      'anonymize_registrations'
    )
  ) then
    raise exception 'UNAUTHORIZED';
  end if;

  return query
  with filtered as (
    select r.*
    from public.registrations r
    where r.event_id = target_event_id
      and (
        status_filter is null
        or r.status = status_filter
      )
      and (
        trim(search_term) = ''
        or lower(r.full_name)
          like '%' || lower(trim(search_term)) || '%'
        or lower(r.email::text)
          like '%' || lower(trim(search_term)) || '%'
        or lower(coalesce(r.company_name, ''))
          like '%' || lower(trim(search_term)) || '%'
        or lower(coalesce(r.job_role_other, ''))
          like '%' || lower(trim(search_term)) || '%'
        or (
          length(
            regexp_replace(
              search_term,
              '[^0-9]',
              '',
              'g'
            )
          ) >= 3
          and r.phone like '%'
            || regexp_replace(
              search_term,
              '[^0-9]',
              '',
              'g'
            )
            || '%'
        )
        or r.ticket_code =
          upper(trim(search_term))
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
  left join public.profiles p
    on p.id = f.checked_in_by
  order by
    case
      when sort_order = 'oldest'
      then f.registered_at
    end asc,
    case
      when sort_order = 'name_asc'
      then lower(f.full_name)
    end asc,
    case
      when sort_order = 'name_desc'
      then lower(f.full_name)
    end desc,
    case
      when sort_order not in (
        'oldest',
        'name_asc',
        'name_desc'
      )
      then f.registered_at
    end desc,
    f.id asc
  offset greatest(page_offset, 0)
  limit least(greatest(page_limit, 1), 100);
end;
$$;

create or replace function
  public.search_event_registrations(
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
  if not public.has_event_permission(
    target_event_id,
    'checkin'
  ) then
    raise exception 'UNAUTHORIZED';
  end if;

  return query
  select
    r.id,
    r.full_name,
    case
      when position('@' in r.email::text) > 2 then
        left(r.email::text, 2)
        || '***'
        || substring(
          r.email::text
          from position('@' in r.email::text)
        )
      else '***'
    end,
    case
      when length(r.phone) >= 4 then
        '(**) *****-' || right(r.phone, 4)
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
      or lower(r.full_name)
        like '%' || lower(trim(search_term)) || '%'
      or lower(r.email::text) =
        lower(trim(search_term))
      or lower(coalesce(r.company_name, ''))
        like '%' || lower(trim(search_term)) || '%'
      or lower(coalesce(r.job_role_other, ''))
        like '%' || lower(trim(search_term)) || '%'
      or (
        length(
          regexp_replace(
            search_term,
            '[^0-9]',
            '',
            'g'
          )
        ) >= 3
        and r.phone like '%'
          || regexp_replace(
            search_term,
            '[^0-9]',
            '',
            'g'
          )
          || '%'
      )
      or r.ticket_code = upper(trim(search_term))
    )
  order by r.full_name
  limit least(greatest(result_limit, 1), 50);
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
  if not public.has_event_permission(
    target_event_id,
    'checkin'
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

  if not public.has_event_permission(
    target_registration.event_id,
    'checkin'
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
      or not public.has_event_permission(
        target_event_id,
        'manage_registrations'
      )
    ) then
    result_code := 'WAITLIST_REGISTRATION';
  elsif target_registration.checked_in_at is not null then
    result_code := 'ALREADY_CHECKED_IN';
    effective_checkin_at :=
      target_registration.checked_in_at;

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

revoke all on function public.is_owner()
from public, anon;
grant execute on function public.is_owner()
to authenticated;

revoke all on function public.has_global_permission(text)
from public, anon;
grant execute on function public.has_global_permission(text)
to authenticated;

revoke all on function
  public.has_event_permission(uuid, text)
from public, anon;
grant execute on function
  public.has_event_permission(uuid, text)
to authenticated;

revoke all on function
  public.has_any_event_permission(uuid)
from public, anon;
grant execute on function
  public.has_any_event_permission(uuid)
to authenticated;

revoke all on function
  public.list_event_registrations_admin(
    uuid,
    text,
    public.registration_status,
    integer,
    integer,
    text
  )
from public, anon;
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

revoke all on function
  public.search_event_registrations(
    uuid,
    text,
    integer
  )
from public, anon;
grant execute on function
  public.search_event_registrations(
    uuid,
    text,
    integer
  )
to authenticated;

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
