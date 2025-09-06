// SCRIPT DE DEBUG PARA PRODUCTOS DEL DIA EN CARRITO
// ================================================
// Copiar y pegar en la consola del navegador (F12)

console.log('🛒 DEBUGGING CARRITO DE PRODUCTOS DEL DIA');

// 1. Verificar que el producto existe en daily_products
const productId = '42dd6f62-f8fe-443b-b3f7-9e16c81654c4';

console.log('📦 Verificando producto:', productId);

// 2. Verificar conexión a Supabase
if (typeof supabase === 'undefined') {
  console.error('❌ Supabase no está disponible en la consola');
  console.log('💡 Prueba esto en su lugar:');
  console.log('1. Ve a Network tab en DevTools');
  console.log('2. Intenta agregar al carrito');
  console.log('3. Busca la llamada que falla');
} else {
  // 3. Probar consulta directa a daily_products
  supabase.from('daily_products')
    .select('*')
    .eq('id', productId)
    .single()
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Error al buscar producto del día:', error);
      } else {
        console.log('✅ Producto del día encontrado:', data);
        
        // 4. Verificar los datos críticos
        console.log('📊 Verificación crítica:');
        console.log('  - is_available:', data.is_available);
        console.log('  - stock_quantity:', data.stock_quantity);
        console.log('  - expires_at:', data.expires_at);
        console.log('  - expira después de ahora:', new Date(data.expires_at) > new Date());
      }
    });

  // 5. Probar la función validate_and_get_product_data desde el frontend
  console.log('🧪 Probando función SQL desde frontend...');
  
  supabase.rpc('validate_and_get_product_data', {
    p_product_id: productId,
    p_product_type: 'daily'
  }).then(({ data, error }) => {
    if (error) {
      console.error('❌ Error en función validate_and_get_product_data:', error);
    } else {
      console.log('✅ Función validate_and_get_product_data:', data);
      if (data && data.length > 0) {
        console.log('📊 Resultado validación:', data[0]);
        console.log('  - is_valid:', data[0].is_valid);
        console.log('  - error_message:', data[0].error_message);
      }
    }
  });
}

// 6. Instrucciones para el usuario
console.log('\n📋 INSTRUCCIONES:');
console.log('1. Ejecuta este script en la consola (F12)');
console.log('2. Luego intenta agregar el producto al carrito');
console.log('3. Ve a Network tab y busca llamadas fallidas');
console.log('4. Reporta cualquier error que veas');
