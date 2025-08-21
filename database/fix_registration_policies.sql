-- Fix for registration policies with more permissive rules
-- Run this in Supabase SQL editor

-- First drop existing policies to start fresh
drop policy if exists "Users can insert their own profile" on public.users;
drop policy if exists "Users can view own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Sellers can insert their own profile" on public.sellers;
drop policy if exists "Sellers can view own profile" on public.sellers;
drop policy if exists "Sellers can update own profile" on public.sellers;

-- Enable RLS on both tables
alter table public.users enable row level security;
alter table public.sellers enable row level security;

-- More permissive policies for users table
create policy "Enable read access to all users"
    on public.users for select
    using (true);

create policy "Enable insert for authenticated users"
    on public.users for insert
    with check (auth.role() = 'authenticated');

create policy "Enable update for users based on id"
    on public.users for update
    using (auth.uid() = id);

-- More permissive policies for sellers table
create policy "Enable read access to all sellers"
    on public.sellers for select
    using (true);

create policy "Enable insert for authenticated users to sellers"
    on public.sellers for insert
    with check (auth.role() = 'authenticated');

create policy "Enable update for sellers based on id"
    on public.sellers for update
    using (auth.uid() = id);

-- Grant necessary permissions
grant usage on schema public to authenticated;
grant all on public.users to authenticated;
grant all on public.sellers to authenticated;

-- Ensure policies are enforced
alter table public.users force row level security;
alter table public.sellers force row level security;
