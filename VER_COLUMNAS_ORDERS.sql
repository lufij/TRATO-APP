-- CONSULTA PARA VER TODAS LAS COLUMNAS DE LA TABLA ORDERS
-- ========================================================
-- Ejecuta esta consulta primero para ver la estructura real

SELECT 
    ordinal_position as posicion,
    column_name as columna,
    data_type as tipo,
    is_nullable as acepta_null,
    column_default as valor_por_defecto,
    character_maximum_length as longitud_max
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ALTERNATIVA MÁS SIMPLE SI LA ANTERIOR NO FUNCIONA:
-- SELECT * FROM information_schema.columns WHERE table_name = 'orders';

-- TAMBIÉN PUEDES PROBAR ESTO PARA VER LA ESTRUCTURA:
-- \d orders
