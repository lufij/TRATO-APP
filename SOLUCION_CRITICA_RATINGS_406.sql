-- 🔥 SOLUCIÓN CRÍTICA: Error 406 en Sistema de Calificaciones
-- PROBLEMA: Falta política INSERT en tabla ratings

-- 1️⃣ VERIFICAR RLS ACTUAL
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'ratings';

-- 2️⃣ VER POLÍTICAS EXISTENTES
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'ratings';

-- 3️⃣ AGREGAR POLÍTICA INSERT QUE FALTA (CRÍTICO!)
CREATE POLICY "Users can insert own ratings" ON ratings
    FOR INSERT 
    WITH CHECK (auth.uid() = rater_id);

-- 4️⃣ VERIFICAR QUE LA FUNCIÓN complete_rating EXISTE
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'complete_rating' 
AND routine_schema = 'public';

-- 5️⃣ PROBAR INSERT MANUAL PARA VERIFICAR PERMISOS
-- (Comentado, solo para testing si es necesario)
-- INSERT INTO ratings (
--     order_id, rater_id, rated_id, rating_type, rating, comment, status
-- ) VALUES (
--     'test-uuid', auth.uid(), 'test-rated-id', 'buyer_to_seller', 5, 'test', 'completed'
-- );

-- 6️⃣ VERIFICAR ESTRUCTURA TABLA RATINGS
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'ratings' 
ORDER BY ordinal_position;
