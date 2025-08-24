-- Cambia columnas VARCHAR(100) a TEXT en sellers para evitar errores por límite de caracteres
ALTER TABLE sellers ALTER COLUMN email TYPE TEXT;
ALTER TABLE sellers ALTER COLUMN business_category TYPE TEXT;
ALTER TABLE sellers ALTER COLUMN business_name TYPE TEXT;
ALTER TABLE sellers ALTER COLUMN address TYPE TEXT;
-- Si hay otras columnas con VARCHAR(100), agrégalas aquí.
