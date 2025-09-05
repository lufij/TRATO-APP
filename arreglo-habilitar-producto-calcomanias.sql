-- 🔥 ARREGLO INMEDIATO: Habilitar producto deshabilitado
-- Producto: Calcomanías para moto
-- Problema: is_available = false (deshabilitado por vendedor)

UPDATE products 
SET 
    is_available = true,
    updated_at = NOW()
WHERE id = 'a6bb1db3-fabe-4e7e-a98e-1aa11ae502df';

-- ✅ VERIFICACIÓN POSTERIOR
SELECT 
    'DESPUÉS DEL ARREGLO' as estado,
    id,
    name,
    stock_quantity,
    is_public,
    is_available,
    updated_at,
    CASE 
        WHEN is_available = false THEN '❌ VENDOR DESHABILITÓ (No disponible)'
        WHEN stock_quantity = 0 THEN '❌ SIN STOCK (Agotado)'  
        WHEN stock_quantity <= 3 THEN '🔥 ÚLTIMAS UNIDADES'
        WHEN stock_quantity <= 5 THEN '⚠️ POCAS UNIDADES'
        ELSE '✅ DISPONIBLE CORRECTAMENTE'
    END as estado_frontend
FROM products 
WHERE id = 'a6bb1db3-fabe-4e7e-a98e-1aa11ae502df';
