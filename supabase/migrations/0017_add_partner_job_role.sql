alter table public.registrations
  drop constraint if exists registrations_job_role_allowed;

alter table public.registrations
  add constraint registrations_job_role_allowed check (
    job_role is null
    or job_role in (
      'owner',
      'partner',
      'ceo',
      'director',
      'manager',
      'supervisor',
      'salesperson',
      'other'
    )
  );

-- Keep the existing registration RPC in sync with the expanded allow-list.
do $$
declare
  function_definition text;
begin
  select pg_get_functiondef(p.oid)
    into function_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'create_event_registration'
  order by p.oid desc
  limit 1;

  if function_definition is not null
    and position(quote_literal('partner') in function_definition) = 0 then
    function_definition := replace(
      function_definition,
      quote_literal('director') || ',',
      quote_literal('director') || ', ' || quote_literal('partner') || ','
    );
    execute function_definition;
  end if;
end;
$$;

notify pgrst, 'reload schema';
