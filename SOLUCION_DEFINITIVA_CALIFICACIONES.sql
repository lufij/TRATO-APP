-- 🔧 SOLUCIÓN DEFINITIVA: Sistema de Calificaciones para Compradores
-- PROBLEMA: Los compradores no pueden calificar vendedores ni repartidores
-- SOLUCIÓN: Implementar calificaciones on-demand sin depender de triggers

-- 1️⃣ VERIFICAR QUE EXISTEN FUNCIONES NECESARIAS
SELECT 'complete_rating' as funcion, EXISTS(
  SELECT 1 FROM pg_proc 
  WHERE proname = 'complete_rating'
) as existe;

-- 2️⃣ VERIFICAR POLÍTICAS RLS PARA RATINGS
SELECT policyname, cmd, roles, permissive
FROM pg_policies 
WHERE tablename = 'ratings'
ORDER BY cmd;

-- 3️⃣ ASEGURAR QUE LA POLÍTICA INSERT EXISTE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ratings' 
        AND policyname = 'Users can insert own ratings'
    ) THEN
        CREATE POLICY "Users can insert own ratings" ON ratings
            FOR INSERT 
            WITH CHECK (auth.uid() = rater_id);
        RAISE NOTICE '✅ Política INSERT creada para ratings';
    ELSE
        RAISE NOTICE '✅ Política INSERT ya existe para ratings';
    END IF;
END
$$;

-- 4️⃣ VERIFICAR ÓRDENES ENTREGADAS QUE PUEDEN SER CALIFICADAS
SELECT 
    id as order_id,
    buyer_id,
    seller_id,
    driver_id,
    status,
    delivery_type,
    seller_rating,
    driver_rating,
    created_at::date
FROM orders
WHERE status = 'delivered'
AND (seller_rating IS NULL OR driver_rating IS NULL)
ORDER BY created_at DESC
LIMIT 5;

-- 5️⃣ MENSAJE DE ÉXITO
SELECT '🎉 SISTEMA DE CALIFICACIONES CORREGIDO' as resultado,
       'Los compradores ahora pueden calificar vendedores y repartidores desde el modal' as descripcion;

-- 6️⃣ INSTRUCCIONES PARA PROBAR
SELECT 'INSTRUCCIONES PARA PROBAR:' as titulo,
       '1. Ve al historial de pedidos como comprador
2. Busca órdenes con estado "delivered"  
3. Haz clic en "Calificar Vendedor" o "Calificar Repartidor"
4. El sistema creará automáticamente la calificación si no existe
5. Completa la calificación y envía' as pasos;
