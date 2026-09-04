-- Shared Derby Road renovation planner.
-- This follows the app's existing public household access model. If the app is
-- later moved behind Supabase Auth, replace these policies with user-scoped ones.

create table if not exists public.renovation_settings (
  id text primary key,
  safety_buffer numeric(12, 2) not null default 2500 check (safety_buffer >= 0),
  plan_start date not null default date '2026-07-01',
  plan_end date not null default date '2028-06-01',
  updated_at timestamptz not null default now(),
  check (plan_end >= plan_start)
);

create table if not exists public.renovation_tasks (
  id text primary key,
  household_id text not null references public.renovation_settings(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  area text not null default '',
  estimated_cost numeric(12, 2) not null check (estimated_cost >= 0),
  scheduled_month date not null,
  status text not null default 'planning'
    check (status in ('planning', 'quote_received', 'booked', 'in_progress', 'complete')),
  sort_order integer not null default 0 check (sort_order >= 0),
  pinned boolean not null default false,
  contingency_percent numeric(6, 2) not null default 0 check (contingency_percent >= 0),
  deposit_amount numeric(12, 2) not null default 0 check (deposit_amount >= 0),
  deposit_month date,
  depends_on text references public.renovation_tasks(id) on delete set null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (date_trunc('month', scheduled_month)::date = scheduled_month),
  check (deposit_month is null or date_trunc('month', deposit_month)::date = deposit_month)
);

create table if not exists public.renovation_contributions (
  id text primary key,
  household_id text not null references public.renovation_settings(id) on delete cascade,
  month date not null,
  amount numeric(12, 2) not null default 1800 check (amount >= 0),
  status text not null default 'planned' check (status in ('planned', 'received')),
  updated_at timestamptz not null default now(),
  unique (household_id, month),
  check (date_trunc('month', month)::date = month)
);

create index if not exists renovation_tasks_household_month_order_idx
  on public.renovation_tasks (household_id, scheduled_month, sort_order);
create index if not exists renovation_tasks_depends_on_idx
  on public.renovation_tasks (depends_on);
create index if not exists renovation_contributions_household_month_idx
  on public.renovation_contributions (household_id, month);

alter table public.renovation_settings enable row level security;
alter table public.renovation_tasks enable row level security;
alter table public.renovation_contributions enable row level security;

drop policy if exists "Public can read and write renovation settings" on public.renovation_settings;
create policy "Public can read and write renovation settings"
  on public.renovation_settings for all to public using (true) with check (true);

drop policy if exists "Public can read and write renovation tasks" on public.renovation_tasks;
create policy "Public can read and write renovation tasks"
  on public.renovation_tasks for all to public using (true) with check (true);

drop policy if exists "Public can read and write renovation contributions" on public.renovation_contributions;
create policy "Public can read and write renovation contributions"
  on public.renovation_contributions for all to public using (true) with check (true);

grant select, insert, update, delete on public.renovation_settings to anon, authenticated;
grant select, insert, update, delete on public.renovation_tasks to anon, authenticated;
grant select, insert, update, delete on public.renovation_contributions to anon, authenticated;

insert into public.renovation_settings (id, safety_buffer, plan_start, plan_end)
values ('derby-road', 2500, date '2026-07-01', date '2028-06-01')
on conflict (id) do nothing;

insert into public.renovation_contributions (id, household_id, month, amount, status)
select
  'seed-contribution-' || to_char(month_value, 'YYYY-MM'),
  'derby-road',
  month_value,
  case
    when month_value = date '2026-07-01' then 1000
    when extract(month from month_value) = 12 then 0
    else 1800
  end,
  'planned'
from generate_series(date '2026-07-01', date '2028-06-01', interval '1 month') as month_value
on conflict (household_id, month) do nothing;

insert into public.renovation_tasks
  (id, household_id, title, area, estimated_cost, scheduled_month, sort_order)
values
  ('seed-windows-one', 'derby-road', 'Windows — phase 1', 'Windows', 1055, date '2026-07-01', 0),
  ('seed-wall-pillar', 'derby-road', 'Rebuild wall & pillar', 'Outside', 850, date '2026-08-01', 1),
  ('seed-front-decorating', 'derby-road', 'Front room decorating', 'Front room', 300, date '2026-08-01', 2),
  ('seed-front-carpet', 'derby-road', 'Front room carpet', 'Front room', 500, date '2026-08-01', 3),
  ('seed-kitchen-tiles', 'derby-road', 'Kitchen tiles', 'Kitchen', 200, date '2026-08-01', 4),
  ('seed-windows-final', 'derby-road', 'Windows — final payment', 'Windows', 527.50, date '2026-08-01', 5),
  ('seed-back-decorating', 'derby-road', 'Back room / kitchen / utility decorating', 'Downstairs', 1500, date '2026-09-01', 6),
  ('seed-labour', 'derby-road', 'Warren & Stuart — labour', 'Downstairs', 3800, date '2026-09-01', 7),
  ('seed-bedroom-decorating', 'derby-road', 'Decorate bedroom', 'Bedroom', 700, date '2026-10-01', 8),
  ('seed-stained-glass', 'derby-road', 'Stained glass window', 'Windows', 1000, date '2026-10-01', 9),
  ('seed-shutters', 'derby-road', 'Upstairs shutters', 'Upstairs', 1300, date '2026-10-01', 10),
  ('seed-bedroom-carpet', 'derby-road', 'Carpet — 2 bedrooms', 'Bedrooms', 750, date '2026-11-01', 11),
  ('seed-paint-outside', 'derby-road', 'Paint outside', 'Outside', 2000, date '2027-05-01', 12),
  ('seed-stairs-carpet', 'derby-road', 'Carpet stairs / landing', 'Upstairs', 900, date '2027-08-01', 13),
  ('seed-gate', 'derby-road', 'New gate', 'Outside', 750, date '2027-08-01', 14),
  ('seed-loft', 'derby-road', 'Loft improvements', 'Loft', 2000, date '2027-09-01', 15)
on conflict (id) do nothing;

do $$
begin
  alter publication supabase_realtime add table public.renovation_settings;
  alter publication supabase_realtime add table public.renovation_tasks;
  alter publication supabase_realtime add table public.renovation_contributions;
exception
  when duplicate_object then null;
end $$;
