// Script para ejecutar en la consola del navegador
// Copiar y pegar en las DevTools de Chrome

console.log('🔍 DEPURANDO ORDER ITEMS DESDE EL NAVEGADOR');
console.log('=============================================');

async function debugFromBrowser() {
  try {
    // Verificar si supabase está disponible
    if (typeof window.supabase === 'undefined') {
      console.error('❌ Supabase no está disponible. Asegúrate de estar en la aplicación.');
      return;
    }
    
    const { supabase } = window;
    
    // 1. Buscar órdenes recientes
    console.log('\n1️⃣ Buscando órdenes recientes...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, created_at, customer_name')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (ordersError) {
      console.error('❌ Error buscando órdenes:', ordersError);
      return;
    }
    
    console.log(`📋 Encontradas ${orders?.length || 0} órdenes recientes:`, orders);
    
    for (const order of orders || []) {
      console.log(`\n🔍 === ORDEN ${order.id} (${order.status}) ===`);
      
      // 2. Obtener items de cada orden
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
      
      if (itemsError) {
        console.error(`❌ Error obteniendo items:`, itemsError);
        continue;
      }
      
      console.log(`📦 Items en la orden:`, items?.length || 0);
      
      for (const item of items || []) {
        console.log(`\n   📋 ITEM: "${item.product_name}"`);
        console.log(`   🆔 product_id: ${item.product_id}`);
        console.log(`   🆔 daily_product_id: ${item.daily_product_id}`);
        console.log(`   📊 quantity: ${item.quantity}`);
        console.log(`   🏷️ product_type: ${item.product_type}`);
        
        // Verificar existencia en tablas
        if (item.product_id) {
          const { data: regularProduct } = await supabase
            .from('products')
            .select('id, name, stock_quantity')
            .eq('id', item.product_id)
            .single();
          
          if (regularProduct) {
            console.log(`   ✅ products: ${regularProduct.name} (stock: ${regularProduct.stock_quantity})`);
          } else {
            console.log(`   ❌ NO encontrado en products`);
          }
        }
        
        if (item.daily_product_id) {
          const { data: dailyProduct } = await supabase
            .from('daily_products')
            .select('id, name, stock_quantity')
            .eq('id', item.daily_product_id)
            .single();
          
          if (dailyProduct) {
            console.log(`   ✅ daily_products: ${dailyProduct.name} (stock: ${dailyProduct.stock_quantity})`);
          } else {
            console.log(`   ❌ NO encontrado en daily_products`);
          }
        }
        
        // Buscar por nombre si es producto del día
        if (item.product_type === 'daily' && item.product_name) {
          const { data: dailyByName } = await supabase
            .from('daily_products')
            .select('id, name, stock_quantity, expires_at')
            .eq('name', item.product_name)
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });
          
          console.log(`   🔍 Búsqueda por nombre "${item.product_name}":`, dailyByName?.length || 0, 'resultados');
          if (dailyByName && dailyByName.length > 0) {
            dailyByName.forEach((prod, idx) => {
              console.log(`      ${idx + 1}. ID: ${prod.id}, Stock: ${prod.stock_quantity}`);
            });
          }
        }
      }
    }
    
    // 3. Mostrar productos del día actuales
    console.log('\n🔥 PRODUCTOS DEL DÍA ACTUALES:');
    const { data: currentDaily } = await supabase
      .from('daily_products')
      .select('id, name, stock_quantity, expires_at')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    if (currentDaily && currentDaily.length > 0) {
      currentDaily.forEach(prod => {
        console.log(`   📦 ${prod.name}: ID=${prod.id}, Stock=${prod.stock_quantity}`);
      });
    } else {
      console.log('   ❌ No hay productos del día activos');
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

// Ejecutar automáticamente
debugFromBrowser();
