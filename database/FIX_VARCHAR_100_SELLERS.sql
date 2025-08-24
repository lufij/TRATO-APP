-- Script para convertir campos VARCHAR(100) a TEXT en la tabla sellers
-- Esto evita el error "value too long for type character varying(100)"

-- Convertir campos de dirección y descripción a TEXT
ALTER TABLE sellers 
ALTER COLUMN business_address TYPE TEXT,
ALTER COLUMN business_description TYPE TEXT,
ALTER COLUMN address TYPE TEXT;

-- Verificar los cambios
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'sellers' 
AND column_name IN ('business_address', 'business_description', 'address');
