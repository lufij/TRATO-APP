-- Diagnóstico simple: ver todos los productos y sus problemas
SELECT 
    id,
    name,
    stock_quantity,
    expires_at,
    is_available,
    created_at,
    -- Verificar cada condición por separado
    CASE WHEN stock_quantity > 0 THEN 'OK' ELSE 'FALLA: stock=' || stock_quantity END as check_stock,
    CASE WHEN expires_at >= NOW() THEN 'OK' ELSE 'FALLA: expirado hace ' || (NOW() - expires_at) END as check_no_expirado,
    CASE WHEN expires_at <= (CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 second') THEN 'OK' ELSE 'FALLA: expira después de hoy' END as check_expira_hoy,
    CASE WHEN is_available = true THEN 'OK' ELSE 'FALLA: is_available=false' END as check_disponible,
    -- Mostrar las fechas para comparar
    NOW() as fecha_actual,
    (CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 second') as limite_hoy
FROM daily_products
ORDER BY created_at DESC;
