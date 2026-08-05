alter table public.registrations
  add column if not exists company_name text,
  add column if not exists job_role text,
  add column if not exists job_role_other text;

alter table public.registrations
  drop constraint if exists registrations_company_name_length,
  drop constraint if exists registrations_job_role_allowed,
  drop constraint if exists registrations_job_role_other_valid;

alter table public.registrations
  add constraint registrations_company_name_length check (
    company_name is null
    or char_length(trim(company_name)) between 2 and 160
  ),
  add constraint registrations_job_role_allowed check (
    job_role is null
    or job_role in (
      'owner',
      'ceo',
      'director',
      'manager',
      'supervisor',
      'salesperson',
      'other'
    )
  ),
  add constraint registrations_job_role_other_valid check (
    case
      when job_role is null then job_role_other is null
      when job_role = 'other' then
        job_role_other is not null
        and char_length(trim(job_role_other)) between 2 and 160
      else job_role_other is null
    end
  );

drop function if exists public.create_event_registration(
  uuid,
  text,
  text,
  text,
  text,
  jsonb,
  boolean,
  boolean
);

create or replace function public.create_event_registration(
  target_event_id uuid,
  participant_name text,
  participant_email text,
  participant_phone text,
  participant_city text,
  participant_company_name text,
  participant_job_role text,
  participant_job_role_other text,
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
  normalized_email public.citext :=
    lower(trim(participant_email))::public.citext;
  normalized_phone text :=
    regexp_replace(participant_phone, '[^0-9]', '', 'g');
  normalized_company_name text :=
    nullif(trim(participant_company_name), '');
  normalized_job_role text :=
    lower(trim(participant_job_role));
  normalized_job_role_other text :=
    nullif(trim(participant_job_role_other), '');
  generated_token text;
  generated_code text;
begin
  if not accepted_privacy then
    return jsonb_build_object(
      'success',
      false,
      'code',
      'PRIVACY_CONSENT_REQUIRED'
    );
  end if;

  if normalized_company_name is null
    or char_length(normalized_company_name) < 2 then
    return jsonb_build_object(
      'success',
      false,
      'code',
      'COMPANY_REQUIRED'
    );
  end if;

  if normalized_job_role is null
    or normalized_job_role not in (
    'owner',
    'ceo',
    'director',
    'manager',
    'supervisor',
    'salesperson',
    'other'
  ) then
    return jsonb_build_object(
      'success',
      false,
      'code',
      'INVALID_JOB_ROLE'
    );
  end if;

  if normalized_job_role = 'other'
    and (
      normalized_job_role_other is null
      or char_length(normalized_job_role_other) < 2
    ) then
    return jsonb_build_object(
      'success',
      false,
      'code',
      'INVALID_JOB_ROLE'
    );
  end if;

  if normalized_job_role <> 'other' then
    normalized_job_role_other := null;
  end if;

  select *
  into selected_event
  from public.events
  where id = target_event_id
  for update;

  if not found then
    return jsonb_build_object(
      'success',
      false,
      'code',
      'EVENT_NOT_FOUND'
    );
  end if;

  if selected_event.registration_status <> 'open'
    or (
      selected_event.registration_open_at is not null
      and now() < selected_event.registration_open_at
    )
    or (
      selected_event.registration_close_at is not null
      and now() > selected_event.registration_close_at
    ) then
    return jsonb_build_object(
      'success',
      false,
      'code',
      'REGISTRATION_CLOSED'
    );
  end if;

  if exists (
    select 1
    from public.registrations r
    where r.event_id = target_event_id
      and (
        r.email = normalized_email
        or r.phone = normalized_phone
      )
      and r.status <> 'cancelled'
  ) then
    return jsonb_build_object(
      'success',
      false,
      'code',
      'DUPLICATE_REGISTRATION'
    );
  end if;

  select count(*)
  into confirmed_count
  from public.registrations r
  where r.event_id = target_event_id
    and r.status = 'confirmed';

  if selected_event.capacity is null
    or confirmed_count < selected_event.capacity then
    final_status := 'confirmed';
  elsif selected_event.waitlist_enabled then
    final_status := 'waitlist';
  else
    return jsonb_build_object(
      'success',
      false,
      'code',
      'EVENT_SOLD_OUT'
    );
  end if;

  generated_token := translate(
    encode(extensions.gen_random_bytes(32), 'base64'),
    '+/=',
    '-_'
  );

  loop
    generated_code :=
      'TDE-'
      || upper(
        substr(
          encode(extensions.gen_random_bytes(5), 'hex'),
          1,
          6
        )
      );

    exit when not exists (
      select 1
      from public.registrations r
      where r.event_id = target_event_id
        and r.ticket_code = generated_code
    );
  end loop;

  insert into public.registrations (
    event_id,
    full_name,
    email,
    phone,
    city,
    company_name,
    job_role,
    job_role_other,
    custom_answers,
    privacy_consent,
    privacy_policy_version,
    communications_consent,
    status,
    ticket_code,
    ticket_token
  )
  values (
    target_event_id,
    trim(participant_name),
    normalized_email,
    normalized_phone,
    trim(participant_city),
    normalized_company_name,
    normalized_job_role,
    normalized_job_role_other,
    coalesce(answers, '{}'::jsonb),
    true,
    selected_event.privacy_policy_version,
    accepted_communications,
    final_status,
    generated_code,
    generated_token
  )
  returning *
  into new_registration;

  if selected_event.capacity is not null
    and final_status = 'confirmed'
    and confirmed_count + 1 >= selected_event.capacity then
    update public.events
    set registration_status =
      case
        when waitlist_enabled then registration_status
        else 'sold_out'
      end
    where id = target_event_id;
  end if;

  return jsonb_build_object(
    'success',
    true,
    'registration_id',
    new_registration.id,
    'status',
    new_registration.status,
    'ticket_token',
    new_registration.ticket_token,
    'ticket_code',
    new_registration.ticket_code
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'success',
      false,
      'code',
      'DUPLICATE_REGISTRATION'
    );
end;
$$;

revoke all on function public.create_event_registration(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  boolean,
  boolean
) from public, anon, authenticated;

grant execute on function public.create_event_registration(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  boolean,
  boolean
) to service_role;

drop function if exists public.list_event_registrations_admin(
  uuid,
  text,
  public.registration_status,
  integer,
  integer,
  text
);

create or replace function public.list_event_registrations_admin(
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
  if not public.has_event_role(
    target_event_id,
    array['admin']::public.staff_role[]
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

revoke all on function public.list_event_registrations_admin(
  uuid,
  text,
  public.registration_status,
  integer,
  integer,
  text
) from public, anon;

grant execute on function public.list_event_registrations_admin(
  uuid,
  text,
  public.registration_status,
  integer,
  integer,
  text
) to authenticated;

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
    array[
      'admin',
      'checkin_operator'
    ]::public.staff_role[]
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
      or lower(r.email::text) = lower(trim(search_term))
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

revoke all on function public.search_event_registrations(
  uuid,
  text,
  integer
) from public, anon;

grant execute on function public.search_event_registrations(
  uuid,
  text,
  integer
) to authenticated;

notify pgrst, 'reload schema';
