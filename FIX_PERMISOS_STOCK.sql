-- VERIFICACIÓN Y FIX DE PERMISOS PARA ACTUALIZACIÓN DE STOCK
-- ============================================================

-- 1. Verificar que existe la tabla daily_products y sus datos
SELECT 'Verificando tabla daily_products...' as paso;
SELECT id, name, stock_quantity, expires_at, created_at 
FROM daily_products 
WHERE name ILIKE '%tostada%'
ORDER BY created_at DESC;

-- 2. Verificar permisos RLS (Row Level Security)
SELECT 'Verificando RLS en daily_products...' as paso;
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'daily_products';

-- 3. Verificar políticas existentes
SELECT 'Verificando políticas de seguridad...' as paso;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'daily_products';

-- 4. CREAR POLÍTICA PERMISIVA PARA UPDATES (si no existe)
-- Esto permitirá que los usuarios autenticados puedan actualizar stock
DO $$
BEGIN
    -- Verificar si la política ya existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'daily_products' 
        AND policyname = 'Allow stock updates for authenticated users'
    ) THEN
        -- Crear la política
        EXECUTE 'CREATE POLICY "Allow stock updates for authenticated users" 
                 ON daily_products 
                 FOR UPDATE 
                 TO authenticated 
                 USING (true) 
                 WITH CHECK (true)';
        
        RAISE NOTICE 'Política de actualización creada exitosamente';
    ELSE
        RAISE NOTICE 'La política de actualización ya existe';
    END IF;
END
$$;

-- 5. ASEGURAR QUE RLS ESTÉ HABILITADO PERO PERMISIVO
ALTER TABLE daily_products ENABLE ROW LEVEL SECURITY;

-- 6. CREAR POLÍTICA PARA SELECTS (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'daily_products' 
        AND policyname = 'Allow read access to daily products'
    ) THEN
        EXECUTE 'CREATE POLICY "Allow read access to daily products" 
                 ON daily_products 
                 FOR SELECT 
                 TO authenticated 
                 USING (true)';
        
        RAISE NOTICE 'Política de lectura creada exitosamente';
    ELSE
        RAISE NOTICE 'La política de lectura ya existe';
    END IF;
END
$$;

-- 7. VERIFICAR QUE LAS POLÍTICAS SE CREARON CORRECTAMENTE
SELECT 'Verificando políticas después del fix...' as paso;
SELECT policyname, cmd, permissive, roles
FROM pg_policies 
WHERE tablename = 'daily_products';

-- 8. PRUEBA DE ACTUALIZACIÓN MANUAL
-- Este UPDATE debería funcionar si los permisos están correctos
SELECT 'Realizando prueba de actualización...' as paso;

-- Primero obtener el stock actual
SELECT id, name, stock_quantity as stock_antes
FROM daily_products 
WHERE name = 'Tostadas' 
LIMIT 1;

-- Luego hacer una actualización de prueba (disminuir en 1 y luego restaurar)
DO $$
DECLARE
    tostada_id uuid;
    stock_original integer;
BEGIN
    -- Obtener ID y stock actual
    SELECT id, stock_quantity INTO tostada_id, stock_original
    FROM daily_products 
    WHERE name = 'Tostadas' 
    LIMIT 1;
    
    IF tostada_id IS NOT NULL THEN
        -- Actualizar temporalmente
        UPDATE daily_products 
        SET stock_quantity = stock_quantity - 1 
        WHERE id = tostada_id;
        
        RAISE NOTICE 'Stock actualizado temporalmente de % a %', stock_original, stock_original - 1;
        
        -- Restaurar stock original
        UPDATE daily_products 
        SET stock_quantity = stock_original 
        WHERE id = tostada_id;
        
        RAISE NOTICE 'Stock restaurado a %', stock_original;
        RAISE NOTICE 'PRUEBA EXITOSA: Los permisos funcionan correctamente';
    ELSE
        RAISE NOTICE 'No se encontraron Tostadas en daily_products';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR EN PRUEBA: %', SQLERRM;
    RAISE NOTICE 'Problema de permisos detectado';
END
$$;

-- 9. RESULTADO FINAL
SELECT 'Estado final...' as paso;
SELECT id, name, stock_quantity as stock_final
FROM daily_products 
WHERE name = 'Tostadas';

-- 10. INSTRUCCIONES
SELECT '=== INSTRUCCIONES ===' as info;
SELECT 'Si ves "PRUEBA EXITOSA", los permisos están bien configurados' as instruccion;
SELECT 'Si ves "ERROR EN PRUEBA", hay problemas de permisos que necesitan más trabajo' as instruccion;
SELECT 'Después de ejecutar este SQL, prueba la aplicación nuevamente' as instruccion;
