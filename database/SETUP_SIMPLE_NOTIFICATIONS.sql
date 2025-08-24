-- ================================================
-- SETUP SIMPLE - SOLO TABLAS ESENCIALES
-- ================================================

-- 1. TABLA DE NOTIFICACIONES (SIMPLE)
-- ===================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA DE CALIFICACIONES (SIMPLE)
-- ===================================
CREATE TABLE IF NOT EXISTS ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL,
    rater_id UUID NOT NULL,
    rated_id UUID NOT NULL,
    rating_type VARCHAR(50) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(order_id, rater_id, rated_id, rating_type)
);

-- 3. FUNCIÓN SIMPLE PARA COMPLETAR CALIFICACIÓN
-- =============================================
CREATE OR REPLACE FUNCTION complete_rating(
    p_rating_id UUID,
    p_user_id UUID,
    p_rating INTEGER,
    p_comment TEXT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
    IF p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION 'La calificación debe estar entre 1 y 5 estrellas';
    END IF;
    
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

-- 4. ÍNDICES BÁSICOS
-- ==================
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_ratings_order ON ratings(order_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rater ON ratings(rater_id);

-- ¡LISTO! SCRIPT MÍNIMO PARA FUNCIONAR
