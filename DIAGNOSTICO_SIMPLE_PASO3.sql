-- PASO 3: ¿Cuál es el status de la orden más reciente?
SELECT 
    id as "ID Orden",
    status as "Status Actual",
    customer_name as "Cliente",
    CASE 
        WHEN status = 'confirmed' THEN '✅ Status correcto para trigger'
        ELSE '❌ Status incorrecto: ' || status || ' (debería ser confirmed)'
    END as "¿Status OK para Trigger?"
FROM public.orders 
ORDER BY created_at DESC 
LIMIT 1;
