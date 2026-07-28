begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.leads (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null check (char_length(company_name) between 1 and 180),
  industry text,
  location text,
  website_url text,
  google_maps_url text,
  google_place_id text,
  contact_name text,
  contact_email text,
  contact_phone text,
  source text,
  priority text not null default 'mittel'
    check (priority in ('niedrig', 'mittel', 'hoch')),
  priority_overridden boolean not null default false,
  status text not null default 'neu'
    check (status in ('neu', 'audit_offen', 'priorisiert', 'kontaktiert', 'gespraech', 'angebot', 'gewonnen', 'verloren')),
  next_action text,
  next_action_at timestamptz,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audits (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  lead_id bigint not null references public.leads(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  status text not null default 'entwurf'
    check (status in ('entwurf', 'abgeschlossen')),
  score integer check (score between 0 and 100),
  band text check (band in ('kritisch', 'verbesserungsbedarf', 'solide', 'gut_aufgestellt')),
  google_snapshot jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, version)
);

create table public.audit_answers (
  id bigint generated always as identity primary key,
  audit_id bigint not null references public.audits(id) on delete cascade,
  criterion_key text not null,
  category_key text not null,
  label_snapshot text not null,
  weight_snapshot numeric(6,3) not null check (weight_snapshot > 0),
  rating smallint not null check (rating between 0 and 3),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (audit_id, criterion_key)
);

create table public.audit_recommendations (
  id bigint generated always as identity primary key,
  audit_id bigint not null references public.audits(id) on delete cascade,
  catalog_item_id text not null,
  catalog_item_name text not null,
  reason text not null,
  priority text not null check (priority in ('niedrig', 'mittel', 'hoch')),
  selected boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (audit_id, catalog_item_id)
);

create table public.offers (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  lead_id bigint not null references public.leads(id) on delete restrict,
  audit_id bigint references public.audits(id) on delete set null,
  offer_number text unique,
  status text not null default 'entwurf'
    check (status in ('entwurf', 'erstellt', 'versendet', 'angenommen', 'abgelehnt', 'abgelaufen')),
  recipient_name text,
  recipient_company text not null,
  recipient_address text,
  goal text not null,
  next_steps text,
  valid_until date not null default (current_date + 14),
  currency text not null default 'EUR' check (currency = 'EUR'),
  once_total numeric(12,2) not null default 0 check (once_total >= 0),
  monthly_total numeric(12,2) not null default 0 check (monthly_total >= 0),
  revision integer not null default 0 check (revision >= 0),
  snapshot jsonb,
  pdf_path text,
  generated_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.offer_items (
  id bigint generated always as identity primary key,
  offer_id bigint not null references public.offers(id) on delete cascade,
  catalog_item_id text not null,
  name_snapshot text not null,
  description_snapshot text,
  interval text not null check (interval in ('einmalig', 'monatlich', 'laufzeit')),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  price_label_snapshot text,
  quantity numeric(8,2) not null default 1 check (quantity > 0),
  period_snapshot text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.projects (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  lead_id bigint not null references public.leads(id) on delete restrict,
  offer_id bigint not null unique references public.offers(id) on delete restrict,
  audit_id bigint references public.audits(id) on delete set null,
  name text not null,
  status text not null default 'vorbereitung'
    check (status in ('vorbereitung', 'in_arbeit', 'wartet_auf_kunde', 'abnahme', 'abgeschlossen', 'pausiert')),
  start_date date,
  target_date date,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_tasks (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 220),
  status text not null default 'offen' check (status in ('offen', 'erledigt')),
  priority text not null default 'mittel' check (priority in ('niedrig', 'mittel', 'hoch')),
  due_at timestamptz,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'LokalOptimal',
  legal_name text,
  address text,
  email text,
  phone text,
  tax_id text,
  vat_note text not null default 'Alle Preise netto, exkl. USt.',
  offer_disclaimer text not null default 'Die beschriebenen Ziele sind keine Garantie für bestimmte Rankings, Anfragen oder wirtschaftliche Ergebnisse.',
  default_validity_days integer not null default 14 check (default_validity_days between 1 and 90),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_owner_status_idx on public.leads (owner_id, status) where archived_at is null;
create index leads_owner_next_action_idx on public.leads (owner_id, next_action_at) where archived_at is null and next_action_at is not null;
create index audits_owner_lead_idx on public.audits (owner_id, lead_id);
create index audit_answers_audit_idx on public.audit_answers (audit_id);
create index audit_recommendations_audit_idx on public.audit_recommendations (audit_id);
create index offers_owner_status_idx on public.offers (owner_id, status);
create index offers_lead_idx on public.offers (lead_id);
create index offer_items_offer_idx on public.offer_items (offer_id);
create index projects_owner_status_idx on public.projects (owner_id, status) where archived_at is null;
create index projects_lead_idx on public.projects (lead_id);
create index project_tasks_project_status_due_idx on public.project_tasks (project_id, status, due_at);

create trigger leads_set_updated_at before update on public.leads
for each row execute function public.set_updated_at();
create trigger audits_set_updated_at before update on public.audits
for each row execute function public.set_updated_at();
create trigger audit_answers_set_updated_at before update on public.audit_answers
for each row execute function public.set_updated_at();
create trigger audit_recommendations_set_updated_at before update on public.audit_recommendations
for each row execute function public.set_updated_at();
create trigger offers_set_updated_at before update on public.offers
for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
for each row execute function public.set_updated_at();
create trigger project_tasks_set_updated_at before update on public.project_tasks
for each row execute function public.set_updated_at();
create trigger workspace_settings_set_updated_at before update on public.workspace_settings
for each row execute function public.set_updated_at();

alter table public.leads enable row level security;
alter table public.audits enable row level security;
alter table public.audit_answers enable row level security;
alter table public.audit_recommendations enable row level security;
alter table public.offers enable row level security;
alter table public.offer_items enable row level security;
alter table public.projects enable row level security;
alter table public.project_tasks enable row level security;
alter table public.workspace_settings enable row level security;

create policy leads_owner_all on public.leads for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy audits_owner_all on public.audits for all to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.leads
    where leads.id = lead_id and leads.owner_id = (select auth.uid())
  )
);

create policy audit_answers_owner_all on public.audit_answers for all to authenticated
using (
  exists (
    select 1 from public.audits
    where audits.id = audit_id and audits.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.audits
    where audits.id = audit_id and audits.owner_id = (select auth.uid())
  )
);

create policy audit_recommendations_owner_all on public.audit_recommendations for all to authenticated
using (
  exists (
    select 1 from public.audits
    where audits.id = audit_id and audits.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.audits
    where audits.id = audit_id and audits.owner_id = (select auth.uid())
  )
);

create policy offers_owner_all on public.offers for all to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.leads
    where leads.id = lead_id and leads.owner_id = (select auth.uid())
  )
);

create policy offer_items_owner_all on public.offer_items for all to authenticated
using (
  exists (
    select 1 from public.offers
    where offers.id = offer_id and offers.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.offers
    where offers.id = offer_id and offers.owner_id = (select auth.uid())
  )
);

create policy projects_owner_all on public.projects for all to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.offers
    where offers.id = offer_id
      and offers.owner_id = (select auth.uid())
      and offers.status = 'angenommen'
  )
);

create policy project_tasks_owner_all on public.project_tasks for all to authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = project_id and projects.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.projects
    where projects.id = project_id and projects.owner_id = (select auth.uid())
  )
);

create policy workspace_settings_owner_all on public.workspace_settings for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public)
values ('offers', 'offers', false)
on conflict (id) do update set public = excluded.public;

create policy offer_pdfs_owner_select on storage.objects for select to authenticated
using (
  bucket_id = 'offers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy offer_pdfs_owner_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'offers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy offer_pdfs_owner_update on storage.objects for update to authenticated
using (
  bucket_id = 'offers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'offers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;
