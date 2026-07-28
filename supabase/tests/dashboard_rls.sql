begin;
select plan(5);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-a@example.test', '', now(), now()),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-b@example.test', '', now(), now())
on conflict (id) do nothing;

insert into public.leads (owner_id, company_name)
values
  ('00000000-0000-0000-0000-000000000101', 'Lead von A'),
  ('00000000-0000-0000-0000-000000000202', 'Lead von B');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000101';

select is(
  (select count(*) from public.leads),
  1::bigint,
  'Owner A sieht nur den eigenen Lead'
);

select is(
  (select company_name from public.leads limit 1),
  'Lead von A',
  'Der sichtbare Lead gehört Owner A'
);

select is(
  (select count(*) from public.leads where company_name = 'Lead von B'),
  0::bigint,
  'Der fremde Lead ist auch über einen gezielten Filter nicht sichtbar'
);

select lives_ok(
  $$ insert into public.workspace_settings (owner_id, display_name) values ('00000000-0000-0000-0000-000000000101', 'LokalOptimal Test') $$,
  'Owner A darf eigene Einstellungen anlegen'
);

select is(
  (select count(*) from public.workspace_settings),
  1::bigint,
  'Owner A sieht nur eigene Einstellungen'
);

select * from finish();
rollback;
