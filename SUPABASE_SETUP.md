# Supabase Setup Instructions

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up or log in with GitHub
4. Click "New Project"
5. Fill in:
   - **Name**: expense-manager
   - **Database Password**: (choose a strong password - save it!)
   - **Region**: Choose closest to your location
6. Click "Create new project" (takes ~2 minutes)

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, click the **Settings** icon (bottom left)
2. Click **API** in the sidebar
3. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

## Step 3: Update Environment Variables

1. Open the `.env` file in your project root
2. Replace the placeholder values:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 4: Create the Database Table

1. In Supabase dashboard, click **SQL Editor** in the sidebar
2. Click **New query**
3. Paste this SQL and click **RUN**:

\`\`\`sql
-- Create expenses table
create table expenses (
  id uuid default gen_random_uuid() primary key,
  payee text not null,
  amount decimal(10, 2) not null,
  paid_amount decimal(10, 2) not null default 0,
  due_date date not null,
  category text not null,
  paid boolean default false,
  account text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table expenses enable row level security;

-- Create policy to allow authenticated users to do everything
create policy "Enable all access for authenticated users"
  on expenses
  for all

```sql
-- Create expenses table
create table if not exists expenses (
   id uuid default gen_random_uuid() primary key,
   payee text not null,
   amount decimal(10, 2) not null,
   paid_amount decimal(10, 2) not null default 0,
   due_date date not null,
   frequency text not null check (frequency in ('Monthly','Weekly','Yearly','One-time','Custom')),
   interval_count integer,
   interval_unit text check (interval_unit in ('Weeks','Months')),
   category text not null,
   paid boolean default false,
   account text not null,
   created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- For existing installations, add custom expense interval support:
alter table expenses drop constraint if exists expenses_frequency_check;
alter table expenses add constraint expenses_frequency_check check (frequency in ('Monthly','Weekly','Yearly','One-time','Custom'));
alter table expenses add column if not exists interval_count integer;
alter table expenses add column if not exists interval_unit text check (interval_unit in ('Weeks','Months'));

alter table expenses enable row level security;

-- Public access policy (no auth required)
create policy "Public can read/write expenses"
   on expenses
   for all
   to public
   using (true)
   with check (true);

alter publication supabase_realtime add table expenses;

-- Create incomes table (public access)
create table if not exists incomes (
   id uuid default gen_random_uuid() primary key,
   amount decimal(10,2) not null,
   frequency text not null check (frequency in ('Monthly','Weekly','Yearly','One-time')),
   "from" text not null,
   due_date date not null,
   is_primary boolean not null default false,
   is_salary boolean not null default false,
   created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table incomes enable row level security;

-- WARNING: This grants full read/write access to anyone with the anon key
create policy "Public can read/write incomes"
   on incomes
   for all
   to public
   using (true)
   with check (true);

alter publication supabase_realtime add table incomes;

-- Create savings table (public access)
create table if not exists savings (
   id uuid default gen_random_uuid() primary key,
   name text not null,
   balance decimal(12,2) not null,
   account_type text not null,
   interest_rate decimal(6,3),
   is_variable_rate boolean not null default false,
   created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table savings enable row level security;

-- WARNING: This grants full read/write access to anyone with the anon key
create policy "Public can read/write savings"
   on savings
   for all
   to public
   using (true)
   with check (true);

alter publication supabase_realtime add table savings;

-- Create allowances table (public access, singleton row)
create table if not exists allowances (
   id uuid default gen_random_uuid() primary key,
   allowance1 decimal(12,2) not null default 0,
   allowance2 decimal(12,2) not null default 0,
   food_kids_fuel decimal(12,2) not null default 0,
   created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table allowances enable row level security;

-- WARNING: This grants full read/write access to anyone with the anon key
create policy "Public can read/write allowances"
   on allowances
   for all
   to public
   using (true)
   with check (true);

alter publication supabase_realtime add table allowances;
```
- Check browser console for API errors
- Verify RLS policies are enabled and set to public access
- Confirm your anon key is correct

**Need help?** Check the Supabase docs at [supabase.com/docs](https://supabase.com/docs)

## Renovation planner tables

The renovation planner has a ready-to-run migration at:

`supabase/migrations/202607260001_create_renovation_planner.sql`

Run that file in the Supabase SQL Editor (or with the Supabase CLI if this
project is linked). It creates and seeds the shared Derby Road plan from July
2026 to June 2028, including editable monthly savings and the outstanding work
from the planning spreadsheet.

Until those tables exist, the planner deliberately falls back to local browser
storage so the page remains usable. Once installed, both household users see
the same plan.

## Personal allowance payments

Apply `supabase/migrations/20261028090120_personal_allowance_payments.sql`
for the per-person payment ledger. It uses the existing single-household public
access model, with RLS enabled and explicit select, insert and delete policies.
Each record contains the person (1 or 2), pay-month start date, actual payment
date and positive amount. Payment totals are separate from monthly entitlements
and household transfers; recording a payment does not create an expense.
Current/following pay-month selection scopes both personal payment histories
and household transfer schedules. Payments can be removed after confirmation
to correct an entry. The app uses local storage only when cloud mode is disabled;
cloud errors are shown and are never reported as a successful local save.

Personal allowance labels are configurable through the Allowance name fields.
Apply `supabase/migrations/20261028092209_personal_allowance_names.sql` to add
`allowance_name_1` and `allowance_name_2` to the existing allowances row. Names
can be saved individually using Save name beside each field (or Enter), or together
with Save allowances. Each name shows its save status. Names are trimmed, limited to 60 characters, and default
to Personal Allowance 1/2 if blank. Payment records continue to use the stable
person identifier, so renaming does not move or reset payment history.

## Household spending transfers

Apply `supabase/migrations/20261028093728_household_transfers.sql`. The table
stores a stable UUID, actual transfer date and positive amount. It follows the
existing single-household access model with RLS enabled and explicit read,
insert, update and delete policies. Dates scope records into the selected pay
month and week; transfers never become expenses or personal allowance payments.

The original weekly schedule stays visible. Adjusted weekly amounts use integer
pennies and distribute remaining budget by each remaining week's day count, with
rounding reconciled in the final week. Over-budget transfers reduce future weeks
immediately. Underspending carries forward after the week closes; the current
week's unused budget stays available until then. Projections assume all actual
transfers have been recorded. A monthly excess shows a warning and future
allowances stop at zero. Unused money at the end of the cycle is displayed but
is not automatically added to a different pay month's budget. Multiple dated
transfers, edit, confirmed removal, cloud error feedback and local-only fallback
are supported. The browser rejects future dates and dates outside the selected
cycle. Corrections recalculate projections immediately after persistence succeeds.

Calculation checks: `node --experimental-strip-types --test tests/householdTransfers.test.ts`.

Each personal allowance card also provides Save amount beside the monthly
amount section (Enter also saves). This persists only that person's amount
and displays unsaved, saving, saved or error feedback on the card. Other
unsaved names and amounts are left untouched. Saved amounts update the
existing allowance totals; payment records remain separate and unchanged.
