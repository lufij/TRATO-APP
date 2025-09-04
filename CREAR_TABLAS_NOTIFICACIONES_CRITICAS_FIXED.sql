-- 🚨 CREACIÓN DE TABLAS PARA NOTIFICACIONES CRÍTICAS - VERSIÓN CORREGIDA
-- Fecha: 3 de Septiembre, 2025
-- Autor: Sistema de Notificaciones TRATO
-- Corregido para estructura real de BD

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
    product_id UUID, -- Sin referencia foreign key por flexibilidad
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
-- 6. FUNCIÓN PARA CREAR ALERTAS AUTOMÁTICAS DE STOCK - PRODUCTOS REGULARES
-- ============================================================================

CREATE OR REPLACE FUNCTION check_regular_product_stock_alerts()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo procesar si la tabla products tiene la columna stock_quantity
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'stock_quantity'
    ) THEN
        -- Alerta de stock bajo (≤ 5)
        IF NEW.stock_quantity <= 5 AND (OLD.stock_quantity IS NULL OR OLD.stock_quantity > 5) THEN
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
                format('Stock bajo: %s (%s unidades restantes)', NEW.name, NEW.stock_quantity),
                CASE 
                    WHEN NEW.stock_quantity <= 2 THEN 'critical'
                    WHEN NEW.stock_quantity <= 3 THEN 'high'
                    ELSE 'medium'
                END,
                json_build_object(
                    'product_name', NEW.name,
                    'current_stock', NEW.stock_quantity,
                    'previous_stock', COALESCE(OLD.stock_quantity, 0),
                    'product_type', 'regular'
                )
            );
        END IF;

        -- Alerta de stock agotado (= 0)
        IF NEW.stock_quantity = 0 AND (OLD.stock_quantity IS NULL OR OLD.stock_quantity > 0) THEN
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
                    'previous_stock', COALESCE(OLD.stock_quantity, 0),
                    'product_type', 'regular'
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. FUNCIÓN PARA CREAR ALERTAS AUTOMÁTICAS DE STOCK - PRODUCTOS DEL DÍA
-- ============================================================================

CREATE OR REPLACE FUNCTION check_daily_product_stock_alerts()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo procesar si la tabla daily_products tiene la columna stock_quantity
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'daily_products' 
        AND column_name = 'stock_quantity'
    ) THEN
        -- Alerta de stock bajo (≤ 5)
        IF NEW.stock_quantity <= 5 AND (OLD.stock_quantity IS NULL OR OLD.stock_quantity > 5) THEN
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
                NEW.product_id,
                format('Stock bajo - Producto del día: %s (%s unidades restantes)', NEW.name, NEW.stock_quantity),
                CASE 
                    WHEN NEW.stock_quantity <= 2 THEN 'critical'
                    WHEN NEW.stock_quantity <= 3 THEN 'high'
                    ELSE 'medium'
                END,
                json_build_object(
                    'product_name', NEW.name,
                    'current_stock', NEW.stock_quantity,
                    'previous_stock', COALESCE(OLD.stock_quantity, 0),
                    'product_type', 'daily',
                    'daily_product_id', NEW.id
                )
            );
        END IF;

        -- Alerta de stock agotado (= 0)
        IF NEW.stock_quantity = 0 AND (OLD.stock_quantity IS NULL OR OLD.stock_quantity > 0) THEN
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
                NEW.product_id,
                format('AGOTADO - Producto del día: %s', NEW.name),
                'critical',
                json_build_object(
                    'product_name', NEW.name,
                    'previous_stock', COALESCE(OLD.stock_quantity, 0),
                    'product_type', 'daily',
                    'daily_product_id', NEW.id
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. TRIGGERS PARA ALERTAS DE STOCK (CONDICIONALES)
-- ============================================================================

-- Trigger para productos regulares (solo si existe la tabla y columna)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'stock_quantity'
    ) THEN
        DROP TRIGGER IF EXISTS trigger_regular_stock_alerts ON public.products;
        
        CREATE TRIGGER trigger_regular_stock_alerts
            AFTER UPDATE OF stock_quantity ON public.products
            FOR EACH ROW
            EXECUTE FUNCTION check_regular_product_stock_alerts();
            
        RAISE NOTICE '✅ Trigger de stock para productos regulares creado';
    ELSE
        RAISE NOTICE '⚠️ Tabla products sin columna stock_quantity - trigger omitido';
    END IF;
END $$;

