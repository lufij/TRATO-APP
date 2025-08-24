-- Cambia columnas VARCHAR(100) a TEXT en sellers
ALTER TABLE sellers ALTER COLUMN email TYPE TEXT;
ALTER TABLE sellers ALTER COLUMN business_category TYPE TEXT;
-- Si hay otras columnas que puedan exceder 100 caracteres, agrégalas aquí.
