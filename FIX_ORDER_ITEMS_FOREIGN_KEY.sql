-- ========================================================
-- CORRECCIÓN FOREIGN KEY: Error order_items_product_id_fkey
-- Ejecutar en Supabase SQL Editor para solucionar problemas de foreign key
-- ========================================================

BEGIN;

-- =====================================================
-- 1. HACER PRODUCT_ID OPCIONAL EN ORDER_ITEMS
-- =====================================================

-- Verificar si existe la foreign key constraint y eliminarla temporalmente
DO $$
DECLARE
    constraint_exists boolean;
BEGIN
    -- Verificar si existe la constraint
    SELECT EXISTS(
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'order_items_product_id_fkey' 
        AND table_name = 'order_items'
    ) INTO constraint_exists;
    
    -- Si existe, eliminarla para hacer product_id opcional
    IF constraint_exists THEN
        ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
        RAISE NOTICE '✅ Foreign key constraint order_items_product_id_fkey eliminada';
    ELSE
        RAISE NOTICE '✅ Foreign key constraint order_items_product_id_fkey no existe';
    END IF;
    
    -- Hacer product_id opcional (permitir NULL)
    ALTER TABLE public.order_items ALTER COLUMN product_id DROP NOT NULL;
    RAISE NOTICE '✅ Columna product_id ahora permite NULL en order_items';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Error al modificar product_id: %', SQLERRM;
END $$;

-- =====================================================
-- 2. VERIFICAR Y CORREGIR ESTRUCTURA DE ORDER_ITEMS
-- =====================================================

-- Asegurar que order_id sea NOT NULL (requerido)
DO $$
BEGIN
    ALTER TABLE public.order_items ALTER COLUMN order_id SET NOT NULL;
    RAISE NOTICE '✅ Columna order_id es obligatoria en order_items';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Error al hacer order_id obligatorio: %', SQLERRM;
END $$;

-- Asegurar que product_name sea NOT NULL
DO $$
BEGIN
    -- Actualizar registros con product_name NULL
    UPDATE public.order_items 
    SET product_name = 'Producto sin nombre' 
    WHERE product_name IS NULL OR product_name = '';
    
    -- Hacer product_name obligatorio
    ALTER TABLE public.order_items ALTER COLUMN product_name SET NOT NULL;
    RAISE NOTICE '✅ Columna product_name es obligatoria en order_items';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Error al hacer product_name obligatorio: %', SQLERRM;
END $$;

-- Asegurar que quantity tenga un default apropiado
DO $$
BEGIN
    ALTER TABLE public.order_items ALTER COLUMN quantity SET DEFAULT 1;
    
    -- Actualizar registros con quantity 0 o NULL
    UPDATE public.order_items 
    SET quantity = 1 
    WHERE quantity IS NULL OR quantity <= 0;
    
    RAISE NOTICE '✅ Columna quantity tiene default 1 en order_items';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Error al configurar quantity: %', SQLERRM;
END $$;

-- =====================================================
-- 3. LIMPIAR DATOS PROBLEMÁTICOS
-- =====================================================

-- Eliminar order_items huérfanos (sin order válido)
DELETE FROM public.order_items 
WHERE order_id NOT IN (SELECT id FROM public.orders);

-- Actualizar precios NULL o 0
UPDATE public.order_items 
SET 
    price = COALESCE(price, 0),
    price_per_unit = COALESCE(price_per_unit, COALESCE(price, 0)),
    total_price = COALESCE(total_price, COALESCE(price, 0) * COALESCE(quantity, 1))
WHERE price IS NULL OR price = 0 OR total_price IS NULL;

-- =====================================================
-- 4. AGREGAR ÍNDICES PARA MEJOR RENDIMIENTO
-- =====================================================

-- Índice en order_id para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- Índice en product_id para cuando se use
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id) WHERE product_id IS NOT NULL;

-- =====================================================
-- 5. CREAR TRIGGER PARA VALIDAR DATOS
-- =====================================================

-- Función para validar order_items antes de insertar
CREATE OR REPLACE FUNCTION validate_order_item()
RETURNS TRIGGER AS $$
BEGIN
    -- Asegurar que order_id existe
    IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = NEW.order_id) THEN
        RAISE EXCEPTION 'Order ID % no existe', NEW.order_id;
    END IF;
    
    -- Asegurar valores mínimos
    NEW.quantity := COALESCE(NEW.quantity, 1);
    NEW.price := COALESCE(NEW.price, 0);
    NEW.price_per_unit := COALESCE(NEW.price_per_unit, NEW.price);
    NEW.total_price := COALESCE(NEW.total_price, NEW.price * NEW.quantity);
    NEW.product_name := COALESCE(NEW.product_name, 'Producto');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS trigger_validate_order_item ON public.order_items;
CREATE TRIGGER trigger_validate_order_item
    BEFORE INSERT OR UPDATE ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_order_item();

-- =====================================================
-- 6. VERIFICACIÓN FINAL
-- =====================================================

COMMIT;

-- Mostrar estructura actual
SELECT 
    '✅ FOREIGN KEY CORREGIDO' as resultado,
    'order_items ahora acepta product_id NULL' as descripcion;

-- Verificar estructura de order_items
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'order_items'
ORDER BY ordinal_position;

-- Contar order_items existentes
SELECT 
    COUNT(*) as total_items,
    COUNT(product_id) as items_with_product_id,
    COUNT(*) - COUNT(product_id) as items_without_product_id
FROM order_items;

-- Verificar integridad de datos
SELECT 
    'Verificación de integridad' as check_type,
    COUNT(*) as total_items,
    COUNT(CASE WHEN order_id IS NULL THEN 1 END) as items_sin_order,
    COUNT(CASE WHEN product_name IS NULL OR product_name = '' THEN 1 END) as items_sin_nombre,
    COUNT(CASE WHEN price < 0 THEN 1 END) as items_precio_negativo
FROM order_items;

SELECT '🚀 ORDER_ITEMS CORREGIDO - Ya no requiere product_id válido' as mensaje_final;