-- Trigger para productos del día (solo si existe la tabla y columna)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'daily_products' 
        AND column_name = 'stock_quantity'
    ) THEN
        DROP TRIGGER IF EXISTS trigger_daily_stock_alerts ON public.daily_products;
        
        CREATE TRIGGER trigger_daily_stock_alerts
            AFTER UPDATE OF stock_quantity ON public.daily_products
            FOR EACH ROW
            EXECUTE FUNCTION check_daily_product_stock_alerts();
            
        RAISE NOTICE '✅ Trigger de stock para productos del día creado';
    ELSE
        RAISE NOTICE '⚠️ Tabla daily_products sin columna stock_quantity - trigger omitido';
    END IF;
END $$;

-- ============================================================================
-- 9. FUNCIÓN PARA CREAR ALERTAS DE TIMEOUT AUTOMÁTICAS
-- ============================================================================

CREATE OR REPLACE FUNCTION check_order_timeout_alerts()
RETURNS void AS $$
DECLARE
    timeout_record RECORD;
BEGIN
    -- Buscar órdenes que exceden los límites de tiempo
    FOR timeout_record IN
        SELECT 
            otm.order_id,
            otm.status,
            otm.started_at,
            otm.time_limit_minutes,
            o.seller_id,
            o.buyer_id,
            o.driver_id,
            EXTRACT(EPOCH FROM (NOW() - otm.started_at)) / 60 as minutes_elapsed
        FROM public.order_time_metrics otm
        JOIN public.orders o ON o.id = otm.order_id
        WHERE otm.ended_at IS NULL
        AND EXTRACT(EPOCH FROM (NOW() - otm.started_at)) / 60 > otm.time_limit_minutes
        AND NOT EXISTS (
            SELECT 1 FROM public.critical_alerts ca 
            WHERE ca.order_id = otm.order_id 
            AND ca.alert_type = 'order_timeout'
            AND ca.created_at > NOW() - INTERVAL '1 hour'
        )
    LOOP
        -- Crear alerta de timeout
        INSERT INTO public.critical_alerts (
            alert_type,
            order_id,
            user_id,
            message,
            urgency_level,
            metadata
        ) VALUES (
            'order_timeout',
            timeout_record.order_id,
            COALESCE(timeout_record.seller_id, timeout_record.buyer_id, timeout_record.driver_id),
            format('Orden #%s en estado "%s" por %s minutos (límite: %s min)', 
                timeout_record.order_id, 
                timeout_record.status,
                ROUND(timeout_record.minutes_elapsed),
                timeout_record.time_limit_minutes
            ),
            CASE 
                WHEN timeout_record.minutes_elapsed > (timeout_record.time_limit_minutes * 2) THEN 'critical'
                WHEN timeout_record.minutes_elapsed > (timeout_record.time_limit_minutes * 1.5) THEN 'high'
                ELSE 'medium'
            END,
            json_build_object(
                'order_id', timeout_record.order_id,
                'status', timeout_record.status,
                'minutes_elapsed', ROUND(timeout_record.minutes_elapsed),
                'time_limit_minutes', timeout_record.time_limit_minutes,
                'seller_id', timeout_record.seller_id,
                'buyer_id', timeout_record.buyer_id,
                'driver_id', timeout_record.driver_id
            )
        );
        
        -- También marcar la métrica como excedida
        UPDATE public.order_time_metrics 
        SET exceeded_limit = true 
        WHERE order_id = timeout_record.order_id 
        AND status = timeout_record.status 
        AND ended_at IS NULL;
        
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. PERMISOS DE SEGURIDAD
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
-- 11. GRANTS PARA USUARIOS AUTENTICADOS
-- ============================================================================

GRANT ALL ON public.driver_locations TO authenticated;
GRANT ALL ON public.critical_alerts TO authenticated;
GRANT ALL ON public.order_time_metrics TO authenticated;

GRANT EXECUTE ON FUNCTION update_order_time_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION check_regular_product_stock_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION check_daily_product_stock_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION check_order_timeout_alerts() TO authenticated;

-- ============================================================================
-- 12. VERIFICACIÓN DE TABLAS CREADAS
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
AND (trigger_name LIKE '%stock_alerts%' OR trigger_name LIKE '%time_metrics%')
ORDER BY trigger_name;

-- Mostrar funciones creadas
SELECT 
    '⚙️ FUNCIONES CREADAS:' as info,
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%stock_alerts%' OR routine_name LIKE '%time_metrics%' OR routine_name LIKE '%timeout%'
ORDER BY routine_name;

SELECT '🎯 INTEGRACIÓN DE BASE DE DATOS COMPLETADA - VERSIÓN CORREGIDA' as final_result;
