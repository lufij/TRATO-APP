-- ================================================
-- SISTEMA DE NOTIFICACIONES Y CALIFICACIONES
-- Ejecutar después de marcar pedidos como entregados
-- ================================================

-- 1. TABLA DE NOTIFICACIONES
-- ===========================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'delivery_completed', 'new_order', 'rating_request', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Datos adicionales como order_id, action_required, etc.
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para notificaciones
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_id, is_read) WHERE is_read = FALSE;

-- 2. TABLA DE CALIFICACIONES
-- ===========================
CREATE TABLE IF NOT EXISTS ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Quien califica
    rated_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Quien es calificado
    rating_type VARCHAR(50) NOT NULL, -- 'seller_to_driver', 'seller_to_buyer', 'buyer_to_seller', 'buyer_to_driver'
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Calificación de 1 a 5 estrellas
    comment TEXT, -- Comentario opcional
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'skipped'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraint para evitar calificaciones duplicadas
    UNIQUE(order_id, rater_id, rated_id, rating_type)
);

-- Índices para calificaciones
CREATE INDEX IF NOT EXISTS idx_ratings_order_id ON ratings(order_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rater_id ON ratings(rater_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rated_id ON ratings(rated_id);
CREATE INDEX IF NOT EXISTS idx_ratings_status ON ratings(status);
CREATE INDEX IF NOT EXISTS idx_ratings_type ON ratings(rating_type);

-- 3. VISTA PARA ESTADÍSTICAS DE CALIFICACIONES
-- =============================================
CREATE OR REPLACE VIEW user_rating_stats AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.role as user_role,
    
    -- Calificaciones como vendedor
    COALESCE(seller_stats.avg_rating, 0) as seller_rating,
    COALESCE(seller_stats.total_ratings, 0) as seller_total_ratings,
    
    -- Calificaciones como comprador
    COALESCE(buyer_stats.avg_rating, 0) as buyer_rating,
    COALESCE(buyer_stats.total_ratings, 0) as buyer_total_ratings,
    
    -- Calificaciones como repartidor
    COALESCE(driver_stats.avg_rating, 0) as driver_rating,
    COALESCE(driver_stats.total_ratings, 0) as driver_total_ratings,
    
    -- Calificación promedio general
    COALESCE(
        (COALESCE(seller_stats.avg_rating * seller_stats.total_ratings, 0) + 
         COALESCE(buyer_stats.avg_rating * buyer_stats.total_ratings, 0) + 
         COALESCE(driver_stats.avg_rating * driver_stats.total_ratings, 0)) / 
        NULLIF(COALESCE(seller_stats.total_ratings, 0) + 
               COALESCE(buyer_stats.total_ratings, 0) + 
               COALESCE(driver_stats.total_ratings, 0), 0), 
        0
    ) as overall_rating
    
FROM users u

-- Estadísticas como vendedor
LEFT JOIN (
    SELECT 
        rated_id,
        ROUND(AVG(rating::numeric), 2) as avg_rating,
        COUNT(*) as total_ratings
    FROM ratings 
    WHERE rating_type IN ('buyer_to_seller') 
    AND status = 'completed'
    GROUP BY rated_id
) seller_stats ON u.id = seller_stats.rated_id

-- Estadísticas como comprador
LEFT JOIN (
    SELECT 
        rated_id,
        ROUND(AVG(rating::numeric), 2) as avg_rating,
        COUNT(*) as total_ratings
    FROM ratings 
    WHERE rating_type IN ('seller_to_buyer') 
    AND status = 'completed'
    GROUP BY rated_id
) buyer_stats ON u.id = buyer_stats.rated_id

-- Estadísticas como repartidor
LEFT JOIN (
    SELECT 
        rated_id,
        ROUND(AVG(rating::numeric), 2) as avg_rating,
        COUNT(*) as total_ratings
    FROM ratings 
    WHERE rating_type IN ('seller_to_driver', 'buyer_to_driver') 
    AND status = 'completed'
    GROUP BY rated_id
) driver_stats ON u.id = driver_stats.rated_id;

-- 4. FUNCIÓN PARA OBTENER NOTIFICACIONES NO LEÍDAS
-- =================================================
CREATE OR REPLACE FUNCTION get_unread_notifications(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    type VARCHAR,
    title VARCHAR,
    message TEXT,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.type,
        n.title,
        n.message,
        n.data,
        n.created_at
    FROM notifications n
    WHERE n.recipient_id = p_user_id 
    AND n.is_read = FALSE
    ORDER BY n.created_at DESC;
END;
$$;

-- 5. FUNCIÓN PARA MARCAR NOTIFICACIÓN COMO LEÍDA
-- ===============================================
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
    UPDATE notifications 
    SET 
        is_read = TRUE,
        updated_at = NOW()
    WHERE id = p_notification_id 
    AND recipient_id = p_user_id;
    
    RETURN FOUND;
END;
$$;

-- 6. FUNCIÓN PARA OBTENER CALIFICACIONES PENDIENTES
-- =================================================
CREATE OR REPLACE FUNCTION get_pending_ratings(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    order_id UUID,
    rated_user_id UUID,
    rated_user_name VARCHAR,
    rating_type VARCHAR,
    order_total DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.order_id,
        r.rated_id,
        u.name,
        r.rating_type,
        o.total,
        r.created_at
    FROM ratings r
    JOIN users u ON u.id = r.rated_id
    JOIN orders o ON o.id = r.order_id
    WHERE r.rater_id = p_user_id 
    AND r.status = 'pending'
    ORDER BY r.created_at DESC;
END;
$$;

-- 7. FUNCIÓN PARA COMPLETAR CALIFICACIÓN
-- ======================================
CREATE OR REPLACE FUNCTION complete_rating(
    p_rating_id UUID,
    p_user_id UUID,
    p_rating INTEGER,
    p_comment TEXT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
    -- Validar que la calificación esté entre 1 y 5
    IF p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION 'La calificación debe estar entre 1 y 5 estrellas';
    END IF;
    
    -- Actualizar la calificación
    UPDATE ratings 
    SET 
        rating = p_rating,
        comment = p_comment,
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_rating_id 
    AND rater_id = p_user_id
    AND status = 'pending';
    
    RETURN FOUND;
END;
$$;

-- 8. FUNCIÓN PARA OBTENER HISTORIAL DE PEDIDOS
-- =============================================
CREATE OR REPLACE FUNCTION get_order_history(p_user_id UUID, p_role VARCHAR DEFAULT NULL)
RETURNS TABLE (
    order_id UUID,
    order_number VARCHAR,
    status VARCHAR,
    total DECIMAL,
    delivery_fee DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    seller_name VARCHAR,
    buyer_name VARCHAR,
    driver_name VARCHAR,
    business_name VARCHAR,
    can_rate BOOLEAN
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        CONCAT('#', SUBSTRING(o.id::text, 1, 8)) as order_number,
        o.status,
        o.total,
        o.delivery_fee,
        o.created_at,
        o.delivered_at,
        seller.name as seller_name,
        buyer.name as buyer_name,
        driver.name as driver_name,
        s.business_name,
        
        -- Verificar si puede calificar (tiene calificaciones pendientes)
        EXISTS(
            SELECT 1 FROM ratings r 
            WHERE r.order_id = o.id 
            AND r.rater_id = p_user_id 
            AND r.status = 'pending'
        ) as can_rate
        
    FROM orders o
    LEFT JOIN users seller ON seller.id = o.seller_id
    LEFT JOIN users buyer ON buyer.id = o.buyer_id
    LEFT JOIN users driver ON driver.id = o.driver_id
    LEFT JOIN sellers s ON s.id = o.seller_id
    WHERE 
        (p_role IS NULL OR 
         (p_role = 'seller' AND o.seller_id = p_user_id) OR
         (p_role = 'buyer' AND o.buyer_id = p_user_id) OR
         (p_role = 'driver' AND o.driver_id = p_user_id))
    AND o.status = 'delivered'
    ORDER BY o.delivered_at DESC;
END;
$$;

-- 9. POLÍTICAS DE SEGURIDAD RLS
-- ==============================

-- Habilitar RLS en las nuevas tablas
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Política para notificaciones: Los usuarios solo pueden ver sus propias notificaciones
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = recipient_id);

-- Política para calificaciones: Los usuarios pueden ver calificaciones donde participan
CREATE POLICY "Users can view related ratings" ON ratings
    FOR SELECT USING (auth.uid() = rater_id OR auth.uid() = rated_id);

CREATE POLICY "Users can update own ratings" ON ratings
    FOR UPDATE USING (auth.uid() = rater_id);

-- 10. TRIGGERS PARA UPDATED_AT
-- =============================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para notifications
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para ratings
DROP TRIGGER IF EXISTS update_ratings_updated_at ON ratings;
CREATE TRIGGER update_ratings_updated_at
    BEFORE UPDATE ON ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- COMENTARIOS IMPORTANTES:
-- ================================================
-- 1. Las notificaciones se envían automáticamente cuando el repartidor marca 'delivered'
-- 2. Se crean 4 registros de calificación pendientes por cada pedido entregado:
--    - Vendedor califica al repartidor
--    - Vendedor califica al comprador  
--    - Comprador califica al vendedor
--    - Comprador califica al repartidor
-- 3. Los pedidos aparecen en el historial solo después de ser entregados
-- 4. Las calificaciones se almacenan de 1 a 5 estrellas con comentarios opcionales
-- 5. Las estadísticas se calculan automáticamente con la vista user_rating_stats

-- ¡EJECUTAR ESTE SCRIPT PARA HABILITAR EL SISTEMA COMPLETO!
