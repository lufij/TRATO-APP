-- Fix for seller registration policies
-- Run this in Supabase SQL editor

-- Enable RLS on sellers table
alter table public.sellers enable row level security;

-- Allow sellers to insert their own profile
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'sellers' 
    and policyname = 'Sellers can insert their own profile'
  ) then
    create policy "Sellers can insert their own profile"
      on public.sellers
      for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

-- Allow sellers to read their own profile
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'sellers' 
    and policyname = 'Sellers can view own profile'
  ) then
    create policy "Sellers can view own profile"
      on public.sellers
      for select
      using (auth.uid() = user_id);
  end if;
end$$;

-- Allow sellers to update their own profile
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'sellers' 
    and policyname = 'Sellers can update own profile'
  ) then
    create policy "Sellers can update own profile"
      on public.sellers
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

-- Grant necessary permissions
grant usage on schema public to authenticated;
grant all on public.sellers to authenticated;
