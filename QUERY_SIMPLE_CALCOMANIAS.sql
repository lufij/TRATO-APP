-- Query 1: Ver el producto específico de calcomanías para carros
SELECT 
    id,
    name,
    stock_quantity,
    is_public,
    is_available,
    seller_id,
    price,
    created_at,
    updated_at
FROM public.products 
WHERE name ILIKE '%calcoman%carros%';

-- Query 2: Ver TODOS los productos de calcomanías
SELECT 
    id,
    name,
    stock_quantity,
    is_public,
    is_available,
    seller_id
FROM public.products 
WHERE name ILIKE '%calcoman%'
ORDER BY name;

-- Query 3: Verificar si hay campo is_available
SELECT 
    name,
    stock_quantity,
    is_public,
    is_available
FROM public.products 
WHERE name ILIKE '%calcoman%carros%';

-- Query 4: Query exacta del comprador
SELECT 
    id,
    name,
    stock_quantity
FROM public.products 
WHERE is_public = true 
  AND stock_quantity > 0
  AND name ILIKE '%calcoman%carros%';
