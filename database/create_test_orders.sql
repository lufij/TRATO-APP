-- ============================================================================
-- TRATO - Crear Pedidos de Prueba
-- ============================================================================
-- Este script crea algunos pedidos de prueba para verificar que el sistema
-- de órdenes del vendedor funciona correctamente.
-- ============================================================================

DO $$
DECLARE
    test_buyer_id UUID;
    test_seller_id UUID;
    test_product_id UUID;
    test_order_id UUID;
BEGIN
    RAISE NOTICE '🧪 CREANDO PEDIDOS DE PRUEBA...';
    RAISE NOTICE '';
    
    -- Verificar que existen las tablas necesarias
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
        RAISE NOTICE '❌ Tabla orders no existe. Ejecuta fix_setup.sql primero.';
        RETURN;
    END IF;
    
    -- Buscar un comprador de prueba
    SELECT id INTO test_buyer_id 
    FROM users 
    WHERE role = 'comprador' 
    LIMIT 1;
    
    IF test_buyer_id IS NULL THEN
        RAISE NOTICE '⚠️  No se encontró un comprador. Creando comprador de prueba...';
        
        INSERT INTO users (id, email, password, name, phone, role, is_active)
        VALUES (
            gen_random_uuid(),
            'comprador.prueba@trato.app',
            'password123',
            'Cliente de Prueba',
            '+502 1111-1111',
            'comprador',
            true
        )
        RETURNING id INTO test_buyer_id;
        
        RAISE NOTICE '✅ Comprador de prueba creado: %', test_buyer_id;
    END IF;
    
    -- Buscar un vendedor de prueba
    SELECT id INTO test_seller_id 
    FROM users 
    WHERE role = 'vendedor' 
    LIMIT 1;
    
    IF test_seller_id IS NULL THEN
        RAISE NOTICE '⚠️  No se encontró un vendedor. Creando vendedor de prueba...';
        
        INSERT INTO users (id, email, password, name, phone, role, is_active)
        VALUES (
            gen_random_uuid(),
            'vendedor.prueba@trato.app',
            'password123',
            'Restaurante de Prueba',
            '+502 2222-2222',
            'vendedor',
            true
        )
        RETURNING id INTO test_seller_id;
        
        RAISE NOTICE '✅ Vendedor de prueba creado: %', test_seller_id;
    END IF;
    
    -- Buscar o crear un producto de prueba
    SELECT id INTO test_product_id 
    FROM products 
    WHERE seller_id = test_seller_id 
    LIMIT 1;
    
    IF test_product_id IS NULL THEN
        RAISE NOTICE '⚠️  No se encontró un producto. Creando producto de prueba...';
        
        INSERT INTO products (id, seller_id, name, description, price, category, stock_quantity, is_public)
        VALUES (
            gen_random_uuid(),
            test_seller_id,
            'Tacos de Pollo',
            'Deliciosos tacos de pollo con verduras frescas',
            15.00,
            'Comida',
            50,
            true
        )
        RETURNING id INTO test_product_id;
        
        RAISE NOTICE '✅ Producto de prueba creado: %', test_product_id;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '📦 CREANDO PEDIDOS DE EJEMPLO...';
    
    -- Crear pedido pendiente
    INSERT INTO orders (
        id,
        buyer_id,
        seller_id,
        total,
        status,
        delivery_address,
        delivery_type,
        notes,
        estimated_delivery,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        test_buyer_id,
        test_seller_id,
        45.00,
        'pending',
        'Barrio El Centro, Casa #123, Gualán',
        'delivery',
        'Sin cebolla en los tacos, por favor',
        NOW() + INTERVAL '45 minutes',
        NOW(),
        NOW()
    )
    RETURNING id INTO test_order_id;
    
    -- Agregar items al pedido pendiente
    INSERT INTO order_items (id, order_id, product_id, quantity, price_per_unit, total_price)
    VALUES (
        gen_random_uuid(),
        test_order_id,
        test_product_id,
        3,
        15.00,
        45.00
    );
    
    RAISE NOTICE '✅ Pedido pendiente creado: % (Q45.00)', test_order_id;
    
    -- Crear pedido confirmado
    INSERT INTO orders (
        id,
        buyer_id,
        seller_id,
        total,
        status,
        delivery_address,
        delivery_type,
        estimated_delivery,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        test_buyer_id,
        test_seller_id,
        30.00,
        'confirmed',
        'Colonia Las Flores, Avenida Principal, Gualán',
        'pickup',
        NOW() + INTERVAL '30 minutes',
        NOW() - INTERVAL '10 minutes',
        NOW() - INTERVAL '5 minutes'
    )
    RETURNING id INTO test_order_id;
    
    -- Agregar items al pedido confirmado
    INSERT INTO order_items (id, order_id, product_id, quantity, price_per_unit, total_price)
    VALUES (
        gen_random_uuid(),
        test_order_id,
        test_product_id,
        2,
        15.00,
        30.00
    );
    
    RAISE NOTICE '✅ Pedido confirmado creado: % (Q30.00)', test_order_id;
    
    -- Crear pedido entregado (para estadísticas)
    INSERT INTO orders (
        id,
        buyer_id,
        seller_id,
        total,
        status,
        delivery_address,
        delivery_type,
        estimated_delivery,
        delivered_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        test_buyer_id,
        test_seller_id,
        60.00,
        'delivered',
        'Zona 2, Edificio San José Apt. 4B, Gualán',
        'delivery',
        NOW() - INTERVAL '30 minutes',
        NOW() - INTERVAL '15 minutes',
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '15 minutes'
    )
    RETURNING id INTO test_order_id;
    
    -- Agregar items al pedido entregado
    INSERT INTO order_items (id, order_id, product_id, quantity, price_per_unit, total_price)
    VALUES (
        gen_random_uuid(),
        test_order_id,
        test_product_id,
        4,
        15.00,
        60.00
    );
    
    RAISE NOTICE '✅ Pedido entregado creado: % (Q60.00)', test_order_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 PEDIDOS DE PRUEBA CREADOS EXITOSAMENTE!';
    RAISE NOTICE '';
    RAISE NOTICE '📱 PRÓXIMOS PASOS:';
    RAISE NOTICE '   1. Recarga la aplicación TRATO';
    RAISE NOTICE '   2. Inicia sesión como vendedor con: vendedor.prueba@trato.app';
    RAISE NOTICE '   3. Ve a la sección "Pedidos"';
    RAISE NOTICE '   4. Verifica que aparecen los 3 pedidos de prueba';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Los pedidos reales ahora aparecerán en lugar de datos demo.';
    
END $$;