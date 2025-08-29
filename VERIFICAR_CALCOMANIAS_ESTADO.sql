-- =====================================================
-- 🔍 VERIFICAR ESTADO ACTUAL DE CALCOMANÍAS
-- =====================================================

-- Verificar el estado actual del producto específico
SELECT 
    id,
    name,
    stock_quantity,
    is_public,
    is_available,
    updated_at,
    created_at
FROM public.products 
WHERE id = '1320b463-1db1-4f58-aa65-78b2cbb78a4d'
   OR name ILIKE '%calcomanía%carros%';

-- También buscar por nombre para asegurar que tenemos el producto correcto
SELECT 
    id,
    name,
    stock_quantity,
    is_public,
    is_available,
    updated_at
FROM public.products 
WHERE name ILIKE '%calcomanía%'
   OR name ILIKE '%calcomania%'
ORDER BY name;
