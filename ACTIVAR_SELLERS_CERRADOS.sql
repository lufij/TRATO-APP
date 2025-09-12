-- ACTIVAR SELLERS QUE ESTÁN CERRADOS
UPDATE sellers SET is_open_now = true WHERE is_open_now = false;

-- Verificar sellers
SELECT 
    business_name,
    is_open_now
FROM sellers;