-- =================================================================
-- SCRIPT DE LIMPIEZA - ARCHIVOS DE UBICACIONES INCORRECTOS
-- =================================================================
-- Este archivo documenta qué archivos eliminar manualmente
-- =================================================================

-- ARCHIVOS A ELIMINAR MANUALMENTE:
-- 1. /database/add_user_addresses_sql.tsx (archivo incorrecto con extensión .tsx)
-- 2. /database/add_user_addresses.sql (versión con errores de sintaxis)

-- ARCHIVO CORRECTO A UTILIZAR:
-- /database/add_user_addresses_final.sql (ESTA versión corregida)

-- VERIFICACIÓN: Después de ejecutar el script correcto, ejecutar:
-- /database/verify_addresses_system.sql

-- NOTA: Este es solo un archivo de documentación
-- No ejecutar este SQL, solo las instrucciones de limpieza

SELECT 'Documentación - Archivos a limpiar manualmente' as nota;

-- Para verificar que el sistema funciona después de la instalación:
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name IN ('user_addresses', 'location_verification_log')
ORDER BY table_name, ordinal_position;