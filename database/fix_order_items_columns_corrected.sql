-- ============================================================================
-- TRATO - Corrección Específica para Tabla order_items (SINTAXIS CORREGIDA)
-- ============================================================================
-- Este script corrige específicamente el error:
-- ERROR: column order_items_1.price_per_unit does not exist
-- CORREGIDO: Sintaxis SQL compatible con PostgreSQL/Supabase
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🛠️ CORRECCIÓN ESPECÍFICA PARA TABLA order_items (SINTAXIS CORREGIDA)...';
    RAISE NOTICE '';
    RAISE NOTICE 'Error a corregir:';
    RAISE NOTICE '  - column order_items_1.price_per_unit does not exist';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 1: Verificar estado actual de la tabla order_items
-- ============================================================================

DO $$
DECLARE
    table_exists BOOLEAN := FALSE;
    column_count INTEGER := 0;
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    existing_columns TEXT;
BEGIN
    RAISE NOTICE '📋 VERIFICANDO ESTADO ACTUAL DE order_items:';
    
    -- Verificar si la tabla existe
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') 
    INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE '   ✅ Tabla order_items: EXISTE';
        
        -- Contar columnas existentes
        SELECT COUNT(*) INTO column_count
        FROM information_schema.columns 
        WHERE table_name = 'order_items';
        
        RAISE NOTICE '   📊 Número de columnas: %', column_count;
        
        -- Listar columnas existentes
        SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) INTO existing_columns
        FROM information_schema.columns 
        WHERE table_name = 'order_items';
        
        RAISE NOTICE '   📋 Columnas existentes: %', existing_columns;
        
        -- Verificar columnas específicas necesarias
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'price_per_unit') THEN
            missing_columns := missing_columns || 'price_per_unit';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'total_price') THEN
            missing_columns := missing_columns || 'total_price';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'quantity') THEN
            missing_columns := missing_columns || 'quantity';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'order_id') THEN
            missing_columns := missing_columns || 'order_id';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'product_id') THEN
            missing_columns := missing_columns || 'product_id';
        END IF;
        
        IF array_length(missing_columns, 1) > 0 THEN
            RAISE NOTICE '   ❌ Columnas faltantes: %', array_to_string(missing_columns, ', ');
        ELSE
            RAISE NOTICE '   ✅ Todas las columnas esenciales están presentes';
        END IF;
        
    ELSE
        RAISE NOTICE '   ❌ Tabla order_items: NO EXISTE';
        missing_columns := ARRAY['tabla_completa'];
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 2: Crear tablas de dependencia si no existen
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔗 VERIFICANDO TABLAS DE DEPENDENCIA:';
    
    -- Crear tabla orders si no existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
        RAISE NOTICE '   ➕ Creando tabla orders...';
        
        CREATE TABLE orders (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            total DECIMAL(10,2) NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
            delivery_address TEXT,
            delivery_type TEXT DEFAULT 'delivery' CHECK (delivery_type IN ('delivery', 'pickup', 'dine_in')),
            notes TEXT,
            estimated_delivery TIMESTAMP WITH TIME ZONE,
            delivered_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE '   ✅ Tabla orders creada';
    ELSE
        RAISE NOTICE '   ✅ Tabla orders ya existe';
    END IF;
    
    -- Crear tabla products si no existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
        RAISE NOTICE '   ➕ Creando tabla products...';
        
        CREATE TABLE products (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL DEFAULT 0,
            category TEXT,
            stock_quantity INTEGER DEFAULT 0,
            image_url TEXT,
            is_public BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE '   ✅ Tabla products creada';
    ELSE
        RAISE NOTICE '   ✅ Tabla products ya existe';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 3: Crear tabla order_items si no existe
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') THEN
        RAISE NOTICE '➕ CREANDO TABLA order_items COMPLETA:';
        
        CREATE TABLE order_items (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
            price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
            total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE '   ✅ Tabla order_items creada con todas las columnas necesarias';
        
    ELSE
        RAISE NOTICE '✅ Tabla order_items ya existe, verificando columnas...';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 4: Agregar columnas faltantes a order_items existente
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 AGREGANDO COLUMNAS FALTANTES A order_items:';
    
    -- Agregar price_per_unit si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'price_per_unit') THEN
        RAISE NOTICE '   ➕ Agregando columna price_per_unit...';
        ALTER TABLE order_items ADD COLUMN price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0;
        RAISE NOTICE '   ✅ Columna price_per_unit agregada';
    ELSE
        RAISE NOTICE '   ✅ Columna price_per_unit ya existe';
    END IF;
    
    -- Agregar total_price si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'total_price') THEN
        RAISE NOTICE '   ➕ Agregando columna total_price...';
        ALTER TABLE order_items ADD COLUMN total_price DECIMAL(10,2) NOT NULL DEFAULT 0;
        RAISE NOTICE '   ✅ Columna total_price agregada';
    ELSE
        RAISE NOTICE '   ✅ Columna total_price ya existe';
    END IF;
    
    -- Agregar quantity si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'quantity') THEN
        RAISE NOTICE '   ➕ Agregando columna quantity...';
        ALTER TABLE order_items ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;
        
        -- Agregar constraint después
        BEGIN
            ALTER TABLE order_items ADD CONSTRAINT order_items_quantity_check CHECK (quantity > 0);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '   ⚠️ Constraint quantity ya existe o error: %', SQLERRM;
        END;
        
        RAISE NOTICE '   ✅ Columna quantity agregada';
    ELSE
        RAISE NOTICE '   ✅ Columna quantity ya existe';
    END IF;
    
    -- Agregar order_id si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'order_id') THEN
        RAISE NOTICE '   ➕ Agregando columna order_id...';
        ALTER TABLE order_items ADD COLUMN order_id UUID;
        
        -- Agregar foreign key después si la tabla orders existe
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
            BEGIN
                ALTER TABLE order_items ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
                RAISE NOTICE '   ✅ Foreign key order_id agregada';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '   ⚠️ Foreign key order_id ya existe o error: %', SQLERRM;
            END;
        END IF;
        
        RAISE NOTICE '   ✅ Columna order_id agregada';
    ELSE
        RAISE NOTICE '   ✅ Columna order_id ya existe';
    END IF;
    
    -- Agregar product_id si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'product_id') THEN
        RAISE NOTICE '   ➕ Agregando columna product_id...';
        ALTER TABLE order_items ADD COLUMN product_id UUID;
        
        -- Agregar foreign key después si la tabla products existe
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
            BEGIN
                ALTER TABLE order_items ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
                RAISE NOTICE '   ✅ Foreign key product_id agregada';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '   ⚠️ Foreign key product_id ya existe o error: %', SQLERRM;
            END;
        END IF;
        
        RAISE NOTICE '   ✅ Columna product_id agregada';
    ELSE
        RAISE NOTICE '   ✅ Columna product_id ya existe';
    END IF;
    
    -- Agregar created_at si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'created_at') THEN
        RAISE NOTICE '   ➕ Agregando columna created_at...';
        ALTER TABLE order_items ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '   ✅ Columna created_at agregada';
    ELSE
        RAISE NOTICE '   ✅ Columna created_at ya existe';
    END IF;
    
    -- Agregar updated_at si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'updated_at') THEN
        RAISE NOTICE '   ➕ Agregando columna updated_at...';
        ALTER TABLE order_items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '   ✅ Columna updated_at agregada';
    ELSE
        RAISE NOTICE '   ✅ Columna updated_at ya existe';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 5: Configurar índices para order_items
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '📊 CONFIGURANDO ÍNDICES PARA order_items:';
    
    -- Índices para optimizar consultas
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
        RAISE NOTICE '   ✅ Índice order_id configurado';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ⚠️ Índice order_id ya existe o error: %', SQLERRM;
    END;
    
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
        RAISE NOTICE '   ✅ Índice product_id configurado';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ⚠️ Índice product_id ya existe o error: %', SQLERRM;
    END;
    
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_order_items_created_at ON order_items(created_at DESC);
        RAISE NOTICE '   ✅ Índice created_at configurado';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ⚠️ Índice created_at ya existe o error: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 6: Configurar función y trigger para updated_at (SINTAXIS CORREGIDA)
