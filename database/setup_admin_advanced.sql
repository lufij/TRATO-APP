-- CONFIGURACIÓN AVANZADA DEL PANEL ADMINISTRATIVO
-- Este script mejora el sistema de administración de TRATO

BEGIN;

-- 0. Primero agregar el rol 'admin' al check constraint de users
DO $$
BEGIN
    -- Eliminar constraint existente si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_role_check' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE public.users DROP CONSTRAINT users_role_check;
        RAISE NOTICE 'Constraint users_role_check eliminado';
    END IF;
    
    -- Agregar nuevo constraint que incluye 'admin'
    ALTER TABLE public.users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('comprador', 'vendedor', 'repartidor', 'admin'));
    
    RAISE NOTICE 'Constraint users_role_check actualizado para incluir admin';
END $$;

-- 1. Agregar tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS public.system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insertar configuraciones por defecto
INSERT INTO public.system_config (key, value, description) VALUES
    ('maintenance_mode', 'false', 'Modo mantenimiento del sistema'),
    ('allow_registrations', 'true', 'Permitir nuevos registros de usuarios'),
    ('max_orders_per_day', '100', 'Máximo número de órdenes por día'),
    ('delivery_radius_km', '5', 'Radio de entrega en kilómetros'),
    ('platform_commission_percent', '5', 'Comisión de la plataforma en porcentaje'),
    ('delivery_fee_base', '10', 'Tarifa base de entrega en Quetzales'),
    ('min_order_amount', '50', 'Monto mínimo de orden en Quetzales')
ON CONFLICT (key) DO NOTHING;

-- 3. Tabla de logs de actividad administrativa
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    target_table TEXT,
    target_id UUID,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Función para actualizar configuración del sistema
CREATE OR REPLACE FUNCTION update_system_config(
    config_key TEXT,
    config_value TEXT,
    admin_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar que el usuario es administrador
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = admin_user_id 
        AND (role = 'admin' OR email = 'trato.app1984@gmail.com')
    ) THEN
        RAISE EXCEPTION 'No tienes permisos de administrador';
    END IF;

    -- Actualizar configuración
    UPDATE public.system_config 
    SET 
        value = config_value,
        updated_by = admin_user_id,
        updated_at = NOW()
    WHERE key = config_key;

    -- Log de la acción
    INSERT INTO public.admin_logs (
        admin_id, 
        action, 
        target_table, 
        details
    ) VALUES (
        admin_user_id,
        'update_system_config',
        'system_config',
        jsonb_build_object('key', config_key, 'new_value', config_value)
    );

    RETURN TRUE;
END;
$$;

-- 5. Función para aprobar múltiples repartidores
CREATE OR REPLACE FUNCTION approve_multiple_drivers(
    driver_ids UUID[],
    admin_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    approved_count INTEGER := 0;
    driver_id UUID;
BEGIN
    -- Verificar permisos de administrador
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = admin_user_id 
        AND (role = 'admin' OR email = 'trato.app1984@gmail.com')
    ) THEN
        RAISE EXCEPTION 'No tienes permisos de administrador';
    END IF;

    -- Aprobar cada repartidor
    FOREACH driver_id IN ARRAY driver_ids
    LOOP
        UPDATE public.users 
        SET 
            is_verified = true,
            is_active = true,
            updated_at = NOW()
        WHERE id = driver_id 
        AND role = 'repartidor'
        AND is_verified = false;
        
        IF FOUND THEN
            approved_count := approved_count + 1;
            
            -- Log de la acción
            INSERT INTO public.admin_logs (
                admin_id, 
                action, 
                target_table, 
                target_id,
                details
            ) VALUES (
                admin_user_id,
                'approve_driver',
                'users',
                driver_id,
                jsonb_build_object('status', 'approved')
            );
        END IF;
    END LOOP;

    RETURN approved_count;
END;
$$;

-- 6. Función para obtener estadísticas administrativas en tiempo real
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stats JSONB;
    today_start TIMESTAMP WITH TIME ZONE;
    total_users_count INTEGER := 0;
    active_users_count INTEGER := 0;
    total_businesses_count INTEGER := 0;
    pending_businesses_count INTEGER := 0;
    total_drivers_count INTEGER := 0;
    active_drivers_count INTEGER := 0;
    pending_drivers_count INTEGER := 0;
    orders_today_count INTEGER := 0;
    revenue_today_amount DECIMAL := 0;
