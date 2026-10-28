-- Uses the same single-household access model as allowances and personal payments.
create table public.household_transfers (
  id uuid primary key default gen_random_uuid(),
  transferred_on date not null,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);
create index household_transfers_date_idx on public.household_transfers (transferred_on);
alter table public.household_transfers enable row level security;
create policy "Household can read transfers" on public.household_transfers for select to anon, authenticated using (true);
create policy "Household can record transfers" on public.household_transfers for insert to anon, authenticated with check (true);
create policy "Household can correct transfers" on public.household_transfers for update to anon, authenticated using (true) with check (true);
create policy "Household can remove transfers" on public.household_transfers for delete to anon, authenticated using (true);
grant select, insert, update, delete on public.household_transfers to anon, authenticated;
