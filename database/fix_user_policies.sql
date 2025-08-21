-- Fix for user registration policies
-- Run this in Supabase SQL editor

-- Enable RLS on users table
alter table public.users enable row level security;

-- Allow users to insert their own profile
create policy "Users can insert their own profile"
  on public.users
  for insert
  with check (auth.uid() = id);

-- Allow users to read their own profile
create policy "Users can view own profile"
  on public.users
  for select
  using (auth.uid() = id);

-- Allow users to update their own profile
create policy "Users can update own profile"
  on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Grant necessary permissions
grant usage on schema public to authenticated;
grant all on public.users to authenticated;

-- Refresh the policies
alter table public.users force row level security;
