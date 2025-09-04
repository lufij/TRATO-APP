-- 🚨 CREACIÓN DE TABLAS PARA NOTIFICACIONES CRÍTICAS
-- Fecha: $(Get-Date)
-- Autor: Sistema de Notificaciones TRATO

-- ============================================================================
-- 1. TABLA PARA TRACKING GPS DE REPARTIDORES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.driver_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    accuracy INTEGER, -- Precisión en metros
    speed DECIMAL(6, 2), -- Velocidad en km/h (opcional)
    heading INTEGER, -- Dirección en grados (opcional)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON public.driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_order_id ON public.driver_locations(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_timestamp ON public.driver_locations(timestamp);

-- ============================================================================
-- 2. TABLA PARA LOG DE ALERTAS CRÍTICAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.critical_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL, -- 'stock_low', 'stock_out', 'order_timeout', 'system_alert', etc.
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    urgency_level TEXT DEFAULT 'medium' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.users(id),
    metadata JSONB, -- Para datos adicionales específicos del tipo de alerta
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_critical_alerts_type ON public.critical_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_critical_alerts_urgency ON public.critical_alerts(urgency_level);
CREATE INDEX IF NOT EXISTS idx_critical_alerts_resolved ON public.critical_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_critical_alerts_user_id ON public.critical_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_critical_alerts_order_id ON public.critical_alerts(order_id);
CREATE INDEX IF NOT EXISTS idx_critical_alerts_created_at ON public.critical_alerts(created_at);

-- ============================================================================
-- 3. TABLA PARA MÉTRICAS DE TIEMPO POR ORDEN
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.order_time_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER, -- Calculado automáticamente
    exceeded_limit BOOLEAN DEFAULT FALSE,
    time_limit_minutes INTEGER, -- Límite esperado para este estado
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_order_time_metrics_order_id ON public.order_time_metrics(order_id);
CREATE INDEX IF NOT EXISTS idx_order_time_metrics_status ON public.order_time_metrics(status);
CREATE INDEX IF NOT EXISTS idx_order_time_metrics_exceeded ON public.order_time_metrics(exceeded_limit);

-- ============================================================================
-- 4. FUNCIÓN PARA ACTUALIZAR MÉTRICAS DE TIEMPO AUTOMÁTICAMENTE
-- ============================================================================

CREATE OR REPLACE FUNCTION update_order_time_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Si es una nueva orden
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.order_time_metrics (
            order_id, 
            status, 
            started_at,
            time_limit_minutes
        ) VALUES (
            NEW.id, 
            NEW.status, 
            NEW.created_at,
            CASE NEW.status
                WHEN 'pending' THEN 10
                WHEN 'accepted' THEN 30
                WHEN 'ready' THEN 20
                WHEN 'assigned' THEN 15
                WHEN 'picked-up' THEN 45
                WHEN 'in-transit' THEN 45
                ELSE 30
            END
        );
        RETURN NEW;
    END IF;

    -- Si cambia el estado
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        -- Cerrar la métrica anterior
        UPDATE public.order_time_metrics 
        SET 
            ended_at = NEW.updated_at,
            duration_minutes = EXTRACT(EPOCH FROM (NEW.updated_at - started_at)) / 60,
            exceeded_limit = (EXTRACT(EPOCH FROM (NEW.updated_at - started_at)) / 60) > time_limit_minutes
        WHERE order_id = NEW.id AND status = OLD.status AND ended_at IS NULL;

        -- Crear nueva métrica para el nuevo estado
        INSERT INTO public.order_time_metrics (
            order_id, 
            status, 
            started_at,
            time_limit_minutes
        ) VALUES (
            NEW.id, 
            NEW.status, 
            NEW.updated_at,
            CASE NEW.status
                WHEN 'pending' THEN 10
                WHEN 'accepted' THEN 30
                WHEN 'ready' THEN 20
                WHEN 'assigned' THEN 15
                WHEN 'picked-up' THEN 45
                WHEN 'in-transit' THEN 45
                ELSE 30
            END
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. TRIGGER PARA MÉTRICAS DE TIEMPO
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_order_time_metrics ON public.orders;

CREATE TRIGGER trigger_order_time_metrics
    AFTER INSERT OR UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_order_time_metrics();

-- ============================================================================
-- 6. FUNCIÓN PARA CREAR ALERTAS AUTOMÁTICAS DE STOCK
-- ============================================================================

CREATE OR REPLACE FUNCTION check_stock_alerts()
RETURNS TRIGGER AS $$
BEGIN
    -- Alerta de stock bajo (≤ 5)
    IF NEW.stock <= 5 AND (OLD.stock IS NULL OR OLD.stock > 5) THEN
        INSERT INTO public.critical_alerts (
            alert_type,
            user_id,
            product_id,
            message,
            urgency_level,
            metadata
        ) VALUES (
            'stock_low',
            NEW.seller_id,
            NEW.id,
            format('Stock bajo: %s (%s unidades restantes)', NEW.name, NEW.stock),
            CASE 
                WHEN NEW.stock <= 2 THEN 'critical'
                WHEN NEW.stock <= 3 THEN 'high'
                ELSE 'medium'
            END,
            json_build_object(
                'product_name', NEW.name,
                'current_stock', NEW.stock,
                'previous_stock', COALESCE(OLD.stock, 0)
            )
        );
    END IF;

    -- Alerta de stock agotado (= 0)
    IF NEW.stock = 0 AND (OLD.stock IS NULL OR OLD.stock > 0) THEN
        INSERT INTO public.critical_alerts (
            alert_type,
            user_id,
            product_id,
            message,
            urgency_level,
            metadata
        ) VALUES (
            'stock_out',
            NEW.seller_id,
            NEW.id,
            format('AGOTADO: %s', NEW.name),
            'critical',
            json_build_object(
                'product_name', NEW.name,
                'previous_stock', COALESCE(OLD.stock, 0)
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. TRIGGER PARA ALERTAS DE STOCK
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_stock_alerts ON public.products;

CREATE TRIGGER trigger_stock_alerts
    AFTER UPDATE OF stock ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION check_stock_alerts();

-- ============================================================================
-- 8. PERMISOS DE SEGURIDAD
-- ============================================================================

-- Permisos para driver_locations
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own driver locations" ON public.driver_locations
    FOR SELECT USING (driver_id = auth.uid());

CREATE POLICY "Drivers can insert their own locations" ON public.driver_locations
    FOR INSERT WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Drivers can update their own locations" ON public.driver_locations
    FOR UPDATE USING (driver_id = auth.uid());

-- Permisos para critical_alerts
ALTER TABLE public.critical_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own alerts" ON public.critical_alerts
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert alerts" ON public.critical_alerts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own alerts" ON public.critical_alerts
    FOR UPDATE USING (user_id = auth.uid());

-- Permisos para order_time_metrics
ALTER TABLE public.order_time_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics for their orders" ON public.order_time_metrics
    FOR SELECT USING (
        order_id IN (
            SELECT id FROM public.orders 
            WHERE buyer_id = auth.uid() 
            OR seller_id = auth.uid() 
            OR driver_id = auth.uid()
        )
    );

-- ============================================================================
-- 9. GRANTS PARA USUARIOS AUTENTICADOS
-- ============================================================================

GRANT ALL ON public.driver_locations TO authenticated;
GRANT ALL ON public.critical_alerts TO authenticated;
GRANT ALL ON public.order_time_metrics TO authenticated;

GRANT EXECUTE ON FUNCTION update_order_time_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION check_stock_alerts() TO authenticated;

-- ============================================================================
-- 10. VERIFICACIÓN DE TABLAS CREADAS
-- ============================================================================

SELECT 
    '✅ TABLAS CRÍTICAS CREADAS EXITOSAMENTE' as resultado,
    COUNT(*) as tablas_creadas
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('driver_locations', 'critical_alerts', 'order_time_metrics');

-- Mostrar triggers activos
SELECT 
    '🔧 TRIGGERS ACTIVOS:' as info,
    trigger_name, 
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND trigger_name IN ('trigger_order_time_metrics', 'trigger_stock_alerts')
ORDER BY trigger_name;

SELECT '🎯 INTEGRACIÓN DE BASE DE DATOS COMPLETADA' as final_result;
