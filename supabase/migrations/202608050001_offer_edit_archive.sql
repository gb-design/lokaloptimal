begin;

alter table public.offers add column archived_at timestamptz;

create index offers_owner_active_idx on public.offers (owner_id, status)
  where archived_at is null;

commit;
