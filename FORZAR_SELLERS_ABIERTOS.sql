-- FORZAR TODOS LOS SELLERS A ABIERTO SIN CONDICION
UPDATE sellers SET is_open_now = true;

-- Verificar que TODOS estén en true
SELECT 
    COUNT(*) as total_sellers,
    COUNT(*) FILTER (WHERE is_open_now = true) as sellers_abiertos,
    COUNT(*) FILTER (WHERE is_open_now = false OR is_open_now IS NULL) as sellers_cerrados_o_null
FROM sellers;

-- Ver sellers individuales
SELECT business_name, is_open_now FROM sellers;