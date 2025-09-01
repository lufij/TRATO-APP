-- DIAGNÓSTICO SIMPLE: Verificar tipos de entrega
SELECT 
    delivery_type,
    COUNT(*) as cantidad,
    COUNT(driver_id) as con_repartidor,
    COUNT(*) - COUNT(driver_id) as sin_repartidor
FROM orders 
GROUP BY delivery_type
ORDER BY cantidad DESC;
