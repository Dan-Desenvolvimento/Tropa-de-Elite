-- Treat Sócio as a potential business owner in the strategic check-in read models.
do $$
declare
  function_row record;
  function_definition text;
begin
  for function_row in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
  loop
    function_definition := pg_get_functiondef(function_row.oid);

    if position(quote_literal('owner') in function_definition) > 0
      and position(quote_literal('director') in function_definition) > 0
      and position(quote_literal('partner') in function_definition) = 0 then
      function_definition := replace(
        function_definition,
        quote_literal('director') || ',',
        quote_literal('director') || ', ' || quote_literal('partner') || ','
      );
      execute function_definition;
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
