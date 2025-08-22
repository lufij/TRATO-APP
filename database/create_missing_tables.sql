-- CREAR TABLAS FALTANTES PARA EVITAR ERRORES 404 EN LA APP
-- Estructura mínima y políticas ultra-permisivas

-- Tabla: daily_products
CREATE TABLE IF NOT EXISTS public.daily_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    price NUMERIC,
    description TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- Tabla: conversations
CREATE TABLE IF NOT EXISTS public.conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    message TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- Tabla: usersStatusList
CREATE TABLE IF NOT EXISTS public.usersStatusList (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    status TEXT,
    updated_at TIMESTAMP DEFAULT now()
);

-- Políticas ultra-permisivas para todas
ALTER TABLE public.daily_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_products_all" ON public.daily_products FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.daily_products TO authenticated;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_all" ON public.conversations FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.conversations TO authenticated;

ALTER TABLE public.usersStatusList ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usersStatusList_all" ON public.usersStatusList FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.usersStatusList TO authenticated;

-- Verificación
SELECT 'Tablas y políticas creadas exitosamente' as status;
