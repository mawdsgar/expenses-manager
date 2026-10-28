-- Match the existing single-household allowances access model.
create table public.personal_allowance_payments (
  id uuid primary key default gen_random_uuid(),
  person smallint not null check (person in (1, 2)),
  period_start date not null,
  paid_on date not null,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);
create index personal_allowance_payments_period_person_idx
  on public.personal_allowance_payments (period_start, person);
alter table public.personal_allowance_payments enable row level security;
create policy "Household can read personal allowance payments"
  on public.personal_allowance_payments for select to anon, authenticated using (true);
create policy "Household can record personal allowance payments"
  on public.personal_allowance_payments for insert to anon, authenticated with check (true);
create policy "Household can remove personal allowance payments"
  on public.personal_allowance_payments for delete to anon, authenticated using (true);
grant select, insert, delete on public.personal_allowance_payments to anon, authenticated;
