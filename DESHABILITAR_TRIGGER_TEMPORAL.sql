-- =====================================================
-- SOLUCIÓN TEMPORAL: DESHABILITAR TRIGGER PROBLEMÁTICO
-- =====================================================
-- El trigger automático está causando error 500
-- Vamos a deshabilitarlo temporalmente para que funcione el registro
-- =====================================================

-- DESHABILITAR TRIGGER PROBLEMÁTICO
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- VERIFICAR QUE SE ELIMINÓ
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users'
AND trigger_name = 'on_auth_user_created';

-- VERIFICAR FUNCIÓN SIGUE EXISTIENDO (por si la necesitamos después)
SELECT 
    proname as funcion_disponible,
    'La función sigue disponible para usar manualmente' as estado
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- MENSAJE DE CONFIRMACIÓN
SELECT 
    '🔧 TRIGGER DESHABILITADO TEMPORALMENTE' as resultado,
    'Ahora el registro debería funcionar sin errores 500' as instruccion,
    'El perfil se creará a través de la aplicación React' as metodo_alternativo;
