-- Add flexible expense schedules such as every 6 weeks or every 2 months.
alter table public.expenses
  drop constraint if exists expenses_frequency_check;

alter table public.expenses
  add constraint expenses_frequency_check
  check (frequency in ('Monthly', 'Weekly', 'Yearly', 'One-time', 'Custom'));

alter table public.expenses
  add column if not exists interval_count integer,
  add column if not exists interval_unit text;

alter table public.expenses
  add constraint expenses_interval_count_check
  check (interval_count is null or interval_count between 1 and 60);

alter table public.expenses
  add constraint expenses_interval_unit_check
  check (interval_unit is null or interval_unit in ('Weeks', 'Months'));
