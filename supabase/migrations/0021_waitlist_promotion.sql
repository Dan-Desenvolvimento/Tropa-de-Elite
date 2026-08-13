create or replace function public.keep_new_registrations_behind_waitlist()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'confirmed'
    and exists (
      select 1
      from public.events e
      where e.id = new.event_id
        and e.waitlist_enabled
    )
    and exists (
      select 1
      from public.registrations r
      where r.event_id = new.event_id
        and r.status = 'waitlist'
    ) then
    new.status := 'waitlist';
  end if;

  return new;
end;
$$;

drop trigger if exists registrations_keep_waitlist_order on public.registrations;
create trigger registrations_keep_waitlist_order
before insert on public.registrations
for each row execute function public.keep_new_registrations_behind_waitlist();

create or replace function public.promote_event_waitlist(target_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_event public.events%rowtype;
  confirmed_count integer;
  open_slots integer;
  promoted_ids uuid[] := '{}'::uuid[];
  remaining_waitlist integer;
begin
  select *
  into selected_event
  from public.events e
  where e.id = target_event_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'code', 'EVENT_NOT_FOUND');
  end if;

  if selected_event.registration_status in ('cancelled', 'finished') then
    return jsonb_build_object('success', false, 'code', 'EVENT_NOT_ELIGIBLE');
  end if;

  select count(*)
  into confirmed_count
  from public.registrations r
  where r.event_id = target_event_id
    and r.status = 'confirmed';

  if selected_event.capacity is null then
    select count(*)
    into open_slots
    from public.registrations r
    where r.event_id = target_event_id
      and r.status = 'waitlist';
  else
    open_slots := greatest(selected_event.capacity - confirmed_count, 0);
  end if;

  if open_slots > 0 then
    with candidates as (
      select r.id
      from public.registrations r
      where r.event_id = target_event_id
        and r.status = 'waitlist'
      order by r.registered_at asc, r.id asc
      for update skip locked
      limit open_slots
    ), promoted as (
      update public.registrations r
      set status = 'confirmed',
          updated_at = now()
      from candidates c
      where r.id = c.id
      returning r.id
    )
    select coalesce(array_agg(p.id), '{}'::uuid[])
    into promoted_ids
    from promoted p;
  end if;

  select count(*)
  into remaining_waitlist
  from public.registrations r
  where r.event_id = target_event_id
    and r.status = 'waitlist';

  return jsonb_build_object(
    'success', true,
    'promoted_ids', to_jsonb(promoted_ids),
    'promoted_count', cardinality(promoted_ids),
    'available_slots', open_slots,
    'remaining_waitlist', remaining_waitlist
  );
end;
$$;

revoke all on function public.promote_event_waitlist(uuid) from public, anon, authenticated;
grant execute on function public.promote_event_waitlist(uuid) to service_role;

revoke all on function public.keep_new_registrations_behind_waitlist() from public, anon, authenticated;
grant execute on function public.keep_new_registrations_behind_waitlist() to service_role;
