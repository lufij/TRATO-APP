-- 🔍 VERIFICAR POLÍTICAS DESPUÉS DEL FIX

-- Ver todas las políticas de ratings
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'ratings';

-- Verificar RLS está habilitado
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'ratings';
