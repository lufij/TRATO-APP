-- =====================================================
-- DIAGNÓSTICO SIMPLE: REPARTIDOR NO APARECE EN CONTADOR  
-- =====================================================
-- Verificar sin asumir estructura de columnas
-- =====================================================

-- 1. VERIFICAR ESTRUCTURA REAL DE LA TABLA DRIVERS
SELECT 
    'COLUMNAS REALES DE TABLA DRIVERS' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'drivers'
ORDER BY ordinal_position;

-- 2. CONTAR TODOS LOS REPARTIDORES (sin importar columnas)
SELECT 
    'TOTAL DE REPARTIDORES' as info,
    COUNT(*) as cantidad
FROM public.drivers;

-- 3. VER TODAS LAS COLUMNAS DE LOS PRIMEROS 3 REPARTIDORES  
SELECT 
    'PRIMEROS REPARTIDORES (TODAS LAS COLUMNAS)' as info;

SELECT *
FROM public.drivers
ORDER BY created_at DESC
LIMIT 3;

-- 4. VERIFICAR SI EXISTEN LAS COLUMNAS CRÍTICAS
SELECT 
    'VERIFICACIÓN COLUMNAS CRÍTICAS' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'drivers' 
            AND column_name = 'is_online'
        ) THEN '✅ is_online existe'
        ELSE '❌ is_online NO existe'
    END as columna_is_online,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'drivers' 
            AND column_name = 'is_active'
        ) THEN '✅ is_active existe'
        ELSE '❌ is_active NO existe'
    END as columna_is_active,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'drivers' 
            AND column_name = 'is_verified'
        ) THEN '✅ is_verified existe'
        ELSE '❌ is_verified NO existe'
    END as columna_is_verified;

-- 5. SIMULACIÓN BÁSICA DEL CONTADOR (solo si las columnas existen)
DO $$
DECLARE
    has_online BOOLEAN;
    has_active BOOLEAN; 
    has_verified BOOLEAN;
    contador INTEGER := 0;
BEGIN
    -- Verificar si las columnas existen
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'drivers' 
        AND column_name = 'is_online'
    ) INTO has_online;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'drivers' 
        AND column_name = 'is_active'
    ) INTO has_active;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'drivers' 
        AND column_name = 'is_verified'
    ) INTO has_verified;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔍 ANÁLISIS DE COLUMNAS PARA INDICADOR:';
    RAISE NOTICE 'is_online existe: %', has_online;
    RAISE NOTICE 'is_active existe: %', has_active;
    RAISE NOTICE 'is_verified existe: %', has_verified;
    RAISE NOTICE '';
    
    IF has_online AND has_active AND has_verified THEN
        EXECUTE 'SELECT COUNT(*) FROM public.drivers WHERE is_online = true AND is_active = true AND is_verified = true' INTO contador;
        RAISE NOTICE '✅ REPARTIDORES QUE APARECERÍAN EN INDICADOR: %', contador;
    ELSE
        RAISE NOTICE '❌ NO SE PUEDE CALCULAR - COLUMNAS FALTANTES';
    END IF;
END $$;

-- 6. VERIFICAR RELACIÓN CON USERS (para obtener info del usuario)
SELECT 
    'REPARTIDORES EN TABLA USERS' as info,
    COUNT(*) as repartidores_users
FROM public.users 
WHERE role = 'repartidor';

-- 7. MOSTRAR REPARTIDORES CON NOMBRE DE USERS
SELECT 
    'REPARTIDORES CON NOMBRES' as info;
    
SELECT 
    u.id,
    u.name,
    u.email,
    u.phone,
    u.created_at as user_created,
    CASE WHEN d.id IS NOT NULL THEN '✅ Tiene perfil driver' ELSE '❌ Sin perfil driver' END as tiene_perfil_driver
FROM public.users u
LEFT JOIN public.drivers d ON u.id = d.id
WHERE u.role = 'repartidor'
ORDER BY u.created_at DESC;
