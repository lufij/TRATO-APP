-- REVERSIÓN SIMPLE Y DIRECTA
-- Solo activar todos los sellers

UPDATE sellers SET is_open_now = true;

-- Verificar resultado
SELECT 
    id,
    business_name,
    is_open_now
FROM sellers 
ORDER BY business_name;