const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://deadlytelokolahufed.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRseXRlbG9rb2xhaHVmZWQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNDU0MDk3NSwiZXhwIjoyMDUwMTE2OTc1fQ.YgKw3kx1gLtInxRdRjPfnXsNPWOV9S0hUWYjd-PY8O4'
);

async function debugDuplicateProducts() {
  console.log('🔍 INVESTIGANDO REGISTROS DUPLICADOS');
  console.log('====================================');
  
  try {
    // 1. Buscar TODOS los Rellenitos de Frijol
    console.log('\n1️⃣ Todos los registros de Rellenitos de Frijol:');
    const { data: allRellenitos, error: searchError } = await supabase
      .from('daily_products')
      .select('id, name, stock_quantity, expires_at, created_at')
      .eq('name', 'Rellenitos de Frijol')
      .order('created_at', { ascending: false });
      
    if (searchError) {
      console.error('❌ Error:', searchError.message);
      return;
    }
    
    allRellenitos?.forEach((producto, index) => {
      const isExpired = new Date(producto.expires_at) < new Date();
      console.log(`\n   ${index + 1}. ID: ${producto.id}`);
      console.log(`      Stock: ${producto.stock_quantity}`);
      console.log(`      Expira: ${producto.expires_at}`);
      console.log(`      Creado: ${producto.created_at}`);
      console.log(`      Estado: ${isExpired ? '🔴 EXPIRADO' : '🟢 DISPONIBLE'}`);
    });
    
    // 2. Verificar cuál ID se está usando en el carrito
    console.log('\n2️⃣ Verificando items del carrito recientes:');
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select('product_id, product_type, created_at')
      .eq('product_type', 'daily')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (cartError) {
      console.error('❌ Error carrito:', cartError.message);
    } else {
      cartItems?.forEach(item => {
        console.log(`   📦 Product ID en carrito: ${item.product_id}`);
        console.log(`      Tipo: ${item.product_type}, Creado: ${item.created_at}`);
      });
    }
    
    // 3. Verificar órdenes recientes y sus items
    console.log('\n3️⃣ Verificando order_items recientes:');
    const { data: recentOrders, error: orderError } = await supabase
      .from('orders')
      .select('id, created_at')
      .order('created_at', { ascending: false })
      .limit(3);
      
    if (orderError) {
      console.error('❌ Error órdenes:', orderError.message);
    } else {
      for (const order of recentOrders || []) {
        console.log(`\n   📋 Orden ${order.id}:`);
        
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('product_id, daily_product_id, product_name, product_type')
          .eq('order_id', order.id);
          
        if (itemsError) {
          console.error(`     ❌ Error items:`, itemsError.message);
        } else {
          items?.forEach(item => {
            if (item.product_name?.includes('Rellenitos')) {
              console.log(`     📦 ${item.product_name}:`);
              console.log(`        Product ID: ${item.product_id || 'null'}`);
              console.log(`        Daily Product ID: ${item.daily_product_id || 'null'}`);
              console.log(`        Product Type: ${item.product_type}`);
            }
          });
        }
      }
    }
    
    // 4. Recomendación
    console.log('\n4️⃣ RECOMENDACIÓN:');
    if (allRellenitos && allRellenitos.length > 1) {
      const disponible = allRellenitos.find(p => new Date(p.expires_at) > new Date());
      const expirado = allRellenitos.find(p => new Date(p.expires_at) < new Date());
      
      if (disponible && expirado) {
        console.log('🔧 PROBLEMA DETECTADO: Hay registros duplicados');
        console.log(`   ✅ Usar SOLO este ID: ${disponible.id} (disponible)`);
        console.log(`   ❌ Eliminar este ID: ${expirado.id} (expirado)`);
        console.log('\n💡 SOLUCIÓN: Eliminar el registro expirado para evitar confusión');
      }
    }
    
  } catch (error) {
    console.error('💥 Error inesperado:', error.message);
  }
}

debugDuplicateProducts();
