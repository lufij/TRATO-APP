const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://vmgpynfaieswbtbmsrpk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZ3B5bmZhaWVzd2J0Ym1zcnBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg4NzQzNzEsImV4cCI6MjA0NDQ1MDM3MX0.lWyBVmv6O6_RXDrKE8vAoF6SrKU03Dq_iYDGKwz1vr8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugOrderItems() {
  console.log('🔍 DEPURANDO ORDER ITEMS PARA PRODUCTOS DEL DÍA');
  console.log('================================================');
  
  try {
    // 1. Buscar órdenes recientes con productos del día
    console.log('\n1️⃣ Buscando órdenes recientes...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (ordersError) {
      console.error('❌ Error buscando órdenes:', ordersError);
      return;
    }
    
    console.log(`📋 Encontradas ${orders?.length || 0} órdenes recientes`);
    
    for (const order of orders || []) {
      console.log(`\n🔍 Analizando orden ${order.id} (${order.status})`);
      
      // 2. Obtener items de cada orden
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
      
      if (itemsError) {
        console.error(`❌ Error obteniendo items de orden ${order.id}:`, itemsError);
        continue;
      }
      
      console.log(`📦 Items en la orden:`, items?.length || 0);
      
      for (const item of items || []) {
        console.log(`\n   📋 Item: ${item.product_name}`);
        console.log(`   🆔 Product ID: ${item.product_id}`);
        console.log(`   🆔 Daily Product ID: ${item.daily_product_id}`);
        console.log(`   📊 Quantity: ${item.quantity}`);
        console.log(`   🏷️ Product Type: ${item.product_type}`);
        
        // 3. Verificar si existe en products o daily_products
        if (item.product_id) {
          const { data: regularProduct } = await supabase
            .from('products')
            .select('id, name, stock_quantity')
            .eq('id', item.product_id)
            .single();
          
          if (regularProduct) {
            console.log(`   ✅ Encontrado en products: ${regularProduct.name} (stock: ${regularProduct.stock_quantity})`);
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
            console.log(`   ✅ Encontrado en daily_products: ${dailyProduct.name} (stock: ${dailyProduct.stock_quantity})`);
          } else {
            console.log(`   ❌ NO encontrado en daily_products`);
          }
        }
        
        // 4. Si es producto del día, buscar por nombre también
        if (item.product_type === 'daily' && item.product_name) {
          console.log(`   🔍 Buscando productos del día por nombre: "${item.product_name}"`);
          const { data: dailyByName } = await supabase
            .from('daily_products')
            .select('id, name, stock_quantity, expires_at, created_at')
            .eq('name', item.product_name)
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });
          
          if (dailyByName && dailyByName.length > 0) {
            console.log(`   📊 Productos del día encontrados por nombre:`, dailyByName.length);
            dailyByName.forEach((prod, idx) => {
              console.log(`      ${idx + 1}. ID: ${prod.id}, Stock: ${prod.stock_quantity}, Expira: ${prod.expires_at}`);
            });
          } else {
            console.log(`   ❌ NO se encontraron productos del día por nombre`);
          }
        }
      }
    }
    
    // 5. Verificar productos del día actuales
    console.log('\n🔥 PRODUCTOS DEL DÍA ACTUALES:');
    const { data: currentDailyProducts } = await supabase
      .from('daily_products')
      .select('id, name, stock_quantity, expires_at')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    if (currentDailyProducts && currentDailyProducts.length > 0) {
      currentDailyProducts.forEach(prod => {
        console.log(`   📦 ${prod.name}: ID=${prod.id}, Stock=${prod.stock_quantity}, Expira=${prod.expires_at}`);
      });
    } else {
      console.log('   ❌ No hay productos del día activos');
    }
    
  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

debugOrderItems();
