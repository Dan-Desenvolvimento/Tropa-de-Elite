create or replace function public.consume_rate_limit(
  rate_scope text,
  rate_key_hash text,
  rate_max_attempts integer,
  rate_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_entry public.rate_limit_entries%rowtype;
  request_time timestamptz := clock_timestamp();
begin
  if rate_max_attempts < 1 or rate_window_seconds < 1 then
    raise exception 'Invalid rate limit configuration';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(rate_scope || ':' || rate_key_hash, 0));

  delete from public.rate_limit_entries
  where expires_at <= request_time;

  select * into current_entry
  from public.rate_limit_entries
  where scope = rate_scope
    and key_hash = rate_key_hash
    and expires_at > request_time
  order by window_started_at desc
  limit 1
  for update;

  if not found then
    insert into public.rate_limit_entries (
      scope, key_hash, window_started_at, attempts, expires_at
    ) values (
      rate_scope,
      rate_key_hash,
      request_time,
      1,
      request_time + make_interval(secs => rate_window_seconds)
    ) returning * into current_entry;

    return jsonb_build_object(
      'allowed', true,
      'remaining', rate_max_attempts - 1,
      'retry_after_seconds', rate_window_seconds
    );
  end if;

  if current_entry.attempts >= rate_max_attempts then
    return jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after_seconds', greatest(1, ceil(extract(epoch from current_entry.expires_at - request_time)))::integer
    );
  end if;

  update public.rate_limit_entries
  set attempts = attempts + 1
  where id = current_entry.id
  returning * into current_entry;

  return jsonb_build_object(
    'allowed', true,
    'remaining', greatest(0, rate_max_attempts - current_entry.attempts),
    'retry_after_seconds', greatest(1, ceil(extract(epoch from current_entry.expires_at - request_time)))::integer
  );
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;
