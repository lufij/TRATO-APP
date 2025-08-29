// SOLUCIÓN AL PROBLEMA DE STOCK DE RELLENITOS
// =============================================
//
// El problema que describes indica que:
// 1. Hay una orden de 10 rellenitos en order_items
// 2. El stock no se ha descontado de los productos del vendedor
// 3. El stock tampoco se ha actualizado en la pantalla del comprador
//
// POSIBLES CAUSAS Y SOLUCIONES:

console.log('🔍 DIAGNÓSTICO DEL PROBLEMA DE STOCK - RELLENITOS DE MANJAR');
console.log('=' .repeat(70));

console.log(`
📋 PROBLEMA REPORTADO:
- Orden de 10 rellenitos de manjar creada hoy
- order_items tiene quantity = 10  
- Stock NO se descuenta de productos del vendedor
- Stock NO se actualiza en pantalla del comprador

🎯 FLUJO ESPERADO:
1. Comprador hace pedido → Se crea orden con status 'pending'
2. Vendedor presiona "Aceptar" → Status cambia a 'accepted'
3. stockManager se ejecuta automáticamente
4. Stock se descuenta de daily_products/products
5. Frontend se actualiza en tiempo real

🔍 POSIBLES CAUSAS:

CAUSA 1: product_id o daily_product_id incorrectos
- Verificar que el ID en order_items coincida con el ID real del producto
- Verificar que product_type esté correctamente definido

CAUSA 2: El vendedor NO ha presionado "Aceptar"
- El stock solo se descuenta cuando status cambia a 'accepted'
- Verificar el status actual de la orden

CAUSA 3: Error en el stockManager
- Verificar logs de consola en el navegador
- Verificar que updateProductStock() se ejecute correctamente

CAUSA 4: Producto no encontrado en la base de datos
- El producto podría haber sido eliminado
- El ID podría no coincidir

🛠️  PASOS PARA SOLUCIONAR:

1. VERIFICAR DATOS EN SUPABASE:
   - Ir a tabla 'orders' → buscar orden de hoy
   - Ir a tabla 'order_items' → verificar product_id y quantity
   - Ir a tabla 'daily_products' → verificar que existe producto con ese ID
   - Verificar que product_type sea 'daily' o 'regular'

2. VERIFICAR STATUS DE LA ORDEN:
   - Si status = 'pending' → Vendedor debe presionar "Aceptar"
   - Si status = 'accepted' → Ya debería haberse descontado

3. VERIFICAR EN EL NAVEGADOR:
   - Abrir DevTools (F12)
   - Ir a pestaña Console
   - Cuando vendedor presiona "Aceptar", debe aparecer:
     "🛒 Orden aceptada, descontando stock automáticamente..."
     "✅ Stock descontado exitosamente"

4. VERIFICAR COINCIDENCIA DE IDs:
   SQL para verificar:
   
   SELECT 
     oi.order_id,
     oi.product_id,
     oi.daily_product_id,  
     oi.product_name,
     oi.quantity,
     oi.product_type,
     dp.id as daily_id,
     dp.name as daily_name,
     dp.stock_quantity as daily_stock,
     p.id as regular_id,
     p.name as regular_name,
     p.stock_quantity as regular_stock
   FROM order_items oi
   LEFT JOIN daily_products dp ON (
     (oi.product_type = 'daily' AND oi.daily_product_id = dp.id) OR
     (oi.product_type = 'daily' AND oi.product_id = dp.id)
   )
   LEFT JOIN products p ON (
     (oi.product_type = 'regular' AND oi.product_id = p.id) OR
     (oi.product_type IS NULL AND oi.product_id = p.id)
   )
   WHERE oi.product_name ILIKE '%rellenito%'
   AND oi.created_at >= CURRENT_DATE;

5. FORZAR ACTUALIZACIÓN MANUAL:
   Si el vendedor ya aceptó la orden pero no se descontó:
   
   a) Encontrar el ID de la orden
   b) Ejecutar manualmente en consola del navegador:
   
   // Simular actualización de stock
   const orderId = 'YOUR_ORDER_ID_HERE';
   const orderItems = [
     {
       product_id: 'PRODUCT_ID_HERE',
       quantity: 10,
       product_name: 'Rellenitos de Manjar',
       product_type: 'daily' // o 'regular'
     }
   ];
   
   import { updateProductStock } from '../utils/stockManager';
   const result = await updateProductStock(orderItems, orderId);
   console.log('Resultado:', result);

6. VERIFICAR CONFIGURACIÓN DEL PRODUCTO:
   - is_available debe ser true
   - stock_quantity debe ser >= 10
   - expires_at debe ser futura (para productos del día)

💡 IDENTIFICACIÓN RÁPIDA:
Para identificar rápidamente el problema, ejecuta este SQL:

SELECT 
  o.id as order_id,
  o.status,
  o.created_at,
  oi.product_id,
  oi.product_name,
  oi.quantity
FROM orders o
JOIN order_items oi ON o.id = oi.order_id  
WHERE oi.product_name ILIKE '%rellenito%'
AND o.created_at >= CURRENT_DATE
ORDER BY o.created_at DESC;

📞 SIGUIENTE PASO:
Comparte el resultado de este SQL y el status de la orden para diagnosticar exactamente qué está pasando.
`);

console.log('\n✅ Diagnóstico completado - Ejecuta los pasos sugeridos');
