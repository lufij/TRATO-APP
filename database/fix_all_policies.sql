-- Diagnóstico y corrección de políticas de registro
-- Run this in Supabase SQL editor

-- 1. Primero desactivamos RLS temporalmente para diagnóstico
alter table public.users disable row level security;
alter table public.sellers disable row level security;
alter table public.drivers disable row level security;

-- 2. Eliminar todas las políticas existentes
drop policy if exists "Users can insert their own profile" on public.users;
drop policy if exists "Users can view own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Enable read access to all users" on public.users;
drop policy if exists "Enable insert for authenticated users" on public.users;
drop policy if exists "Enable update for users based on id" on public.users;

drop policy if exists "Sellers can insert their own profile" on public.sellers;
drop policy if exists "Sellers can view own profile" on public.sellers;
drop policy if exists "Sellers can update own profile" on public.sellers;
drop policy if exists "Enable read access to all sellers" on public.sellers;
drop policy if exists "Enable insert for authenticated users to sellers" on public.sellers;
drop policy if exists "Enable update for sellers based on id" on public.sellers;

-- 3. Crear políticas completamente permisivas
create policy "Allow all operations on users"
    on public.users
    for all
    using (true)
    with check (true);

create policy "Allow all operations on sellers"
    on public.sellers
    for all
    using (true)
    with check (true);

create policy "Allow all operations on drivers"
    on public.drivers
    for all
    using (true)
    with check (true);

-- 4. Otorgar todos los permisos necesarios
grant usage on schema public to anon;
grant usage on schema public to authenticated;

grant all on public.users to anon;
grant all on public.users to authenticated;

grant all on public.sellers to anon;
grant all on public.sellers to authenticated;

grant all on public.drivers to anon;
grant all on public.drivers to authenticated;

-- 5. Reactivar RLS con las nuevas políticas permisivas
alter table public.users enable row level security;
alter table public.sellers enable row level security;
alter table public.drivers enable row level security;