-- ============================================================================

-- Primero, crear la función con sintaxis corregida
CREATE OR REPLACE FUNCTION update_order_items_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- Crear el trigger usando la función
DO $$
BEGIN
    RAISE NOTICE '⚡ CONFIGURANDO TRIGGER PARA updated_at (SINTAXIS CORREGIDA):';
    
    -- Eliminar trigger existente si existe
    BEGIN
        DROP TRIGGER IF EXISTS update_order_items_updated_at_trigger ON order_items;
        RAISE NOTICE '   🗑️ Trigger anterior eliminado si existía';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ℹ️ No había trigger anterior: %', SQLERRM;
    END;
    
    -- Crear nuevo trigger
    BEGIN
        CREATE TRIGGER update_order_items_updated_at_trigger
            BEFORE UPDATE ON order_items
            FOR EACH ROW
            EXECUTE FUNCTION update_order_items_updated_at();
            
        RAISE NOTICE '   ✅ Trigger updated_at configurado correctamente';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ Error creando trigger: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 7: Configurar Row Level Security para order_items
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔒 CONFIGURANDO ROW LEVEL SECURITY PARA order_items:';
    
    -- Habilitar RLS
    BEGIN
        ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '   ✅ RLS habilitado en order_items';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ⚠️ Error habilitando RLS: %', SQLERRM;
    END;
    
    -- Policy para ver order_items
    BEGIN
        DROP POLICY IF EXISTS "Users can view order items from their orders" ON order_items;
        CREATE POLICY "Users can view order items from their orders" ON order_items
            FOR SELECT USING (
                order_id IN (
                    SELECT id FROM orders 
                    WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
                )
            );
        RAISE NOTICE '   ✅ Policy SELECT configurada';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ⚠️ Error configurando policy SELECT: %', SQLERRM;
    END;
    
    -- Policy para insertar order_items
    BEGIN
        DROP POLICY IF EXISTS "Users can insert order items" ON order_items;
        CREATE POLICY "Users can insert order items" ON order_items
            FOR INSERT WITH CHECK (
                order_id IN (
                    SELECT id FROM orders 
                    WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
                )
            );
        RAISE NOTICE '   ✅ Policy INSERT configurada';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ⚠️ Error configurando policy INSERT: %', SQLERRM;
    END;
    
    -- Policy para actualizar order_items
    BEGIN
        DROP POLICY IF EXISTS "Users can update order items" ON order_items;
        CREATE POLICY "Users can update order items" ON order_items
            FOR UPDATE USING (
                order_id IN (
                    SELECT id FROM orders 
                    WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
                )
            );
        RAISE NOTICE '   ✅ Policy UPDATE configurada';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ⚠️ Error configurando policy UPDATE: %', SQLERRM;
    END;
    
    -- Policy para eliminar order_items
    BEGIN
        DROP POLICY IF EXISTS "Users can delete order items" ON order_items;
        CREATE POLICY "Users can delete order items" ON order_items
            FOR DELETE USING (
                order_id IN (
                    SELECT id FROM orders 
                    WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
                )
            );
        RAISE NOTICE '   ✅ Policy DELETE configurada';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ⚠️ Error configurando policy DELETE: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 8: Verificación final completa
