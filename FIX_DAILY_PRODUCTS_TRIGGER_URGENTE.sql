-- =====================================================
-- FIX URGENTE: TRIGGER DE PRODUCTOS DEL DÍA INCORRECTO
-- =====================================================
-- Error: record "new" has no field "product_id"
-- Causa: El trigger está buscando product_id que no existe en daily_products

-- 🗑️ ELIMINAR TRIGGER PROBLEMÁTICO
DROP TRIGGER IF EXISTS new_daily_product_trigger ON daily_products;
DROP FUNCTION IF EXISTS notify_new_daily_product();

-- ✅ CREAR TRIGGER CORREGIDO
CREATE OR REPLACE FUNCTION notify_new_daily_product()
RETURNS TRIGGER AS $$
DECLARE
    seller_name TEXT;
BEGIN
    -- CORREGIDO: Usar NEW.seller_id directamente y NEW.name para el producto
    SELECT u.name INTO seller_name
    FROM users u 
    WHERE u.id = NEW.seller_id;
    
    -- Log del nuevo producto del día
    RAISE NOTICE '🆕 Nuevo producto del día: % por %', NEW.name, COALESCE(seller_name, 'Vendedor desconocido');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear trigger con función corregida
CREATE TRIGGER new_daily_product_trigger
    AFTER INSERT ON daily_products
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_daily_product();

-- ✅ VERIFICAR QUE FUNCIONA
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger de productos del día CORREGIDO';
    RAISE NOTICE '📋 Ahora usa NEW.name y NEW.seller_id correctamente';
END $$;

SELECT 'Trigger de daily_products corregido exitosamente' as resultado;
