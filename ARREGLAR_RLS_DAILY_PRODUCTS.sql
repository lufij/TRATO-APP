-- 🔧 ARREGLAR POLÍTICAS RLS PARA daily_products

-- 1️⃣ Verificar si RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
JOIN pg_class ON pg_class.relname = pg_tables.tablename 
WHERE tablename = 'daily_products';

-- 2️⃣ Habilitar RLS si no está habilitado
ALTER TABLE daily_products ENABLE ROW LEVEL SECURITY;

-- 3️⃣ Crear políticas RLS para daily_products
-- Política SELECT: Cualquiera puede ver productos del día activos
DROP POLICY IF EXISTS "daily_products_select_policy" ON daily_products;
CREATE POLICY "daily_products_select_policy" ON daily_products
    FOR SELECT
    USING (expires_at > NOW());

-- Política INSERT: Solo vendedores pueden crear productos del día
DROP POLICY IF EXISTS "daily_products_insert_policy" ON daily_products;
CREATE POLICY "daily_products_insert_policy" ON daily_products
    FOR INSERT
    WITH CHECK (
        auth.uid() = seller_id 
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('seller', 'admin', 'vendedor')
        )
    );

-- Política UPDATE: Solo el vendedor propietario puede actualizar
DROP POLICY IF EXISTS "daily_products_update_policy" ON daily_products;
CREATE POLICY "daily_products_update_policy" ON daily_products
    FOR UPDATE
    USING (
        auth.uid() = seller_id 
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('seller', 'admin', 'vendedor')
        )
    );

-- Política DELETE: Solo el vendedor propietario puede eliminar
DROP POLICY IF EXISTS "daily_products_delete_policy" ON daily_products;
CREATE POLICY "daily_products_delete_policy" ON daily_products
    FOR DELETE
    USING (
        auth.uid() = seller_id 
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('seller', 'admin', 'vendedor')
        )
    );

-- 4️⃣ Verificar que las políticas se crearon correctamente
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'daily_products'
ORDER BY policyname;

-- 5️⃣ Verificar que podemos acceder a los datos
SELECT 
    id,
    seller_id,
    name,
    price,
    stock_quantity,
    expires_at,
    created_at
FROM daily_products 
WHERE expires_at > NOW()
ORDER BY created_at DESC;