BEGIN
    today_start := date_trunc('day', NOW());

    -- Obtener estadísticas de usuarios de forma segura
    BEGIN
        SELECT COUNT(*) INTO total_users_count FROM public.users;
        SELECT COUNT(*) INTO active_users_count FROM public.users WHERE status = 'active' OR status IS NULL;
        SELECT COUNT(*) INTO total_drivers_count FROM public.users WHERE role = 'repartidor';
        SELECT COUNT(*) INTO active_drivers_count FROM public.users WHERE role = 'repartidor' AND is_active = true;
        SELECT COUNT(*) INTO pending_drivers_count FROM public.users WHERE role = 'repartidor' AND is_verified = false;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error obteniendo estadísticas de usuarios: %', SQLERRM;
    END;

    -- Obtener estadísticas de negocios de forma segura
    BEGIN
        SELECT COUNT(*) INTO total_businesses_count FROM public.sellers WHERE is_verified = true;
        SELECT COUNT(*) INTO pending_businesses_count FROM public.sellers WHERE is_verified = false;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error obteniendo estadísticas de negocios: %', SQLERRM;
        total_businesses_count := 0;
        pending_businesses_count := 0;
    END;

    -- Obtener estadísticas de órdenes de forma segura
    BEGIN
        SELECT COUNT(*) INTO orders_today_count FROM public.orders WHERE created_at >= today_start;
        SELECT COALESCE(SUM(total), 0) INTO revenue_today_amount 
        FROM public.orders 
        WHERE created_at >= today_start AND status = 'delivered';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error obteniendo estadísticas de órdenes: %', SQLERRM;
        orders_today_count := 0;
        revenue_today_amount := 0;
    END;

    -- Construir objeto JSON con todas las estadísticas
    SELECT jsonb_build_object(
        'total_users', total_users_count,
        'active_users', active_users_count,
        'total_businesses', total_businesses_count,
        'pending_businesses', pending_businesses_count,
        'total_drivers', total_drivers_count,
        'active_drivers', active_drivers_count,
        'pending_drivers', pending_drivers_count,
        'orders_today', orders_today_count,
        'revenue_today', revenue_today_amount,
        'system_health', jsonb_build_object(
            'database_connection', 'ok',
            'last_updated', NOW(),
            'errors_caught', CASE 
                WHEN total_businesses_count = 0 AND pending_businesses_count = 0 THEN 'sellers_table_issue'
                WHEN orders_today_count = 0 AND revenue_today_amount = 0 THEN 'orders_table_issue'
                ELSE 'none'
            END
        )
    ) INTO stats;

    RETURN stats;
END;
$$;

-- 7. Función para obtener actividad reciente
CREATE OR REPLACE FUNCTION get_recent_admin_activity(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
    id UUID,
    admin_email TEXT,
    action TEXT,
    target_table TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        u.email,
        al.action,
        al.target_table,
        al.details,
        al.created_at
    FROM public.admin_logs al
    LEFT JOIN public.users u ON al.admin_id = u.id
    ORDER BY al.created_at DESC
    LIMIT limit_count;
END;
$$;

-- 8. Crear políticas RLS para las nuevas tablas
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Solo administradores pueden ver/editar configuración
CREATE POLICY "Admin can manage system config" ON public.system_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND (users.role = 'admin' OR users.email = 'trato.app1984@gmail.com')
        )
    );

-- Solo administradores pueden ver logs
CREATE POLICY "Admin can view logs" ON public.admin_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND (users.role = 'admin' OR users.email = 'trato.app1984@gmail.com')
        )
    );

