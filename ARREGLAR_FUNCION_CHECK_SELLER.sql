-- 🔧 ARREGLAR ERROR DE FUNCIÓN check_seller_can_publish

-- 1️⃣ ELIMINAR FUNCIÓN EXISTENTE PRIMERO
DROP FUNCTION IF EXISTS check_seller_can_publish(uuid);

-- 2️⃣ CREAR FUNCIÓN CON PARÁMETROS CORRECTOS
CREATE OR REPLACE FUNCTION check_seller_can_publish(seller_uuid UUID)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    seller_exists BOOLEAN;
BEGIN
    -- Verificar si el usuario existe y es vendedor
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE id = seller_uuid 
        AND role IN ('seller', 'admin')
    ) INTO seller_exists;
    
    RETURN seller_exists;
END;
$$;

-- 3️⃣ VERIFICAR LA FUNCIÓN
SELECT check_seller_can_publish('561711e7-a66e-4166-93f0-3038666c4096'::uuid) as can_publish_test;
