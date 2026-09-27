alter table public.expenses
  add column if not exists paid_amount numeric(10, 2) not null default 0;

update public.expenses
set paid_amount = amount
where paid = true
  and paid_amount = 0;

alter table public.expenses
  drop constraint if exists expenses_paid_amount_non_negative;

alter table public.expenses
  add constraint expenses_paid_amount_non_negative check (paid_amount >= 0 and paid_amount <= amount);
