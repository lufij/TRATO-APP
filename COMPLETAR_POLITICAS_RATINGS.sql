-- 🔍 VERIFICAR TODAS LAS POLÍTICAS DE RATINGS

-- Ver TODAS las políticas existentes
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'ratings'
ORDER BY cmd;

-- Agregar las políticas que faltan si no existen
CREATE POLICY "Users can view related ratings" ON ratings
    FOR SELECT USING (auth.uid() = rater_id OR auth.uid() = rated_id);

CREATE POLICY "Users can update own ratings" ON ratings
    FOR UPDATE USING (auth.uid() = rater_id);

-- Verificar nuevamente todas las políticas
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'ratings'
ORDER BY cmd;
