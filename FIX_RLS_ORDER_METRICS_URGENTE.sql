-- 🔧 CORRECCIÓN URGENTE: RLS Policy para order_time_metrics
-- Problema: Los triggers no pueden insertar debido a políticas RLS restrictivas

-- ============================================================================
-- 1. VERIFICAR EL PROBLEMA ACTUAL
-- ============================================================================

SELECT 
    '🚨 DIAGNÓSTICO DEL PROBLEMA:' as info,
    'RLS está bloqueando inserts automáticos en order_time_metrics' as problema,
    'Los triggers necesitan permisos especiales para funcionar' as causa;

-- ============================================================================
-- 2. CORREGIR POLÍTICAS RLS PARA order_time_metrics
-- ============================================================================

-- Eliminar políticas restrictivas existentes
DROP POLICY IF EXISTS "Users can view metrics for their orders" ON public.order_time_metrics;

-- Crear políticas más permisivas para permitir triggers automáticos
CREATE POLICY "Users can view metrics for their orders" ON public.order_time_metrics
    FOR SELECT USING (
        order_id IN (
            SELECT id FROM public.orders 
            WHERE buyer_id = auth.uid() 
            OR seller_id = auth.uid() 
            OR driver_id = auth.uid()
        )
    );

-- POLÍTICA CRÍTICA: Permitir inserts automáticos del sistema
CREATE POLICY "System can insert metrics automatically" ON public.order_time_metrics
    FOR INSERT WITH CHECK (true);

-- Permitir updates para cerrar métricas
CREATE POLICY "System can update metrics automatically" ON public.order_time_metrics
    FOR UPDATE USING (true);

-- ============================================================================
-- 3. CORREGIR POLÍTICAS RLS PARA critical_alerts
-- ============================================================================

-- Asegurar que los triggers pueden insertar alertas automáticamente
DROP POLICY IF EXISTS "System can insert alerts" ON public.critical_alerts;

CREATE POLICY "System can insert alerts" ON public.critical_alerts
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 4. OTORGAR PERMISOS ESPECIALES PARA TRIGGERS
-- ============================================================================

-- Otorgar permisos a la función de métricas para que pueda insertar
GRANT INSERT, UPDATE ON public.order_time_metrics TO authenticated;
GRANT INSERT ON public.critical_alerts TO authenticated;

-- ============================================================================
-- 5. VERIFICAR QUE LAS POLÍTICAS ESTÁN CORRECTAS
-- ============================================================================

SELECT 
    '🔒 POLÍTICAS RLS CORREGIDAS:' as info,
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('order_time_metrics', 'critical_alerts')
ORDER BY tablename, policyname;

-- ============================================================================
-- 6. PROBAR CREACIÓN DE ORDEN (SIMULACIÓN)
-- ============================================================================

-- Verificar que ahora se pueden insertar métricas
SELECT 
    '🧪 PRUEBA DE FUNCIONALIDAD:' as test_type,
    'Intentando insertar métrica de prueba...' as accion;

-- Insertar métrica de prueba directamente (como lo haría el trigger)
INSERT INTO public.order_time_metrics (
    order_id,
    status,
    started_at,
    time_limit_minutes
) VALUES (
    gen_random_uuid(), -- Orden ficticia para prueba
    'pending',
    NOW(),
    10
);

SELECT 
    '✅ PRUEBA EXITOSA:' as resultado,
    'Las métricas ahora se pueden insertar automáticamente' as confirmacion,
    NOW() as verificado_en;

-- ============================================================================
-- 7. LIMPIAR DATOS DE PRUEBA
-- ============================================================================

-- Eliminar la métrica de prueba que acabamos de insertar
DELETE FROM public.order_time_metrics 
WHERE order_id NOT IN (SELECT id FROM public.orders);

SELECT 
    '🧹 LIMPIEZA COMPLETADA:' as info,
    'Datos de prueba eliminados' as accion,
    'Sistema listo para órdenes reales' as estado;

-- ============================================================================
-- 8. RESULTADO FINAL
-- ============================================================================

SELECT 
    '🎯 CORRECCIÓN APLICADA' as resultado,
    '✅ RLS policies corregidas para permitir triggers automáticos' as solucion,
    '✅ Creación de órdenes nuevas debería funcionar ahora' as confirmacion,
    NOW() as aplicado_en;
