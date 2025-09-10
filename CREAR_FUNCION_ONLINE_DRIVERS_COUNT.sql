-- FUNCIÓN RPC PARA CONTAR CONDUCTORES ONLINE
-- Necesaria para el OnlineDriversIndicator

CREATE OR REPLACE FUNCTION get_online_drivers_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si la tabla drivers no existe, devolver 0
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'drivers') THEN
    RETURN 0;
  END IF;
  
  -- Contar conductores activos, verificados y en línea
  RETURN (
    SELECT COUNT(*)::integer
    FROM drivers
    WHERE is_online = true
      AND is_active = true
      AND is_verified = true
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Si hay cualquier error, devolver 0
    RETURN 0;
END;
$$;

-- Función de prueba para crear conductores fake (solo desarrollo)
CREATE OR REPLACE FUNCTION create_test_online_drivers()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo ejecutar si no hay conductores
  IF (SELECT COUNT(*) FROM drivers WHERE is_online = true) > 0 THEN
    RETURN 'Ya existen conductores online';
  END IF;
  
  -- Insertar algunos conductores de prueba
  INSERT INTO drivers (
    id, 
    first_name, 
    last_name, 
    phone, 
    license_number, 
    is_online, 
    is_active, 
    is_verified,
    created_at
  ) VALUES 
    (gen_random_uuid(), 'Carlos', 'Mendez', '50123456', 'LIC001', true, true, true, NOW()),
    (gen_random_uuid(), 'Ana', 'Lopez', '50234567', 'LIC002', true, true, true, NOW()),
    (gen_random_uuid(), 'Luis', 'Garcia', '50345678', 'LIC003', false, true, true, NOW())
  ON CONFLICT DO NOTHING;
  
  RETURN 'Conductores de prueba creados';
END;
$$;

-- Comentarios
COMMENT ON FUNCTION get_online_drivers_count() IS 'Cuenta conductores activos, verificados y en línea para el indicador';
COMMENT ON FUNCTION create_test_online_drivers() IS 'Crea conductores de prueba para testing (solo desarrollo)';
