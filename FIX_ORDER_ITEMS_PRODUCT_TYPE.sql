-- =====================================================
-- FIX ÓRDENES - AGREGAR PRODUCT_TYPE A ORDER_ITEMS
-- =====================================================

-- 1. Agregar columna product_type a order_items
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'regular';

-- 2. Actualizar órdenes existentes con NULL product_id
UPDATE public.order_items 
SET product_type = 'regular' 
WHERE product_type IS NULL;

-- 3. Crear índice para mejor performance
CREATE INDEX IF NOT EXISTS idx_order_items_product_type 
ON public.order_items(product_type);

-- 4. Verificar que se agregó correctamente
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name = 'product_type';

-- 5. Mostrar estructura actualizada
SELECT 
    'ESTRUCTURA ACTUALIZADA:' as status,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'order_items' 
ORDER BY ordinal_position;
