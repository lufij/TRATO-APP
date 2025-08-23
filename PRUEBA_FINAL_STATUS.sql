-- 🧪 PRUEBA FINAL SIMPLE
-- Solo probar si ya funciona el cambio de status

-- Mostrar órdenes disponibles
SELECT 
    'ÓRDENES DISPONIBLES AHORA' as info,
    id,
    status,
    driver_id
FROM public.orders 
WHERE status IN ('ready', 'confirmed')
AND driver_id IS NULL
LIMIT 3;

-- Probar cambio directo de status
UPDATE public.orders 
SET status = 'assigned'
WHERE id = (
    SELECT id 
    FROM public.orders 
    WHERE status IN ('ready', 'confirmed')
    AND driver_id IS NULL
    LIMIT 1
);

-- Verificar si el cambio funcionó
SELECT 
    'DESPUÉS DEL UPDATE' as info,
    id,
    status,
    driver_id
FROM public.orders 
WHERE status = 'assigned'
LIMIT 1;

-- Revertir el cambio
UPDATE public.orders 
SET status = 'ready'
WHERE status = 'assigned'
AND driver_id IS NULL;
