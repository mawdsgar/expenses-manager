alter table public.expenses
  add column if not exists payments jsonb not null default '[]'::jsonb;

alter table public.expenses
  add constraint expenses_payments_array check (jsonb_typeof(payments) = 'array');
