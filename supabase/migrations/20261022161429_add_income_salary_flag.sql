alter table public.incomes
  add column if not exists is_salary boolean not null default false;
