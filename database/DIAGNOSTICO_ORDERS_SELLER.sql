-- Script para diagnosticar y corregir problemas con la tabla orders
-- Verificar estructura de la tabla orders y posibles problemas

-- 1. Verificar estructura de la tabla orders
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- 2. Verificar si hay órdenes con seller_id nulo o inválido
SELECT id, seller_id, buyer_id, status, created_at
FROM orders 
WHERE seller_id IS NULL OR seller_id = ''
LIMIT 10;

-- 3. Verificar si hay conflictos en los IDs
SELECT COUNT(*) as total_orders, 
       COUNT(DISTINCT id) as unique_ids,
       COUNT(DISTINCT seller_id) as unique_sellers
FROM orders;

-- 4. Verificar órdenes específicas del usuario problemático
SELECT id, seller_id, buyer_id, status, created_at, updated_at
FROM orders 
WHERE seller_id = '561711e7-a66e-4166-93f0-3038666c4096'
ORDER BY created_at DESC
LIMIT 5;
