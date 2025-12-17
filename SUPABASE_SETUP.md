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
   due_date date not null,
   frequency text not null check (frequency in ('Monthly','Weekly','Yearly','One-time')),
   category text not null,
   paid boolean default false,
   account text not null,
   created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

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
