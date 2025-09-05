-- 🎯 CONSULTA CRÍTICA: Verificar is_available del producto problema
-- ID específico: a6bb1db3-fabe-4e7e-a98e-1aa11ae502df

SELECT 
    'PRODUCTO PROBLEMA' as tipo,
    id,
    name,
    stock_quantity,
    is_public,
    is_available,  -- 🚨 CAMPO SOSPECHOSO
    seller_id,
    created_at,
    updated_at,
    -- Simulación de la lógica frontend
    CASE 
        WHEN is_available = false THEN '❌ VENDOR DESHABILITÓ (No disponible)'
        WHEN stock_quantity = 0 THEN '❌ SIN STOCK (Agotado)'  
        WHEN stock_quantity <= 3 THEN '🔥 ÚLTIMAS UNIDADES'
        WHEN stock_quantity <= 5 THEN '⚠️ POCAS UNIDADES'
        ELSE '✅ DISPONIBLE'
    END as estado_frontend
FROM products 
WHERE id = 'a6bb1db3-fabe-4e7e-a98e-1aa11ae502df';
