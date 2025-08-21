-- Fix for user registration policies (safe version)
-- Run this in Supabase SQL editor

-- Enable RLS on users table
alter table public.users enable row level security;

-- Safely create insert policy
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'users' 
    and policyname = 'Users can insert their own profile'
  ) then
    create policy "Users can insert their own profile"
      on public.users
      for insert
      with check (auth.uid() = id);
  end if;
end$$;

-- Safely create select policy
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'users' 
    and policyname = 'Users can view own profile'
  ) then
    create policy "Users can view own profile"
      on public.users
      for select
      using (auth.uid() = id);
  end if;
end$$;

-- Safely create update policy
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'users' 
    and policyname = 'Users can update own profile'
  ) then
    create policy "Users can update own profile"
      on public.users
      for update
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end$$;

-- Grant necessary permissions (these commands are idempotent)
grant usage on schema public to authenticated;
grant all on public.users to authenticated;

-- Refresh the policies
alter table public.users force row level security;
