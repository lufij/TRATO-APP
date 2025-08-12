-- Verificar datos del marketplace para vendedores
-- Ejecuta este script para verificar que hay datos suficientes para probar el marketplace

DO $$
DECLARE
    total_users INTEGER := 0;
    total_vendors INTEGER := 0;
    total_products INTEGER := 0;
    total_daily_products INTEGER := 0;
    current_user_id TEXT;
BEGIN
    RAISE NOTICE '🔍 VERIFICACIÓN DE DATOS DEL MARKETPLACE';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '';

    -- 1. Verificar usuarios totales
    SELECT COUNT(*) INTO total_users FROM users;
    RAISE NOTICE '👥 Total de usuarios registrados: %', total_users;

    -- 2. Verificar vendedores
    SELECT COUNT(*) INTO total_vendors 
    FROM users 
    WHERE role = 'vendedor' AND is_active = true;
    RAISE NOTICE '🏪 Total de vendedores activos: %', total_vendors;

    -- 3. Verificar productos
    SELECT COUNT(*) INTO total_products 
    FROM products 
    WHERE is_public = true AND stock_quantity > 0;
    RAISE NOTICE '📦 Total de productos públicos disponibles: %', total_products;

    -- 4. Verificar productos del día
    SELECT COUNT(*) INTO total_daily_products 
    FROM daily_products 
    WHERE expires_at >= NOW() AND stock_quantity > 0;
    RAISE NOTICE '⏰ Total de productos del día activos: %', total_daily_products;

    RAISE NOTICE '';
    RAISE NOTICE '📋 RESUMEN POR VENDEDOR:';
    RAISE NOTICE '========================';

    -- 5. Mostrar detalles por vendedor
    FOR current_user_id IN 
        SELECT id FROM users WHERE role = 'vendedor' AND is_active = true
    LOOP
        DECLARE
            vendor_name TEXT;
            vendor_products INTEGER := 0;
            vendor_daily_products INTEGER := 0;
        BEGIN
            -- Obtener nombre del vendedor
            SELECT name INTO vendor_name FROM users WHERE id = current_user_id;
            
            -- Contar productos del vendedor
            SELECT COUNT(*) INTO vendor_products 
            FROM products 
            WHERE seller_id = current_user_id AND is_public = true;
            
            -- Contar productos del día del vendedor
            SELECT COUNT(*) INTO vendor_daily_products 
            FROM daily_products 
            WHERE seller_id = current_user_id AND expires_at >= NOW();
            
            RAISE NOTICE '• %: % productos, % del día', 
                COALESCE(vendor_name, 'Sin nombre'), 
                vendor_products, 
                vendor_daily_products;
        END;
    END LOOP;

    RAISE NOTICE '';
    
    -- 6. Verificar datos para el marketplace
    IF total_vendors < 2 THEN
        RAISE NOTICE '⚠️  PROBLEMA: Se necesitan al menos 2 vendedores para probar el marketplace';
        RAISE NOTICE '   Solución: Registra más vendedores o reactiva vendedores existentes';
    END IF;

    IF total_products = 0 THEN
        RAISE NOTICE '⚠️  PROBLEMA: No hay productos públicos para mostrar';
        RAISE NOTICE '   Solución: Los vendedores deben agregar productos y marcarlos como públicos';
    END IF;

    -- 7. Crear datos de prueba si no existen
    IF total_vendors < 2 OR total_products = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '🛠️  CREANDO DATOS DE PRUEBA...';
        
        -- Crear vendedor de prueba si no existe
        IF NOT EXISTS (SELECT 1 FROM users WHERE name = 'Tienda Demo' AND role = 'vendedor') THEN
            INSERT INTO users (
                id, 
                name, 
                email, 
                role, 
                phone, 
                business_name, 
                business_description,
                business_rating,
                total_reviews,
                is_active,
                is_open
            ) VALUES (
                gen_random_uuid()::text,
                'Tienda Demo',
                'demo.tienda@example.com',
                'vendedor',
                '+502 1234-5678',
                'Tienda de Comida',
                'Tienda de demostración con productos variados para probar el marketplace',
                4.5,
                25,
                true,
                true
            );
            RAISE NOTICE '✅ Vendedor demo creado: Tienda Demo';
        END IF;

        -- Crear productos de prueba
        IF total_products < 3 THEN
            DECLARE
                demo_seller_id TEXT;
            BEGIN
                SELECT id INTO demo_seller_id FROM users WHERE name = 'Tienda Demo' LIMIT 1;
                
                IF demo_seller_id IS NOT NULL THEN
                    -- Producto 1: Hamburguesa
                    IF NOT EXISTS (SELECT 1 FROM products WHERE name = 'Hamburguesa Especial Demo') THEN
                        INSERT INTO products (
                            id,
                            seller_id,
                            name,
                            description,
                            price,
                            image_url,
                            category,
                            stock_quantity,
                            is_public
                        ) VALUES (
                            gen_random_uuid()::text,
                            demo_seller_id,
                            'Hamburguesa Especial Demo',
                            'Deliciosa hamburguesa con carne, queso y vegetales frescos',
                            35.00,
                            'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
                            'Comida Rápida',
                            10,
                            true
                        );
                    END IF;

                    -- Producto 2: Pizza
                    IF NOT EXISTS (SELECT 1 FROM products WHERE name = 'Pizza Margherita Demo') THEN
                        INSERT INTO products (
                            id,
                            seller_id,
                            name,
                            description,
                            price,
                            image_url,
                            category,
                            stock_quantity,
                            is_public
                        ) VALUES (
                            gen_random_uuid()::text,
                            demo_seller_id,
                            'Pizza Margherita Demo',
                            'Pizza clásica con salsa de tomate, mozzarella y albahaca fresca',
                            45.00,
                            'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400',
                            'Pizza',
                            5,
                            true
                        );
                    END IF;

                    -- Producto del día
                    IF NOT EXISTS (SELECT 1 FROM daily_products WHERE name = 'Especial del Día Demo') THEN
                        INSERT INTO daily_products (
                            id,
                            seller_id,
                            name,
                            description,
                            price,
                            image_url,
                            stock_quantity,
                            expires_at
                        ) VALUES (
                            gen_random_uuid()::text,
                            demo_seller_id,
                            'Especial del Día Demo',
                            'Oferta especial del día - Combo completo con descuento',
                            25.00,
                            'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400',
                            3,
                            (NOW() + INTERVAL '23 hours 59 minutes')::timestamp
                        );
                    END IF;

                    RAISE NOTICE '✅ Productos demo creados';
                END IF;
            END;
        END IF;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '🎯 RESULTADO FINAL:';
    RAISE NOTICE '==================';
    
    -- Recargar contadores
    SELECT COUNT(*) INTO total_vendors FROM users WHERE role = 'vendedor' AND is_active = true;
    SELECT COUNT(*) INTO total_products FROM products WHERE is_public = true AND stock_quantity > 0;
    SELECT COUNT(*) INTO total_daily_products FROM daily_products WHERE expires_at >= NOW() AND stock_quantity > 0;

    IF total_vendors >= 2 AND total_products > 0 THEN
        RAISE NOTICE '✅ El marketplace está listo para usar';
        RAISE NOTICE '   • % vendedores disponibles', total_vendors;
        RAISE NOTICE '   • % productos públicos', total_products;
        RAISE NOTICE '   • % ofertas del día', total_daily_products;
    ELSE
        RAISE NOTICE '❌ El marketplace necesita más datos';
        RAISE NOTICE '   • Vendedores: % (necesita al menos 2)', total_vendors;
        RAISE NOTICE '   • Productos: % (necesita al menos 1)', total_products;
    END IF;

    RAISE NOTICE '';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RAISE NOTICE '💡 Esto puede indicar que las tablas no existen aún';
    RAISE NOTICE '   Ejecuta /database/fix_setup.sql primero';
END $$;