-- Script para actualizar productos existentes
-- Ya que la columna is_available existe, solo actualizamos los valores

-- Verificar el estado actual
SELECT 
    COUNT(*) as total_productos,
    COUNT(CASE WHEN is_available = true THEN 1 END) as disponibles,
    COUNT(CASE WHEN is_available = false THEN 1 END) as no_disponibles,
    COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as con_stock,
    COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as sin_stock
FROM public.products;

-- Actualizar productos para que is_available refleje el stock real
-- Si tienen stock > 0, marcarlos como disponibles
-- Si no tienen stock, marcarlos como no disponibles
UPDATE public.products 
SET is_available = CASE 
    WHEN stock_quantity > 0 THEN true 
    ELSE false 
END;

-- Verificar los cambios
SELECT 
    COUNT(*) as total_productos,
    COUNT(CASE WHEN is_available = true THEN 1 END) as disponibles,
    COUNT(CASE WHEN is_available = false THEN 1 END) as no_disponibles,
    COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as con_stock,
    COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as sin_stock
FROM public.products;

-- Mostrar algunos productos de ejemplo
SELECT 
    name,
    stock_quantity,
    is_available,
    price,
    CASE 
        WHEN stock_quantity = 0 THEN 'Agotado'
        WHEN is_available = false THEN 'No disponible'
        WHEN stock_quantity <= 3 THEN 'Últimas unidades'
        WHEN stock_quantity <= 5 THEN 'Stock bajo'
        ELSE 'Disponible'
    END as estado
FROM public.products 
ORDER BY created_at DESC 
LIMIT 10;
