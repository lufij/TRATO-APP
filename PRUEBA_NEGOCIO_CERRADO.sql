-- ============================================
-- SQL DE PRUEBA: CERRAR UN NEGOCIO ESPECÍFICO
-- ============================================
-- Este script permite probar la funcionalidad cerrando un negocio individual

-- PASO 1: Ver todos los negocios disponibles
SELECT 
    id,
    business_name,
    is_open_now,
    weekly_hours IS NOT NULL as has_schedule
FROM sellers 
ORDER BY business_name;

-- PASO 2: Cerrar un negocio específico (reemplaza 'SELLER_ID_AQUI' con el ID real)
-- Descomenta y modifica esta línea:
/*
UPDATE sellers 
SET is_open_now = false 
WHERE id = 'SELLER_ID_AQUI';
*/

-- PASO 3: Verificar que solo ese negocio se cerró
SELECT 
    business_name,
    is_open_now,
    CASE 
        WHEN is_open_now = true THEN '✅ Abierto'
        WHEN is_open_now = false THEN '❌ Cerrado'
        ELSE '⚠️ No definido'
    END as estado
FROM sellers 
ORDER BY is_open_now DESC, business_name;

-- PASO 4: Para volver a abrir el negocio después de la prueba:
/*
UPDATE sellers 
SET is_open_now = true 
WHERE id = 'SELLER_ID_AQUI';
*/

-- ============================================
-- INSTRUCCIONES DE PRUEBA:
-- ============================================
-- 1. Ejecuta PASO 1 para ver los negocios
-- 2. Copia el ID del negocio que quieres cerrar
-- 3. Reemplaza 'SELLER_ID_AQUI' con el ID real en PASO 2
-- 4. Ejecuta PASO 2 para cerrar el negocio
-- 5. Recarga la app y verifica que solo los productos de ese negocio muestren "Cerrado hoy"
-- 6. Ejecuta PASO 4 para reabrir el negocio cuando termines de probar