-- 🔍 DIAGNÓSTICO: Sistema de calificaciones
-- Error 406: tabla ratings no accesible o no existe

-- 1️⃣ VERIFICAR SI TABLA RATINGS EXISTE
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'ratings';

-- 2️⃣ SI EXISTE, VER SU ESTRUCTURA
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'ratings' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3️⃣ VER SI HAY DATOS DE EJEMPLO
SELECT COUNT(*) as total_ratings
FROM ratings;

-- 4️⃣ VERIFICAR POLÍTICAS RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'ratings';

-- 5️⃣ SI NO EXISTE, VERIFICAR TABLAS RELACIONADAS CON RATINGS
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%rating%' OR table_name LIKE '%review%' OR table_name LIKE '%feedback%');
