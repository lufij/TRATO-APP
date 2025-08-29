-- =====================================================
-- 🔧 FIX DIRECTO - ACTIVAR CALCOMANÍAS PARA CARROS
-- =====================================================

-- UPDATE DIRECTO con ID confirmado
UPDATE public.products 
SET is_available = true,
    updated_at = NOW()
WHERE id = '1320b463-1db1-4f58-aa65-78b2cbb78a4d';

-- Verificación inmediata
SELECT 
    id,
    name,
    stock_quantity,
    is_public,
    is_available,
    updated_at
FROM public.products 
WHERE id = '1320b463-1db1-4f58-aa65-78b2cbb78a4d';
