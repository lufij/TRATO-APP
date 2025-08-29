-- PASO 2: ¿Existe la función?
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'process_order_stock'
        ) THEN '✅ FUNCIÓN EXISTE'
        ELSE '❌ FUNCIÓN NO EXISTE - ESTA ES LA CAUSA'
    END as "Resultado Función";
