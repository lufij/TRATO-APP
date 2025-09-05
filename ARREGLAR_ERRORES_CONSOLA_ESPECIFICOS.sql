-- 🔧 ARREGLAR ERRORES ESPECÍFICOS DE CONSOLA

-- 1️⃣ RECREAR FUNCIÓN CON PARÁMETRO CORRECTO
DROP FUNCTION IF EXISTS check_seller_can_publish(uuid);

CREATE OR REPLACE FUNCTION check_seller_can_publish(seller_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    seller_exists BOOLEAN;
BEGIN
    -- Verificar si el usuario existe y es vendedor
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE id = seller_user_id 
        AND role IN ('seller', 'admin', 'vendedor')  -- Agregar 'vendedor' también
    ) INTO seller_exists;
    
    RETURN seller_exists;
END;
$$;

-- 2️⃣ CREAR FUNCIONES ADICIONALES QUE ESTÁN FALTANDO
CREATE OR REPLACE FUNCTION check_buyer_can_purchase(buyer_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    buyer_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE id = buyer_user_id 
        AND role IN ('buyer', 'admin', 'comprador')
    ) INTO buyer_exists;
    
    RETURN buyer_exists;
END;
$$;

CREATE OR REPLACE FUNCTION check_driver_can_work(driver_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    driver_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE id = driver_user_id 
        AND role IN ('driver', 'admin', 'repartidor')
    ) INTO driver_exists;
    
    RETURN driver_exists;
END;
$$;

-- 3️⃣ VERIFICAR QUE daily_products TENGA DATOS DE PRUEBA
-- (Opcional) Insertar un producto del día de ejemplo para testing
INSERT INTO daily_products (
    seller_id, 
    name, 
    description, 
    price, 
    stock_quantity, 
    category,
    expires_at
) VALUES (
    '561711e7-a66e-4166-93f0-3038666c4096',
    'Oferta del Día - Testing',
    'Producto de ejemplo para probar la funcionalidad',
    25.50,
    10,
    'Testing',
    NOW() + INTERVAL '1 day'
) ON CONFLICT DO NOTHING;

-- 4️⃣ VERIFICAR TODAS LAS FUNCIONES
SELECT 
    'check_seller_can_publish' as function_name,
    check_seller_can_publish('561711e7-a66e-4166-93f0-3038666c4096'::uuid) as result
UNION ALL
SELECT 
    'check_buyer_can_purchase' as function_name,
    check_buyer_can_purchase('4a09b7fd-8e78-4a11-a8f6-0ea805f15b4b'::uuid) as result
UNION ALL
SELECT 
    'check_driver_can_work' as function_name,
    check_driver_can_work('00b384bc-6a52-4f25-b691-1700abd7ad89'::uuid) as result;

-- 5️⃣ VERIFICAR daily_products
SELECT 
    COUNT(*) as total_daily_products,
    COUNT(CASE WHEN seller_id = '561711e7-a66e-4166-93f0-3038666c4096' THEN 1 END) as products_for_current_seller
FROM daily_products 
WHERE expires_at > NOW();
