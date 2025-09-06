-- ============================================================================
-- 🔍 ANÁLISIS COMPLETO: ¿POR QUÉ SIGUE APARECIENDO "PRODUCTO NO DISPONIBLE"?
-- ============================================================================

-- 🎯 VERIFICAR TODOS LOS ASPECTOS DEL PRODUCTO CERVEZA
SELECT 
    -- Datos básicos
    id,
    name,
    price,
    stock_quantity,
    is_available,
    
    -- Fechas críticas
    expires_at,
    created_at,
    
    -- Relaciones
    seller_id,
    
    -- Validaciones que hace BusinessProfile.tsx
    CASE WHEN is_available = true THEN '✅ IS_AVAILABLE OK' ELSE '❌ IS_AVAILABLE FALSE' END as check_available,
    CASE WHEN stock_quantity > 0 THEN '✅ STOCK OK' ELSE '❌ SIN STOCK' END as check_stock,
    CASE WHEN expires_at > NOW() THEN '✅ NO EXPIRADO' ELSE '❌ EXPIRADO' END as check_expiry,
    CASE WHEN seller_id IS NOT NULL THEN '✅ SELLER OK' ELSE '❌ SIN SELLER' END as check_seller,
    
    -- Cálculo final (BusinessProfile.tsx línea 251)
    CASE 
        WHEN is_available = true AND stock_quantity > 0 THEN '✅ DEBERÍA ESTAR DISPONIBLE'
        ELSE '❌ NO DISPONIBLE POR: ' || 
             CASE 
                WHEN is_available = false THEN 'is_available=false'
                WHEN stock_quantity <= 0 THEN 'stock_quantity=' || stock_quantity
                ELSE 'razón desconocida'
             END
    END as resultado_final

FROM daily_products 
WHERE name = 'Cerveza';

-- 🎯 VERIFICAR SI HAY MÚLTIPLES REGISTROS DE CERVEZA
SELECT 
    COUNT(*) as total_cervezas,
    COUNT(CASE WHEN is_available = true THEN 1 END) as disponibles,
    COUNT(CASE WHEN is_available = false THEN 1 END) as no_disponibles
FROM daily_products 
WHERE name = 'Cerveza';

-- 🎯 VER TODOS LOS REGISTROS DE CERVEZA (SI HAY VARIOS)
SELECT 
    id,
    name,
    is_available,
    stock_quantity,
    expires_at,
    created_at,
    ROW_NUMBER() OVER (ORDER BY created_at DESC) as registro_numero
FROM daily_products 
WHERE name = 'Cerveza'
ORDER BY created_at DESC;

-- ============================================================================
-- 🔍 POSIBLES CAUSAS DEL ERROR:
-- ============================================================================
-- 1. Múltiples registros: Frontend puede estar leyendo un registro diferente
-- 2. Cache del frontend: Datos no actualizados
-- 3. Condición en BusinessProfile.tsx: isAvailable = is_available && stock_quantity > 0
-- 4. Datos corruptos: seller_id null u otro problema
-- 5. Expiración: expires_at en el pasado
