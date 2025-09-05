-- 🔍 VERIFICACIÓN: Estructura real de tabla sellers
-- Problema: Campos email/address no llegan al frontend

-- 1️⃣ VERIFICAR QUE CAMPOS EXISTEN REALMENTE EN SELLERS
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'sellers' 
AND table_schema = 'public'
ORDER BY column_name;

-- 2️⃣ CONSULTA SIMPLE PARA VER QUE CAMPOS TIENEN DATOS
SELECT 
    id,
    business_name,
    business_phone,
    -- Estos campos podrían no existir:
    phone,
    email,
    address
FROM sellers 
WHERE id = '561711e7-a66e-4166-93f0-3038666c4096';
