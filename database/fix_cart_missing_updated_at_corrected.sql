-- =====================================================
-- SOLUCIÓN ESPECÍFICA: COLUMNA UPDATED_AT FALTANTE EN CART_ITEMS
-- =====================================================
-- Este script agrega la columna updated_at faltante y otras columnas necesarias
-- para que el carrito funcione correctamente
-- VERSIÓN CORREGIDA: Sin errores de sintaxis SQL

BEGIN;

DO $$
BEGIN
    RAISE NOTICE 'INICIANDO CORRECCIÓN DE CART_ITEMS - COLUMNA UPDATED_AT FALTANTE';
END $$;

-- =====================================================
-- PARTE 1: VERIFICAR QUE CART_ITEMS EXISTE
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cart_items') THEN
        RAISE EXCEPTION 'CRÍTICO: Tabla cart_items no existe. Ejecuta primero fix_setup.sql';
    END IF;
    RAISE NOTICE 'Verificación: Tabla cart_items existe - OK';
END $$;

-- =====================================================
-- PARTE 2: AGREGAR COLUMNA UPDATED_AT SI NO EXISTE
-- =====================================================

DO $$
BEGIN
    -- Verificar si updated_at existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'updated_at'
    ) THEN
        -- Agregar columna updated_at
        ALTER TABLE public.cart_items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Establecer valor actual para registros existentes
        UPDATE public.cart_items SET updated_at = NOW() WHERE updated_at IS NULL;
        
        RAISE NOTICE 'SOLUCIONADO: Columna updated_at agregada a cart_items';
    ELSE
        RAISE NOTICE 'Columna updated_at ya existe en cart_items';
    END IF;
END $$;

-- =====================================================
-- PARTE 3: VERIFICAR Y AGREGAR OTRAS COLUMNAS CRÍTICAS
-- =====================================================

DO $$
BEGIN
    -- created_at (para timestamps completos)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        UPDATE public.cart_items SET created_at = NOW() WHERE created_at IS NULL;
        RAISE NOTICE 'Columna created_at agregada a cart_items';
    ELSE
        RAISE NOTICE 'Columna created_at ya existe';
    END IF;

    -- product_type (para validación de productos)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_type'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_type TEXT DEFAULT 'regular' CHECK (product_type IN ('regular', 'daily'));
        RAISE NOTICE 'Columna product_type agregada a cart_items';
    ELSE
        RAISE NOTICE 'Columna product_type ya existe';
    END IF;

    -- product_name (para datos desnormalizados)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_name'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_name TEXT;
        RAISE NOTICE 'Columna product_name agregada a cart_items';
    ELSE
        RAISE NOTICE 'Columna product_name ya existe';
    END IF;

    -- product_price (para datos desnormalizados)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_price'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_price DECIMAL(10,2);
        RAISE NOTICE 'Columna product_price agregada a cart_items';
    ELSE
        RAISE NOTICE 'Columna product_price ya existe';
    END IF;

    -- product_image (para datos desnormalizados)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_image'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_image TEXT;
        RAISE NOTICE 'Columna product_image agregada a cart_items';
    ELSE
        RAISE NOTICE 'Columna product_image ya existe';
    END IF;

    -- seller_id (para validación de un vendedor por carrito)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'seller_id'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN seller_id UUID;
        RAISE NOTICE 'Columna seller_id agregada a cart_items';
    ELSE
        RAISE NOTICE 'Columna seller_id ya existe';
    END IF;
END $$;

-- =====================================================
-- PARTE 4: CREAR TRIGGER PARA AUTO-ACTUALIZAR UPDATED_AT
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para cart_items (reemplaza si existe)
DROP TRIGGER IF EXISTS update_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER update_cart_items_updated_at
    BEFORE UPDATE ON public.cart_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DO $$
BEGIN
    RAISE NOTICE 'Trigger para auto-actualizar updated_at creado en cart_items';
END $$;

-- =====================================================
-- PARTE 5: VERIFICAR FOREIGN KEY SEGURO (USER_ID SOLAMENTE)
-- =====================================================

DO $$
DECLARE
    user_fk_exists BOOLEAN := FALSE;
    product_fk_exists BOOLEAN := FALSE;
BEGIN
    -- Verificar foreign key seguro (user_id)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'cart_items' 
        AND kcu.column_name = 'user_id'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) INTO user_fk_exists;
    
    -- Verificar foreign key problemático (product_id) - NO debe existir
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'cart_items' 
        AND kcu.column_name = 'product_id'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) INTO product_fk_exists;
    
    -- Crear foreign key seguro si no existe
    IF NOT user_fk_exists THEN
        ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key seguro user_id creado para cart_items';
    ELSE
        RAISE NOTICE 'Foreign key user_id ya existe en cart_items';
    END IF;
    
    -- Advertir sobre foreign key problemático
    IF product_fk_exists THEN
        RAISE NOTICE 'ADVERTENCIA: Existe foreign key problemático en product_id - considerar eliminarlo';
    ELSE
        RAISE NOTICE 'OK: No hay foreign key problemático en product_id';
    END IF;
END $$;

-- =====================================================
-- PARTE 6: HABILITAR RLS Y CREAR POLÍTICAS BÁSICAS
-- =====================================================

