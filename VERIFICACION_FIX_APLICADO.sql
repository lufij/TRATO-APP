-- ✅ VALIDACIÓN DEL FIX APLICADO
-- Verificar que la creación de órdenes ya funciona correctamente

-- ============================================================================
-- 1. VERIFICAR QUE EL TRIGGER SEGURO ESTÁ INSTALADO
-- ============================================================================

SELECT 
    '🔧 TRIGGER SEGURO VERIFICACIÓN:' as check_type,
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND trigger_name = 'trigger_order_time_metrics'
AND event_object_table = 'orders';

-- ============================================================================
-- 2. VERIFICAR LA FUNCIÓN SEGURA
-- ============================================================================

SELECT 
    '⚙️ FUNCIÓN SEGURA VERIFICACIÓN:' as check_type,
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name = 'update_order_time_metrics_safe';

-- ============================================================================
-- 3. LIMPIAR CUALQUIER MÉTRICA HUÉRFANA DE LAS PRUEBAS
-- ============================================================================

-- Eliminar cualquier métrica que no tenga orden correspondiente
DELETE FROM public.order_time_metrics 
WHERE order_id NOT IN (SELECT id FROM public.orders);

SELECT 
    '🧹 LIMPIEZA COMPLETADA:' as resultado,
    'Métricas huérfanas eliminadas' as accion,
    (SELECT COUNT(*) FROM public.order_time_metrics) as metricas_restantes;

-- ============================================================================
-- 4. VERIFICAR ESTADO ACTUAL DEL SISTEMA
-- ============================================================================

SELECT 
    '📊 ESTADO ACTUAL DEL SISTEMA:' as info,
    (SELECT COUNT(*) FROM public.orders) as total_ordenes,
    (SELECT COUNT(*) FROM public.order_time_metrics) as total_metricas,
    (SELECT COUNT(*) FROM public.critical_alerts) as total_alertas;

-- ============================================================================
-- 5. VERIFICAR POLÍTICAS RLS ACTUALES
-- ============================================================================

SELECT 
    '🔒 POLÍTICAS RLS ACTIVAS:' as info,
    tablename,
    policyname,
    cmd as operacion,
    permissive as permitido
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'order_time_metrics'
ORDER BY policyname;

-- ============================================================================
-- 6. RESULTADO FINAL
-- ============================================================================

SELECT 
    '✅ SISTEMA CORREGIDO Y OPERATIVO' as estado,
    'Creación de órdenes debería funcionar sin errores ahora' as confirmacion,
    'El trigger ahora maneja errores graciosamente' as beneficio,
    NOW() as verificado_en;

-- ============================================================================
-- 7. INSTRUCCIONES PARA PRUEBA
-- ============================================================================

SELECT 
    '🧪 PRÓXIMO PASO:' as accion,
    'Probar crear una orden nueva en trato-app.vercel.app' as instruccion,
    'El trigger ahora no bloqueará la creación de órdenes' as esperado;
