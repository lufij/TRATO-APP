-- =====================================================
-- 🔧 FIX INMEDIATO: ACTIVAR CALCOMANÍAS PARA CARROS
-- =====================================================

-- Actualizar el producto para que esté disponible
UPDATE public.products 
SET is_available = true,
    updated_at = NOW()
WHERE id = '1320b463-1db1-4f58-aa65-78b2cbb78a4d'
  AND name = 'Calcomanías para carros';

-- Verificar que se actualizó correctamente
SELECT 
    name,
    stock_quantity,
    is_public,
    is_available,
    updated_at
FROM public.products 
WHERE id = '1320b463-1db1-4f58-aa65-78b2cbb78a4d';

-- ⚠️ IMPORTANTE: También vamos a verificar si hay otros productos con el mismo problema
SELECT 
    name,
    stock_quantity,
    is_public,
    is_available,
    CASE 
        WHEN stock_quantity > 0 AND is_public = true AND is_available = false 
        THEN '❌ NECESITA ACTIVARSE'
        WHEN stock_quantity > 0 AND is_public = true AND is_available = true 
        THEN '✅ ESTÁ BIEN'
        ELSE '⚠️ OTROS PROBLEMAS'
    END as estado
FROM public.products 
WHERE stock_quantity > 0 AND is_public = true
ORDER BY is_available, name;
