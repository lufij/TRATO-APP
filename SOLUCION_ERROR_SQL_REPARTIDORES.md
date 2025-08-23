# 🔧 SOLUCIÓN RÁPIDA - ERROR SQL REPARTIDORES

## ❌ El Problema
El error `42P13: cannot change return type of existing function` indica que ya existe una función con el mismo nombre pero diferentes parámetros.

## ✅ Solución Paso a Paso

### PASO 1: Ir a Supabase Dashboard
1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto TRATO
3. Ve a **SQL Editor** (ícono de base de datos)

### PASO 2: Ejecutar Script de Reparación
Copia y pega **TODO** el contenido del archivo `REPARACION_RAPIDA_REPARTIDORES.sql`:

```sql
-- ❌ PASO 1: Eliminar funciones conflictivas
DROP FUNCTION IF EXISTS public.update_order_status CASCADE;

-- ✅ PASO 2: Crear función simple para actualizar estado
CREATE OR REPLACE FUNCTION public.update_delivery_status(
    order_uuid UUID,
    new_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE orders 
    SET 
        status = new_status,
        picked_up_at = CASE 
            WHEN new_status = 'picked_up' AND picked_up_at IS NULL THEN NOW()
            ELSE picked_up_at
        END,
        delivered_at = CASE 
            WHEN new_status = 'delivered' AND delivered_at IS NULL THEN NOW()
            ELSE delivered_at
        END,
        updated_at = NOW()
    WHERE id = order_uuid;
    
    RETURN FOUND;
END;
$$;

-- ✅ PASO 3: Permisos
GRANT EXECUTE ON FUNCTION public.update_delivery_status(UUID, TEXT) TO authenticated;

-- ✅ PASO 4: Función historial simple
CREATE OR REPLACE FUNCTION public.get_delivery_history(driver_uuid UUID)
RETURNS TABLE (
    order_id UUID,
    delivery_fee NUMERIC,
    delivered_at TIMESTAMPTZ,
    customer_name TEXT,
    business_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.delivery_fee,
        o.delivered_at,
        o.customer_name,
        COALESCE(b.name, 'Restaurante') as business_name
    FROM orders o
    LEFT JOIN businesses b ON o.business_id = b.id
    WHERE o.driver_id = driver_uuid
        AND o.status = 'delivered'
    ORDER BY o.delivered_at DESC;
END;
$$;

-- ✅ PASO 5: Permisos historial
GRANT EXECUTE ON FUNCTION public.get_delivery_history(UUID) TO authenticated;
```

### PASO 3: Hacer Click en "RUN"
- Debería ejecutarse sin errores
- Verás mensajes de confirmación

### PASO 4: Verificar (Opcional)
Ejecuta este código para verificar que las funciones se crearon:

```sql
SELECT proname as function_name
FROM pg_proc 
WHERE proname IN ('update_delivery_status', 'get_delivery_history');
```

### PASO 5: Probar la Aplicación
1. El servidor ya está corriendo en: http://localhost:5174/
2. Ve a: http://localhost:5174/driver-dashboard
3. Las funciones ahora deberían funcionar correctamente

## 🎯 ¿Qué Cambió?

1. **Función anterior**: `update_order_status` (conflictiva)
2. **Función nueva**: `update_delivery_status` (simple y funcional)

3. **Función anterior**: `get_driver_delivery_history` (compleja)
4. **Función nueva**: `get_delivery_history` (simple y eficiente)

## ✅ Estado Actual

- ✅ Componente DriverDashboard actualizado
- ✅ Funciones SQL simplificadas y sin conflictos
- ✅ Sistema listo para probar

**¡El sistema debería funcionar perfectamente ahora!** 🚀
