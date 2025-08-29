-- PASO 4: ¿Los order_items tienen product_id?
WITH recent_order AS (
    SELECT id FROM public.orders ORDER BY created_at DESC LIMIT 1
)
SELECT 
    oi.product_name as "Producto",
    oi.quantity as "Cantidad",
    CASE 
        WHEN oi.product_id IS NOT NULL THEN '✅ Tiene product_id'
        ELSE '❌ product_id es NULL - ESTA ES LA CAUSA'
    END as "¿Product ID OK?"
FROM public.order_items oi
JOIN recent_order ro ON oi.order_id = ro.id;
