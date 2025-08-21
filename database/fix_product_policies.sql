-- Fix for product loading and business status errors
-- IMPORTANTE: Este script debe ejecutarse en el SQL editor de Supabase
-- y asegurarse de que:
-- 1. Se ejecute en el proyecto de Supabase correcto (verificar URL)
-- 2. Las variables de entorno en Vercel (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY)
--    coincidan con el proyecto de Supabase
-- 3. Después de ejecutar el script, redespliega la aplicación en Vercel

-- Primero eliminar todas las políticas existentes para evitar conflictos
drop policy if exists "Enable read access to all products" on public.products;
drop policy if exists "Enable public read access to products" on public.products;
drop policy if exists "Enable sellers to manage their products" on public.products;

drop policy if exists "Give users read-only access to products bucket" on storage.objects;
drop policy if exists "Enable public read access to storage" on storage.objects;
drop policy if exists "Allow sellers to manage their product images" on storage.objects;
drop policy if exists "Allow sellers to delete their product images" on storage.objects;

drop policy if exists "Enable sellers to update their business status" on public.sellers;
drop policy if exists "Enable sellers to read all data" on public.sellers;
drop policy if exists "Allow public access to auth" on auth.users;
drop policy if exists "Allow users to access own auth data" on auth.users;

-- Asegurar que los productos sean accesibles para todos
create policy "Enable public read access to products"
    on public.products for select
    using (true);

create policy "Enable sellers to manage their products"
    on public.products for all
    using (auth.uid() = seller_id);

-- Asegurar acceso público a los datos básicos y auth
grant usage on schema public to anon;
grant usage on schema auth to anon;
grant select on public.products to anon;
grant select on public.sellers to anon;
grant execute on function auth.email() to anon;
grant execute on function auth.uid() to anon;
grant execute on function auth.role() to anon;
grant select on auth.users to anon;

-- Asegurar que los archivos sean accesibles públicamente
create policy "Enable public read access to storage"
    on storage.objects for select
    using (true);

create policy "Allow sellers to manage their product images"
    on storage.objects for insert
    with check (bucket_id = 'products');

create policy "Allow sellers to delete their product images"
    on storage.objects for delete
    using (bucket_id = 'products');

-- Dar acceso público al storage
grant usage on schema storage to anon;
grant select on storage.objects to anon;
grant select on storage.buckets to anon;

-- Agregar columna is_open si no existe
do $$
begin
    if not exists (select 1 from information_schema.columns 
                  where table_schema = 'public' 
                  and table_name = 'sellers' 
                  and column_name = 'is_open') then
        alter table public.sellers add column is_open boolean not null default false;
    end if;
end $$;

-- Asegurar que el estado del negocio sea accesible y actualizable
drop policy if exists "Enable sellers to read all data" on public.sellers;
drop policy if exists "Enable sellers to update their business status" on public.sellers;

create policy "Enable sellers to read all data"
    on public.sellers for select
    using (true);

create policy "Enable sellers to update their business status"
    on public.sellers for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- Asegurar que los vendedores puedan actualizar is_open y otros campos
grant all on public.sellers to authenticated;

-- Asegurar que RLS está habilitado
alter table public.products enable row level security;
alter table public.sellers enable row level security;

-- Permitir que los usuarios anónimos accedan a auth
create policy "Allow public access to auth"
    on auth.users for select
    using (true);

-- Permitir que los usuarios autenticados accedan a su propia información
create policy "Allow users to access own auth data"
    on auth.users for select
    using (auth.uid() = id);

-- Conceder permisos necesarios
grant usage on schema storage to authenticated;
grant all on storage.objects to authenticated;
grant all on public.products to authenticated;

-- Crear y configurar el bucket si no existe
do $$
declare
    bucket_exists boolean;
begin
    select exists(select 1 from storage.buckets where id = 'products') into bucket_exists;
    
    if not bucket_exists then
        insert into storage.buckets (id, name, public)
        values ('products', 'products', true);
    else
        -- Si existe, actualizar para asegurar que es público
        update storage.buckets
        set public = true
        where id = 'products';
    end if;
end $$;
