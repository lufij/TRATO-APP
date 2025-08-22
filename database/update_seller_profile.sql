-- Actualización de la tabla sellers para incluir campos de perfil profesional
-- Ejecutar en el editor SQL de Supabase

-- Primero respaldamos la tabla actual
create table if not exists public.sellers_backup as 
select * from public.sellers;

-- Agregamos las nuevas columnas necesarias
alter table public.sellers 
  add column if not exists cover_image_url text,
  add column if not exists business_category text,
  add column if not exists delivery_time integer default 30,
  add column if not exists delivery_radius numeric(5,2) default 5.0,
  add column if not exists minimum_order numeric(10,2) default 50.0,
  add column if not exists business_hours jsonb,
  add column if not exists is_open_now boolean default false,
  add column if not exists is_accepting_orders boolean default false,
  add column if not exists social_media jsonb default '{"facebook": null, "instagram": null, "whatsapp": null, "website": null}'::jsonb,
  add column if not exists location_verified boolean default false,
  add column if not exists latitude numeric(10,8),
  add column if not exists longitude numeric(11,8);

-- Actualizamos las políticas RLS para los nuevos campos
drop policy if exists "Enable read access to all sellers" on public.sellers;
create policy "Enable read access to all sellers"
  on public.sellers for select
  using (true);

drop policy if exists "Enable update for sellers based on id" on public.sellers;
create policy "Enable update for sellers based on id"
  on public.sellers for update
  using (auth.uid() = id);

-- Creamos índices para búsqueda
create index if not exists sellers_business_category_idx 
  on public.sellers(business_category);
create index if not exists sellers_location_idx 
  on public.sellers(latitude, longitude) 
  where latitude is not null and longitude is not null;

-- Función para actualizar is_open_now basado en business_hours
create or replace function public.update_seller_open_status()
returns trigger as $$
begin
  if NEW.business_hours is not null then
    -- Aquí iría la lógica para verificar el horario actual
    -- Por ahora lo dejamos en false por defecto
    NEW.is_open_now := false;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger para actualizar el estado
drop trigger if exists update_seller_status on public.sellers;
create trigger update_seller_status
  before insert or update of business_hours
  on public.sellers
  for each row
  execute function public.update_seller_open_status();

-- Función para calcular distancia entre coordenadas
create or replace function public.calculate_distance(
  lat1 float,
  lon1 float,
  lat2 float,
  lon2 float
)
returns float
language plpgsql
as $$
declare
  R float := 6371; -- Radio de la Tierra en kilómetros
  dlat float;
  dlon float;
  a float;
  c float;
begin
  -- Conversión a radianes
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  lat1 := radians(lat1);
  lat2 := radians(lat2);

  -- Fórmula de Haversine
  a := (sin(dlat/2))^2 + cos(lat1) * cos(lat2) * (sin(dlon/2))^2;
  c := 2 * asin(sqrt(a));
  return R * c;
end;
$$;
