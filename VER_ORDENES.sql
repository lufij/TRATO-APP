-- VER DETALLES COMPLETOS DE LA ORDEN ESPECÍFICA
SELECT 
    o.id as orden_id,
    o.status as estado,
    o.customer_name as cliente,
    o.seller_id,
    o.driver_id,
    o.total_amount as total,
    u_driver.name as nombre_repartidor,
    u_driver.email as email_repartidor,
    u_seller.name as nombre_vendedor
FROM orders o
LEFT JOIN users u_driver ON o.driver_id = u_driver.id
LEFT JOIN users u_seller ON o.seller_id = u_seller.id
WHERE o.id = 'c5b674fb-51a4-4671-bd44-2c1c2156f98b';
