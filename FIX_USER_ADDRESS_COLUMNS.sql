-- Arreglar columnas de dirección en tabla users
-- Ejecutar este script para asegurar que existan las columnas necesarias

DO $$
BEGIN
  -- Verificar y agregar address si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'address') THEN
    ALTER TABLE public.users ADD COLUMN address TEXT;
    RAISE NOTICE '✅ Columna address agregada a users';
  ELSE
    RAISE NOTICE '✅ Columna address ya existe en users';
  END IF;

  -- Verificar y agregar preferred_delivery_address si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'preferred_delivery_address') THEN
    ALTER TABLE public.users ADD COLUMN preferred_delivery_address TEXT;
    RAISE NOTICE '✅ Columna preferred_delivery_address agregada a users';
  ELSE
    RAISE NOTICE '✅ Columna preferred_delivery_address ya existe en users';
  END IF;

  -- Verificar y agregar primary_address si no existe (para compatibilidad)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'primary_address') THEN
    ALTER TABLE public.users ADD COLUMN primary_address TEXT;
    RAISE NOTICE '✅ Columna primary_address agregada a users';
  ELSE
    RAISE NOTICE '✅ Columna primary_address ya existe en users';
  END IF;

  RAISE NOTICE '✅ Script de direcciones completado exitosamente';
END
$$;
