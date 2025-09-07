-- =====================================================
-- DIAGNÓSTICO CORREGIDO: REPARTIDOR NO APARECE EN CONTADOR
-- =====================================================
-- Verificar por qué el nuevo repartidor no se muestra en el indicador verde
-- =====================================================

-- 1. VERIFICAR ESTRUCTURA DE LA TABLA DRIVERS
SELECT 
    'ESTRUCTURA TABLA DRIVERS' as seccion;
    
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'drivers'
ORDER BY ordinal_position;

-- 2. VERIFICAR TODOS LOS REPARTIDORES Y SU ESTADO
SELECT 
    'TODOS LOS REPARTIDORES REGISTRADOS' as seccion;
    
SELECT 
    id,
    email,
    phone,
    is_online,
    is_active, 
    is_verified,
    vehicle_type,
    license_number,
    created_at,
    CASE 
        WHEN is_online AND is_active AND is_verified THEN '✅ CONTARÁ EN INDICADOR'
        WHEN NOT is_verified THEN '⚠️ NO VERIFICADO'
        WHEN NOT is_active THEN '⚠️ NO ACTIVO'
        WHEN NOT is_online THEN '⚠️ NO EN LÍNEA'
        ELSE '❌ OTRO PROBLEMA'
    END as estado_indicador
FROM public.drivers
ORDER BY created_at DESC;

-- 3. CONTAR REPARTIDORES POR CADA CONDICIÓN
SELECT 
    'ANÁLISIS DE CONTADORES' as seccion;

SELECT 
    (SELECT COUNT(*) FROM public.drivers) as total_repartidores,
    (SELECT COUNT(*) FROM public.drivers WHERE is_verified = true) as verificados,
    (SELECT COUNT(*) FROM public.drivers WHERE is_active = true) as activos,
    (SELECT COUNT(*) FROM public.drivers WHERE is_online = true) as en_linea,
    (SELECT COUNT(*) FROM public.drivers WHERE is_online = true AND is_active = true AND is_verified = true) as disponibles_para_indicador;

-- 4. REPARTIDORES CREADOS HOY
SELECT 
    'REPARTIDORES CREADOS HOY' as seccion;
    
SELECT 
    id,
    email,
    phone,
    is_online,
    is_active,
    is_verified,
    vehicle_type,
    created_at,
    CASE 
        WHEN is_online AND is_active AND is_verified THEN '✅ VISIBLE EN INDICADOR'
        ELSE '❌ NO VISIBLE - NECESITA: ' || 
             CASE WHEN NOT is_verified THEN 'VERIFICACIÓN ' ELSE '' END ||
             CASE WHEN NOT is_active THEN 'ACTIVACIÓN ' ELSE '' END ||
             CASE WHEN NOT is_online THEN 'ESTAR EN LÍNEA' ELSE '' END
    END as problema
FROM public.drivers 
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

-- 5. VERIFICAR RELACIÓN CON TABLA USERS
SELECT 
    'RELACIÓN DRIVERS - USERS' as seccion;
    
SELECT 
    d.id,
    d.email,
    u.name as nombre_usuario,
    d.is_online,
    d.is_active,
    d.is_verified,
    d.vehicle_type,
    d.created_at
FROM public.drivers d
LEFT JOIN public.users u ON d.id = u.id
WHERE u.role = 'repartidor'
ORDER BY d.created_at DESC;

-- 6. SIMULAR CONSULTA DEL INDICADOR
SELECT 
    'SIMULACIÓN CONSULTA INDICADOR' as seccion;

-- Método 2: Consulta directa (la que más usa el indicador)
SELECT COUNT(*) as repartidores_que_vera_indicador
FROM public.drivers
WHERE is_online = true 
AND is_active = true 
AND is_verified = true;

-- 7. VALORES POR DEFECTO DE NUEVOS REPARTIDORES
SELECT 
    'VALORES POR DEFECTO' as seccion;
    
SELECT 
    column_name,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'drivers'
AND column_name IN ('is_online', 'is_active', 'is_verified')
ORDER BY column_name;

-- 8. RECOMENDACIÓN DE SOLUCIÓN
SELECT 
    'SOLUCIÓN RECOMENDADA' as seccion,
    'Para que el nuevo repartidor aparezca en el indicador, debe tener:' as instruccion,
    'is_verified = true, is_active = true, is_online = true' as requisitos;