-- 9. Conceder permisos a las funciones
GRANT EXECUTE ON FUNCTION update_system_config(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_multiple_drivers(UUID[], UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_admin_activity(INTEGER) TO authenticated;

-- 9.1. Función adicional para diagnóstico del sistema
CREATE OR REPLACE FUNCTION admin_system_diagnostic()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    diagnostic JSONB;
    table_exists_users BOOLEAN := false;
    table_exists_sellers BOOLEAN := false;
    table_exists_orders BOOLEAN := false;
    table_exists_products BOOLEAN := false;
    admin_user_exists BOOLEAN := false;
BEGIN
    -- Verificar existencia de tablas críticas
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) INTO table_exists_users;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'sellers'
    ) INTO table_exists_sellers;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'orders'
    ) INTO table_exists_orders;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'products'
    ) INTO table_exists_products;
    
    -- Verificar usuario administrador
    SELECT EXISTS (
        SELECT 1 FROM public.users 
        WHERE email = 'trato.app1984@gmail.com' 
        AND role = 'admin'
    ) INTO admin_user_exists;
    
    -- Construir reporte de diagnóstico
    SELECT jsonb_build_object(
        'database_tables', jsonb_build_object(
            'users', table_exists_users,
            'sellers', table_exists_sellers,
            'orders', table_exists_orders,
            'products', table_exists_products
        ),
        'admin_setup', jsonb_build_object(
            'admin_user_configured', admin_user_exists,
            'system_config_table', EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'system_config'
            ),
            'admin_logs_table', EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'admin_logs'
            )
        ),
        'recommendations', CASE 
            WHEN NOT admin_user_exists THEN jsonb_build_array('Configurar usuario administrador')
            WHEN NOT table_exists_orders THEN jsonb_build_array('Crear tabla orders')
            WHEN NOT table_exists_products THEN jsonb_build_array('Crear tabla products')
            ELSE jsonb_build_array('Sistema funcionando correctamente')
        END,
        'status', CASE 
            WHEN table_exists_users AND admin_user_exists THEN 'healthy'
            WHEN table_exists_users THEN 'warning'
            ELSE 'critical'
        END,
        'timestamp', NOW()
    ) INTO diagnostic;
    
    RETURN diagnostic;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_system_diagnostic() TO authenticated;

-- 10. Asegurar que el usuario administrador principal tenga el rol correcto
DO $$
BEGIN
    -- Verificar si el usuario existe en auth.users
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'trato.app1984@gmail.com') THEN
        
        -- Crear o actualizar en public.users
        INSERT INTO public.users (
            id, email, role, name, is_active, created_at, updated_at
        )
        SELECT 
            au.id,
            'trato.app1984@gmail.com',
            'admin',
            'Administrador TRATO',
            true,
            COALESCE(pu.created_at, NOW()),
            NOW()
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE au.email = 'trato.app1984@gmail.com'
        ON CONFLICT (id) DO UPDATE SET
            role = 'admin',
            is_active = true,
            updated_at = NOW(),
            name = COALESCE(users.name, 'Administrador TRATO');
            
        RAISE NOTICE 'Usuario administrador configurado exitosamente';
        
    ELSE
        RAISE NOTICE 'Usuario trato.app1984@gmail.com no encontrado en auth.users';
        RAISE NOTICE 'Primero debes registrarte con ese email en la aplicación';
    END IF;
END $$;

COMMIT;

-- Verificación final con mejor manejo de errores
DO $$
BEGIN
    -- Verificar que las tablas se crearon correctamente
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_config') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_logs') THEN
        RAISE NOTICE '✅ Tablas administrativas creadas exitosamente';
    ELSE
        RAISE WARNING '⚠️ Algunas tablas administrativas no se crearon correctamente';
    END IF;
    
    -- Verificar que las funciones se crearon
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_admin_stats') AND
       EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'approve_multiple_drivers') THEN
        RAISE NOTICE '✅ Funciones administrativas creadas exitosamente';
    ELSE
        RAISE WARNING '⚠️ Algunas funciones administrativas no se crearon correctamente';
    END IF;
    
    -- Verificar configuraciones por defecto
    IF (SELECT COUNT(*) FROM public.system_config) >= 7 THEN
        RAISE NOTICE '✅ Configuraciones por defecto insertadas exitosamente';
    ELSE
        RAISE WARNING '⚠️ Faltan algunas configuraciones por defecto';
    END IF;
END $$;

-- Mostrar diagnóstico del sistema
SELECT 'DIAGNÓSTICO DEL SISTEMA ADMINISTRATIVO' as title;
SELECT admin_system_diagnostic() as diagnostic_report;

-- Mostrar configuraciones actuales
SELECT 'CONFIGURACIONES ACTUALES' as title;
SELECT key, value, description FROM public.system_config ORDER BY key;

-- Mostrar estadísticas actuales (si las tablas existen)
SELECT 'ESTADÍSTICAS ACTUALES' as title;
SELECT get_admin_stats() as current_stats;

-- Mensaje final
SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'trato.app1984@gmail.com' AND role = 'admin') 
    THEN '🎉 SISTEMA ADMINISTRATIVO CONFIGURADO EXITOSAMENTE - Usuario admin listo'
    ELSE '⚠️ SISTEMA CONFIGURADO - Falta configurar usuario administrador'
END as final_status;
