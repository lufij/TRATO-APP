-- 🔥 TRIGGER CRÍTICO: Crear calificaciones pendientes al entregar orden

-- 1️⃣ FUNCIÓN PARA CREAR CALIFICACIONES PENDIENTES
CREATE OR REPLACE FUNCTION create_pending_ratings_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo ejecutar cuando el estado cambia a 'delivered'
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        
        RAISE NOTICE '🌟 Orden % entregada. Creando calificaciones pendientes...', NEW.id;
        
        -- 1. Comprador califica al Vendedor
        INSERT INTO ratings (order_id, rater_id, rated_id, rating_type, status)
        VALUES (NEW.id, NEW.buyer_id, NEW.seller_id, 'buyer_to_seller', 'pending')
        ON CONFLICT (order_id, rater_id, rated_id, rating_type) DO NOTHING;
        
        -- 2. Vendedor califica al Comprador  
        INSERT INTO ratings (order_id, rater_id, rated_id, rating_type, status)
        VALUES (NEW.id, NEW.seller_id, NEW.buyer_id, 'seller_to_buyer', 'pending')
        ON CONFLICT (order_id, rater_id, rated_id, rating_type) DO NOTHING;
        
        -- 3. Si hay repartidor, crear calificaciones adicionales
        IF NEW.driver_id IS NOT NULL THEN
            -- Comprador califica al Repartidor
            INSERT INTO ratings (order_id, rater_id, rated_id, rating_type, status)
            VALUES (NEW.id, NEW.buyer_id, NEW.driver_id, 'buyer_to_driver', 'pending')
            ON CONFLICT (order_id, rater_id, rated_id, rating_type) DO NOTHING;
            
            -- Vendedor califica al Repartidor
            INSERT INTO ratings (order_id, rater_id, rated_id, rating_type, status)
            VALUES (NEW.id, NEW.seller_id, NEW.driver_id, 'seller_to_driver', 'pending')
            ON CONFLICT (order_id, rater_id, rated_id, rating_type) DO NOTHING;
        END IF;
        
        RAISE NOTICE '✅ Calificaciones pendientes creadas para orden %', NEW.id;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2️⃣ CREAR EL TRIGGER
DROP TRIGGER IF EXISTS trigger_create_pending_ratings ON orders;

CREATE TRIGGER trigger_create_pending_ratings
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION create_pending_ratings_on_delivery();

-- 3️⃣ CREAR CALIFICACIONES PARA LA ORDEN ACTUAL (MANUAL)
-- Usar el ID de orden del screenshot: 44d2a792-3f5f-49f3-b7f6-b7537d20d58a
INSERT INTO ratings (order_id, rater_id, rated_id, rating_type, status)
SELECT 
    '44d2a792-3f5f-49f3-bf76-b7537d20d58a'::uuid, 
    buyer_id, 
    seller_id, 
    'buyer_to_seller', 
    'pending'
FROM orders 
WHERE id = '44d2a792-3f5f-49f3-bf76-b7537d20d58a'
ON CONFLICT (order_id, rater_id, rated_id, rating_type) DO NOTHING;

-- 4️⃣ VERIFICAR QUE SE CREÓ
SELECT * FROM ratings WHERE order_id = '44d2a792-3f5f-49f3-bf76-b7537d20d58a';
