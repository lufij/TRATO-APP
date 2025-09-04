-- 🚨 SOLUCIÓN ALTERNATIVA: Deshabilitar trigger temporalmente
-- Si el problema persiste, usar esta solución de emergencia

-- ============================================================================
-- OPCIÓN A: DESHABILITAR TRIGGER TEMPORALMENTE
-- ============================================================================

-- Solo ejecutar si la corrección anterior no funciona
-- DROP TRIGGER IF EXISTS trigger_order_time_metrics ON public.orders;

-- SELECT '⚠️ TRIGGER DESHABILITADO TEMPORALMENTE' as accion,
--        'Las métricas se pueden agregar manualmente después' as nota;

-- ============================================================================
-- OPCIÓN B: TRIGGER MEJORADO CON MANEJO DE ERRORES
-- ============================================================================

CREATE OR REPLACE FUNCTION update_order_time_metrics_safe()
RETURNS TRIGGER AS $$
BEGIN
    -- Intentar insertar/actualizar con manejo de errores
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
        
    EXCEPTION 
        WHEN OTHERS THEN
            -- Si hay error, log pero no fallar la operación principal
            RAISE NOTICE 'Error en order_time_metrics: %', SQLERRM;
            RETURN NEW;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reemplazar el trigger con la versión segura
DROP TRIGGER IF EXISTS trigger_order_time_metrics ON public.orders;

CREATE TRIGGER trigger_order_time_metrics
    AFTER INSERT OR UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_order_time_metrics_safe();

SELECT '🔧 TRIGGER MEJORADO INSTALADO' as resultado,
       'Ahora maneja errores sin fallar la creación de órdenes' as beneficio;