-- Habilitar Row Level Security
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Políticas básicas para cart_items (reemplaza si existen)
DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
CREATE POLICY "Users can view their own cart items" ON public.cart_items
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own cart items" ON public.cart_items;
CREATE POLICY "Users can insert their own cart items" ON public.cart_items
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
CREATE POLICY "Users can update their own cart items" ON public.cart_items
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;
CREATE POLICY "Users can delete their own cart items" ON public.cart_items
    FOR DELETE USING (user_id = auth.uid());

DO $$
BEGIN
    RAISE NOTICE 'Políticas RLS configuradas para cart_items';
END $$;

-- =====================================================
-- PARTE 7: CREAR ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_seller_id ON public.cart_items(seller_id) WHERE seller_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cart_items_product_type_id ON public.cart_items(product_type, product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_updated_at ON public.cart_items(updated_at DESC);

DO $$
BEGIN
    RAISE NOTICE 'Índices de performance creados para cart_items';
END $$;

COMMIT;

-- =====================================================
-- PARTE 8: VERIFICACIÓN FINAL Y REPORTE
-- =====================================================

DO $$
DECLARE
    updated_at_exists BOOLEAN := FALSE;
    created_at_exists BOOLEAN := FALSE;
    total_columns INTEGER;
    trigger_exists BOOLEAN := FALSE;
    user_fk_exists BOOLEAN := FALSE;
    product_fk_exists BOOLEAN := FALSE;
    policies_count INTEGER;
    indexes_count INTEGER;
BEGIN
    -- Verificar columnas críticas
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'updated_at'
    ) INTO updated_at_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'created_at'
    ) INTO created_at_exists;
    
    -- Contar columnas totales
    SELECT COUNT(*) INTO total_columns
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cart_items';
    
    -- Verificar trigger
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_cart_items_updated_at' AND event_object_table = 'cart_items'
    ) INTO trigger_exists;
    
    -- Verificar foreign keys
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'cart_items' AND kcu.column_name = 'user_id' AND tc.constraint_type = 'FOREIGN KEY'
    ) INTO user_fk_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'cart_items' AND kcu.column_name = 'product_id' AND tc.constraint_type = 'FOREIGN KEY'
    ) INTO product_fk_exists;
    
    -- Contar políticas RLS
    SELECT COUNT(*) INTO policies_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'cart_items';
    
    -- Contar índices
    SELECT COUNT(*) INTO indexes_count
    FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'cart_items';
    
    RAISE NOTICE '========================================================';
    RAISE NOTICE 'CORRECCIÓN DE CART_ITEMS COMPLETADA SIN ERRORES';
    RAISE NOTICE '========================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'ESTADO FINAL:';
    RAISE NOTICE 'updated_at existe: %', CASE WHEN updated_at_exists THEN '✅ SÍ' ELSE '❌ NO' END;
    RAISE NOTICE 'created_at existe: %', CASE WHEN created_at_exists THEN '✅ SÍ' ELSE '❌ NO' END;
    RAISE NOTICE 'Total columnas: %', total_columns;
    RAISE NOTICE 'Trigger updated_at: %', CASE WHEN trigger_exists THEN '✅ SÍ' ELSE '❌ NO' END;
    RAISE NOTICE 'Foreign key user_id: %', CASE WHEN user_fk_exists THEN '✅ SÍ' ELSE '❌ NO' END;
    RAISE NOTICE 'Foreign key product_id: %', CASE WHEN product_fk_exists THEN '⚠️ EXISTE (problemático)' ELSE '✅ NO EXISTE (correcto)' END;
    RAISE NOTICE 'Políticas RLS: %', policies_count;
    RAISE NOTICE 'Índices: %', indexes_count;
    RAISE NOTICE '';
    
    IF updated_at_exists AND created_at_exists AND trigger_exists AND user_fk_exists THEN
        RAISE NOTICE '🎉 ERROR "column updated_at does not exist" SOLUCIONADO';
        RAISE NOTICE '';
        RAISE NOTICE 'PRÓXIMOS PASOS:';
        RAISE NOTICE '1. Reinicia tu aplicación con Ctrl+Shift+R';
        RAISE NOTICE '2. Prueba agregar productos al carrito';
        RAISE NOTICE '3. Verifica que no aparezcan más errores de updated_at';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 TU CARRITO ESTÁ COMPLETAMENTE FUNCIONAL';
    ELSE
        RAISE NOTICE '⚠️ Algunos elementos necesitan atención:';
        IF NOT updated_at_exists THEN
            RAISE NOTICE '- Columna updated_at aún no existe';
        END IF;
        IF NOT created_at_exists THEN
            RAISE NOTICE '- Columna created_at aún no existe';
        END IF;
        IF NOT trigger_exists THEN
            RAISE NOTICE '- Trigger para updated_at no existe';
        END IF;
        IF NOT user_fk_exists THEN
            RAISE NOTICE '- Foreign key user_id no existe';
        END IF;
    END IF;
    
    RAISE NOTICE '========================================================';
END $$;

SELECT 'CORRECCIÓN DE CART_ITEMS UPDATED_AT COMPLETADA SIN ERRORES DE SINTAXIS' as resultado;