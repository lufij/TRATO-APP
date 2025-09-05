-- 🔥 HABILITAR RLS EN TABLA RATINGS (CRÍTICO!)

-- 1️⃣ HABILITAR ROW LEVEL SECURITY
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- 2️⃣ VERIFICAR QUE SE HABILITÓ
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'ratings';

-- 3️⃣ VER POLÍTICAS EXISTENTES (deben estar todas activas ahora)
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'ratings';
