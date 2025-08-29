-- ELIMINAR PRODUCTO DUPLICADO EXPIRADO
-- Solo ejecutar si confirmamos que hay duplicados

-- 1. Verificar registros duplicados
SELECT id, name, stock_quantity, expires_at, 
       CASE WHEN expires_at < NOW() THEN 'EXPIRADO' ELSE 'DISPONIBLE' END as estado
FROM daily_products 
WHERE name = 'Rellenitos de Frijol'
ORDER BY created_at DESC;

-- 2. ELIMINAR EL REGISTRO EXPIRADO (ajustar ID según necesidad)
-- DELETE FROM daily_products WHERE id = 'd374329a-6903-4fca-b902-c9532aeff9eb';

-- 3. Verificar que solo quede uno
SELECT COUNT(*) as total_rellenitos FROM daily_products WHERE name = 'Rellenitos de Frijol';
