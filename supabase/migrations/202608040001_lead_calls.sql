begin;

alter table public.leads
  add column do_not_call boolean not null default false,
  add column do_not_call_at timestamptz;

create table public.lead_calls (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  lead_id bigint not null references public.leads(id) on delete cascade,
  state text not null default 'geplant'
    check (state in ('geplant', 'erledigt', 'abgesagt')),
  outcome text
    check (outcome in ('gespraech', 'rueckruf', 'kein_interesse', 'nicht_erreicht', 'falsche_nummer')),
  scheduled_at timestamptz,
  called_at timestamptz,
  phone text,
  note text,
  rescheduled_to_id bigint references public.lead_calls(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_calls_state_shape check (
    (state = 'geplant' and scheduled_at is not null and outcome is null and called_at is null)
    or (state = 'erledigt' and outcome is not null and called_at is not null)
    or (state = 'abgesagt' and outcome is null and called_at is null)
  )
);

-- Pro Lead darf nur ein Anruf offen sein, damit die Anrufliste keine Dubletten zeigt.
create unique index lead_calls_one_open_per_lead on public.lead_calls (lead_id)
  where state = 'geplant';
create index lead_calls_owner_scheduled_idx on public.lead_calls (owner_id, scheduled_at)
  where state = 'geplant';
create index lead_calls_lead_idx on public.lead_calls (lead_id, created_at desc);

create trigger lead_calls_set_updated_at before update on public.lead_calls
for each row execute function public.set_updated_at();

alter table public.lead_calls enable row level security;

create policy lead_calls_owner_all on public.lead_calls for all to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.leads
    where leads.id = lead_id and leads.owner_id = (select auth.uid())
  )
);

commit;
