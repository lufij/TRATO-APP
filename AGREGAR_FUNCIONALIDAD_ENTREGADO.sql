-- =====================================================
-- 🚀 AGREGAR FUNCIONALIDAD "ENTREGADO" AL DASHBOARD
-- =====================================================
-- Ejecutar este script en Supabase SQL Editor

-- 🔧 PASO 1: Agregar columna delivered_at si no existe
DO $$
BEGIN
    RAISE NOTICE '🔧 Agregando columna delivered_at a la tabla orders...';
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivered_at') THEN
        ALTER TABLE public.orders ADD COLUMN delivered_at TIMESTAMPTZ;
        RAISE NOTICE '✅ Columna delivered_at agregada exitosamente';
    ELSE
        RAISE NOTICE 'ℹ️ Columna delivered_at ya existe';
    END IF;
END $$;

-- 🔧 PASO 2: Verificar que el status 'delivered' está permitido
DO $$
BEGIN
    RAISE NOTICE '🔧 Verificando constraint de status...';
    
    -- Primero, eliminar constraint existente si existe
    BEGIN
        ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
        RAISE NOTICE '✅ Constraint anterior removido';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ℹ️ No había constraint anterior';
    END;
    
    -- Agregar nuevo constraint que incluye 'delivered'
    ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('pending', 'accepted', 'ready', 'assigned', 'picked-up', 'delivered', 'completed', 'cancelled', 'rejected'));
    
    RAISE NOTICE '✅ Constraint actualizado para incluir status "delivered"';
END $$;

-- 🔧 PASO 3: Crear índice para búsquedas eficientes por delivered_at
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON public.orders(delivered_at) WHERE delivered_at IS NOT NULL;

-- ✅ VERIFICACIÓN FINAL
SELECT 'VERIFICACIÓN - COLUMNA delivered_at:' as status;

-- Mostrar estructura actualizada
SELECT 
    'ORDERS - ' || column_name as "Columna",
    data_type as "Tipo",
    is_nullable as "NULL?",
    COALESCE(column_default, 'Sin default') as "Default"
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('accepted_at', 'ready_at', 'delivered_at', 'rejected_at')
ORDER BY column_name;

-- Verificar constraint de status
SELECT 
    'STATUS CONSTRAINT:' as "Verificación",
    check_clause as "Valores Permitidos"
FROM information_schema.check_constraints 
WHERE constraint_name = 'orders_status_check';

SELECT '🎉 FUNCIONALIDAD "ENTREGADO" AGREGADA EXITOSAMENTE' as resultado;
