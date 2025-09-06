-- VERIFICAR QUE LA FUNCION SQL SE ACTUALIZO CORRECTAMENTE
-- ========================================================

-- 1. VERIFICAR QUE LA FUNCION validate_and_get_product_data EXISTE
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'validate_and_get_product_data'
AND routine_schema = 'public';

-- 2. PROBAR LA FUNCION DIRECTAMENTE CON UN PRODUCTO DEL DIA
-- (Reemplaza el UUID por el ID del producto "ropa para niña" o el que acabas de crear)
SELECT * FROM validate_and_get_product_data(
    -- UUID del producto que acabas de crear (copia el ID desde la imagen)
    '00000000-0000-0000-0000-000000000000'::UUID, -- REEMPLAZAR POR ID REAL
    'daily'::TEXT
);

-- 3. VERIFICAR TODOS LOS PRODUCTOS DEL DIA ACTUALES
SELECT 
    'PRODUCTOS DEL DIA ACTUALES' as seccion,
    id,
    name,
    is_available,
    stock_quantity,
    expires_at > NOW() as no_expirado,
    CASE 
        WHEN is_available = true AND stock_quantity > 0 AND expires_at > NOW()
        THEN 'DEBERIA FUNCIONAR'
        ELSE 'NO FUNCIONARA'
    END as estado_validacion
FROM daily_products 
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;

-- 4. VERIFICAR LA FUNCION add_to_cart_safe TAMBIEN EXISTE
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'add_to_cart_safe'
AND routine_schema = 'public';
