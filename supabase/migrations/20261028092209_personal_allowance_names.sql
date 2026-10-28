alter table public.allowances
  add column allowance_name_1 text not null default 'Personal Allowance 1'
    check (length(btrim(allowance_name_1)) between 1 and 60),
  add column allowance_name_2 text not null default 'Personal Allowance 2'
    check (length(btrim(allowance_name_2)) between 1 and 60);
