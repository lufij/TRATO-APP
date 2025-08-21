-- Marketplace RLS policies (idempotent)
-- Purpose: allow buyers to read sellers/products data, while keeping user profiles protected.
-- How to run: copy/paste in Supabase SQL editor and run as Owner (SQL tab). Safe to re-run.

-- PRODUCTS: public read (anyone, even not logged in, can read catalog)
alter table public.products enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'products' and policyname = 'public read'
  ) then
    create policy "public read"
      on public.products
      for select
      using (true);
  end if;
end$$;

-- SELLERS: public read (list businesses)
alter table public.sellers enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sellers' and policyname = 'public read'
  ) then
    create policy "public read"
      on public.sellers
      for select
      using (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sellers' and policyname = 'owner insert'
  ) then
    create policy "owner insert"
      on public.sellers
      for insert
      to authenticated
      with check (id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sellers' and policyname = 'owner update'
  ) then
    create policy "owner update"
      on public.sellers
      for update
      to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;
end$$;

-- DAILY_PRODUCTS: only if it's a TABLE (skip if it's a VIEW)
do $$
declare
  is_table boolean := exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'daily_products' and c.relkind = 'r' -- 'r' = ordinary table
  );
  has_policy boolean := exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'daily_products' and policyname = 'public read'
  );
begin
  if is_table then
    execute 'alter table public.daily_products enable row level security';
    if not has_policy then
      execute 'create policy "public read" on public.daily_products for select using (true)';
    end if;
  end if;
end$$;

-- DRIVERS: allow owner to insert/update their driver profile; optionally public read if you want to show active drivers
alter table public.drivers enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'drivers' and policyname = 'owner insert'
  ) then
    create policy "owner insert"
      on public.drivers
      for insert
      to authenticated
      with check (id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'drivers' and policyname = 'owner update'
  ) then
    create policy "owner update"
      on public.drivers
      for update
      to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;
end$$;

-- USERS: only the owner can read/insert/update their own profile
alter table public.users enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users' and policyname = 'read own profile'
  ) then
    create policy "read own profile"
      on public.users
      for select
      to authenticated
      using (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users' and policyname = 'insert own profile'
  ) then
    create policy "insert own profile"
      on public.users
      for insert
      to authenticated
      with check (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users' and policyname = 'update own profile'
  ) then
    create policy "update own profile"
      on public.users
      for update
      to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;
end$$;

-- Optional sanity checks (won't error if tables are empty)
-- select count(*) as products from public.products;
-- select count(*) as sellers from public.sellers;
-- select * from public.users where id = auth.uid();
