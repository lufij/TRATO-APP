-- =====================================================
-- 🔧 FIX: FORZAR ACTUALIZACIÓN DE CACHE EN FRONTEND
-- =====================================================

-- Primero, vamos a verificar exactamente qué está viendo el comprador
-- comparado con lo que debería ver

-- 🔍 VERIFICACIÓN RÁPIDA: ¿Qué calcomanías existen y cuál es su stock?
SELECT 
    id,
    name as "Producto",
    stock_quantity as "Stock Real",
    is_public as "¿Público?",
    seller_id,
    updated_at as "Última Actualización"
FROM public.products 
WHERE name ILIKE '%calcoman%'
ORDER BY name;

-- 🔍 SIMULACIÓN EXACTA: Query que usa el comprador
SELECT 
    id,
    name as "Producto que VE el comprador",
    stock_quantity as "Stock Visible",
    updated_at as "Última Actualización"
FROM public.products 
WHERE is_public = true 
  AND stock_quantity > 0
  AND name ILIKE '%calcoman%'
ORDER BY created_at DESC;

-- 🎯 RESULTADO: Si no aparece "Calcomanías para carros" en la segunda query,
-- el problema está en el frontend, no en la base de datos.