-- ============================================================================

DO $$
DECLARE
    table_exists BOOLEAN := FALSE;
    price_per_unit_exists BOOLEAN := FALSE;
    total_price_exists BOOLEAN := FALSE;
    quantity_exists BOOLEAN := FALSE;
    order_id_exists BOOLEAN := FALSE;
    product_id_exists BOOLEAN := FALSE;
    all_columns_exist BOOLEAN := FALSE;
    column_count INTEGER := 0;
    test_query_works BOOLEAN := FALSE;
    trigger_exists BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '🔍 VERIFICACIÓN FINAL COMPLETA (SINTAXIS CORREGIDA):';
    RAISE NOTICE '';
    
    -- Verificar tabla
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') 
    INTO table_exists;
    
    -- Verificar columnas específicas
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'price_per_unit') 
    INTO price_per_unit_exists;
    
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'total_price') 
    INTO total_price_exists;
    
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'quantity') 
    INTO quantity_exists;
    
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'order_id') 
    INTO order_id_exists;
    
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'product_id') 
    INTO product_id_exists;
    
    -- Verificar trigger
    SELECT EXISTS (
        SELECT FROM information_schema.triggers 
        WHERE trigger_name = 'update_order_items_updated_at_trigger' 
        AND event_object_table = 'order_items'
    ) INTO trigger_exists;
    
    -- Contar total de columnas
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_name = 'order_items';
    
    -- Verificar que todas las columnas críticas existen
    all_columns_exist := price_per_unit_exists AND total_price_exists AND quantity_exists AND order_id_exists AND product_id_exists;
    
    -- Probar query que estaba fallando
    BEGIN
        PERFORM price_per_unit, total_price, quantity FROM order_items LIMIT 1;
        test_query_works := TRUE;
    EXCEPTION WHEN OTHERS THEN
        test_query_works := FALSE;
    END;
    
    -- Mostrar resultados
    RAISE NOTICE '📊 RESULTADOS DE VERIFICACIÓN:';
    RAISE NOTICE '   Tabla order_items: %', CASE WHEN table_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   Total de columnas: %', column_count;
    RAISE NOTICE '   Columna price_per_unit: %', CASE WHEN price_per_unit_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   Columna total_price: %', CASE WHEN total_price_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   Columna quantity: %', CASE WHEN quantity_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   Columna order_id: %', CASE WHEN order_id_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   Columna product_id: %', CASE WHEN product_id_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   Trigger updated_at: %', CASE WHEN trigger_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   Query SELECT funciona: %', CASE WHEN test_query_works THEN '✅ SÍ' ELSE '❌ NO' END;
    
    RAISE NOTICE '';
    
    IF table_exists AND all_columns_exist AND test_query_works THEN
        RAISE NOTICE '🎉 ¡ERROR order_items COMPLETAMENTE CORREGIDO!';
        RAISE NOTICE '';
        RAISE NOTICE '✅ La tabla order_items existe con todas las columnas necesarias';
        RAISE NOTICE '✅ La columna price_per_unit está disponible';
        RAISE NOTICE '✅ Las queries SELECT funcionan correctamente';
        RAISE NOTICE '✅ El sistema de órdenes debería funcionar';
        RAISE NOTICE '✅ Sintaxis SQL corregida sin errores';
        RAISE NOTICE '';
        RAISE NOTICE '🔄 El error "column order_items_1.price_per_unit does not exist" está solucionado.';
        RAISE NOTICE '📱 Recarga la aplicación TRATO para confirmar que el error desapareció.';
    ELSE
        RAISE NOTICE '❌ CORRECCIÓN INCOMPLETA DE order_items';
        RAISE NOTICE '';
        RAISE NOTICE '🔧 Problemas detectados:';
        
        IF NOT table_exists THEN
            RAISE NOTICE '   • La tabla order_items no se pudo crear';
        END IF;
        
        IF NOT price_per_unit_exists THEN
            RAISE NOTICE '   • La columna price_per_unit no se pudo agregar';
        END IF;
        
        IF NOT total_price_exists THEN
            RAISE NOTICE '   • La columna total_price no se pudo agregar';
        END IF;
        
        IF NOT test_query_works THEN
            RAISE NOTICE '   • Las queries SELECT aún fallan';
        END IF;
        
        RAISE NOTICE '';
        RAISE NOTICE '💡 SOLUCIONES:';
        RAISE NOTICE '   1. Verifica que las tablas orders y products existan';
        RAISE NOTICE '   2. Ejecuta fix_all_schema_errors_final_corrected.sql (corrección completa)';
        RAISE NOTICE '   3. Verifica los permisos de la base de datos';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 CORRECCIÓN ESPECÍFICA order_items COMPLETADA (SIN ERRORES DE SINTAXIS).';
    
END $$;