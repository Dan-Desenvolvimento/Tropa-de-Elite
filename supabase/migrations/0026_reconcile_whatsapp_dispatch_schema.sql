-- A versão inicial da migration 0024 já pode ter sido aplicada em produção
-- antes de estas colunas de durabilidade terem sido acrescentadas ao arquivo.
-- Esta migration é aditiva e segura tanto para instalações antigas quanto novas.

alter table public.whatsapp_dispatches
  add column if not exists target_registration_ids uuid[];

-- Preserva o destinatário congelado de disparos individuais já existentes.
-- Disparos em massa antigos permanecem com o array vazio e usam o fallback
-- temporal implementado pelo processador.
update public.whatsapp_dispatches
set target_registration_ids = array[registration_id]::uuid[]
where registration_id is not null
  and coalesce(cardinality(target_registration_ids), 0) = 0;

update public.whatsapp_dispatches
set target_registration_ids = '{}'::uuid[]
where target_registration_ids is null;

alter table public.whatsapp_dispatches
  alter column target_registration_ids set default '{}'::uuid[],
  alter column target_registration_ids set not null;

alter table public.whatsapp_dispatches
  drop constraint if exists whatsapp_dispatches_target_registration_ids_check;

alter table public.whatsapp_dispatches
  add constraint whatsapp_dispatches_target_registration_ids_check
  check (cardinality(target_registration_ids) <= 10000);

alter table public.whatsapp_dispatches
  add column if not exists lease_expires_at timestamptz,
  add column if not exists attempt_count integer;

update public.whatsapp_dispatches
set attempt_count = 0
where attempt_count is null;

alter table public.whatsapp_dispatches
  alter column attempt_count set default 0,
  alter column attempt_count set not null;

alter table public.whatsapp_dispatches
  drop constraint if exists whatsapp_dispatches_attempt_count_check;

alter table public.whatsapp_dispatches
  add constraint whatsapp_dispatches_attempt_count_check
  check (attempt_count >= 0);

-- Recria para garantir a definição correta mesmo se uma versão antiga tiver
-- usado o mesmo nome de índice com outras colunas.
drop index if exists public.whatsapp_dispatches_recovery_idx;
create index whatsapp_dispatches_recovery_idx
  on public.whatsapp_dispatches(status, lease_expires_at)
  where status in ('queued', 'processing');

comment on column public.whatsapp_dispatches.target_registration_ids is
  'Snapshot dos destinatários elegíveis no instante em que o disparo foi solicitado.';
comment on column public.whatsapp_dispatches.lease_expires_at is
  'Lease curta usada para recuperar processamentos interrompidos sem concorrência.';
comment on column public.whatsapp_dispatches.attempt_count is
  'Quantidade de vezes que o processador adquiriu o lease deste disparo.';

notify pgrst, 'reload schema';
