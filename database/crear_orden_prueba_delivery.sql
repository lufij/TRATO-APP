-- =====================================================
-- SCRIPT PARA CREAR ORDEN DE PRUEBA PARA REPARTIDORES
-- =====================================================
-- Este script crea una orden lista para entrega para probar el sistema

-- 1. Crear una orden de prueba con estado 'ready' para delivery
DO $$
DECLARE
    test_buyer_id UUID;
    test_seller_id UUID;
    test_order_id UUID;
BEGIN
    -- Obtener o crear un comprador de prueba
    SELECT id INTO test_buyer_id 
    FROM public.users 
    WHERE role = 'comprador' 
    LIMIT 1;
    
    IF test_buyer_id IS NULL THEN
        INSERT INTO public.users (id, email, name, role, phone, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'comprador.prueba@trato.com',
            'Juan Pérez - Comprador',
            'comprador',
            '+502 5555-0001',
            NOW(),
            NOW()
        ) RETURNING id INTO test_buyer_id;
        
        RAISE NOTICE 'Comprador de prueba creado: %', test_buyer_id;
    END IF;
    
    -- Obtener o crear un vendedor de prueba
    SELECT id INTO test_seller_id 
    FROM public.users 
    WHERE role = 'vendedor' 
    LIMIT 1;
    
    IF test_seller_id IS NULL THEN
        INSERT INTO public.users (id, email, name, role, phone, address, business_name, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'vendedor.prueba@trato.com',
            'María García - Vendedora',
            'vendedor',
            '+502 5555-0002',
            'Zona 10, Ciudad de Guatemala',
            'Restaurante La Delicia',
            NOW(),
            NOW()
        ) RETURNING id INTO test_seller_id;
        
        RAISE NOTICE 'Vendedor de prueba creado: %', test_seller_id;
    END IF;
    
    -- Crear orden de prueba lista para entrega
    INSERT INTO public.orders (
        id,
        buyer_id,
        seller_id,
        total,
        status,
        delivery_type,
        delivery_address,
        estimated_time,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        test_buyer_id,
        test_seller_id,
        125.50,
        'ready',  -- Lista para que un repartidor la tome
        'delivery',
        'Avenida Reforma 15-07, Zona 9, Ciudad de Guatemala',
        25,
        NOW(),
        NOW()
    ) RETURNING id INTO test_order_id;
    
    -- Agregar items a la orden
    INSERT INTO public.order_items (
        order_id,
        product_name,
        quantity,
        price_per_unit,
        total_price
    ) VALUES 
    (test_order_id, 'Pizza Margherita', 1, 85.00, 85.00),
    (test_order_id, 'Refresco Coca-Cola', 2, 12.50, 25.00),
    (test_order_id, 'Papas fritas', 1, 15.50, 15.50);
    
    RAISE NOTICE 'Orden de prueba creada exitosamente: %', test_order_id;
    RAISE NOTICE 'Estado: ready, Tipo: delivery';
    RAISE NOTICE 'La orden aparecerá en el dashboard de repartidores';
END $$;

-- 2. Mostrar la orden creada
SELECT 
    'Orden de prueba creada' as info,
    o.id,
    o.total,
    o.status,
    o.delivery_type,
    o.delivery_address,
    o.estimated_time,
    u.name as vendedor,
    u.business_name
FROM public.orders o
LEFT JOIN public.users u ON o.seller_id = u.id
WHERE o.status = 'ready' 
AND o.delivery_type = 'delivery'
AND o.driver_id IS NULL
ORDER BY o.created_at DESC
LIMIT 1;

SELECT 'Orden de prueba lista para repartidores' as status;
