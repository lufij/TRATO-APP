-- =====================================================
-- 🔧 FIX CÓDIGO TYPESCRIPT: BuyerCheckout.tsx
-- =====================================================

-- UBICACIÓN DEL PROBLEMA:
-- Archivo: components/buyer/BuyerCheckout.tsx
-- Línea: ~390
-- Función: Creación de orderItems

-- CÓDIGO ACTUAL (PROBLEMÁTICO):
/* 
const orderItems = cartItems.map((item: any) => ({
  order_id: order.id,
  product_id: item.product_id,
  product_name: item.product?.name || item.product_name || 'Producto',
  product_image: item.product?.image_url || item.product_image || null,
  price: Number((item.product?.price || item.product_price || 0).toFixed(2)),
  price_per_unit: Number((item.product?.price || item.product_price || 0).toFixed(2)), 
  quantity: Number(item.quantity),
  total_price: Number(((item.product?.price || item.product_price || 0) * item.quantity).toFixed(2)),
  notes: null
  // ❌ FALTA: product_type
}));
*/

-- CÓDIGO CORREGIDO (SOLUCIÓN):
/* 
const orderItems = cartItems.map((item: any) => ({
  order_id: order.id,
  product_id: item.product_id,
  product_name: item.product?.name || item.product_name || 'Producto',
  product_image: item.product?.image_url || item.product_image || null,
  price: Number((item.product?.price || item.product_price || 0).toFixed(2)),
  price_per_unit: Number((item.product?.price || item.product_price || 0).toFixed(2)), 
  quantity: Number(item.quantity),
  total_price: Number(((item.product?.price || item.product_price || 0) * item.quantity).toFixed(2)),
  product_type: item.product_type || 'regular', // ✅ AGREGAR ESTA LÍNEA
  notes: null
}));
*/

-- TAMBIEN VERIFICAR EN:
-- 1. src/components/Buyer/FixedBuyerCheckout.tsx (si existe)
-- 2. Cualquier otro archivo de checkout
-- 3. OrderContext.tsx (si maneja creación de órdenes)

-- PASOS PARA APLICAR EL FIX:
-- 1. Ejecutar el SQL de arriba para corregir datos existentes
-- 2. Actualizar el código TypeScript en BuyerCheckout.tsx  
-- 3. Probar con un producto del día nuevo
-- 4. Verificar que product_type='daily' se guarde correctamente
