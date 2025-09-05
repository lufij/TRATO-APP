-- 🔍 DIAGNÓSTICO: Datos de contacto real del vendedor
-- Problema: Panel comprador muestra datos incorrectos en sección "Info > Contacto"
-- Objetivo: Encontrar los datos reales del vendedor para mostrarlos correctamente

-- 1️⃣ DATOS DEL VENDEDOR ESPECÍFICO (ID que conocemos del producto)
SELECT 
    '1️⃣ DATOS VENDEDOR' as seccion,
    s.id as seller_id,
    s.business_name,
    s.business_description,
    s.business_phone,
    s.business_address,
    s.email,
    s.phone,
    s.address,
    s.created_at,
    s.updated_at
FROM sellers s
WHERE s.id = '561711e7-a66e-4166-93f0-3038666c4096';

-- 2️⃣ DATOS DEL USUARIO ASOCIADO AL VENDEDOR
SELECT 
    '2️⃣ DATOS USUARIO VENDEDOR' as seccion,
    u.id as user_id,
    u.name,
    u.email,
    u.phone,
    u.address,
    u.avatar_url,
    u.created_at,
    u.updated_at
FROM users u
INNER JOIN sellers s ON u.id = s.id  -- 🔧 CORREGIDO: usar s.id directamente
WHERE s.id = '561711e7-a66e-4166-93f0-3038666c4096';

-- 3️⃣ VERIFICAR ESTRUCTURA COMPLETA DE TABLAS
SELECT 
    '3️⃣ COLUMNAS SELLERS' as seccion,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'sellers' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 
    '4️⃣ COLUMNAS USERS' as seccion,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5️⃣ TODOS LOS CAMPOS POSIBLES DE CONTACTO
SELECT 
    '5️⃣ TODOS DATOS CONTACTO' as seccion,
    s.business_name,
    s.business_phone,
    s.phone as seller_phone,
    s.business_address,
    s.address as seller_address,
    s.email as seller_email,
    u.phone as user_phone,
    u.email as user_email,
    u.address as user_address,
    u.name as user_name
FROM sellers s
LEFT JOIN users u ON s.id = u.id  -- 🔧 CORREGIDO: usar s.id = u.id
WHERE s.id = '561711e7-a66e-4166-93f0-3038666c4096';
