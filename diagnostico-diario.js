/**
 * 🔍 DIAGNÓSTICO: Estado actual de productos del día y órdenes
 */

// Usar dynamic import para ES modules
async function loadSupabase() {
  const { supabase } = await import('./utils/supabase/client.js');
  return supabase;
}

async function diagnosticoDiario() {
  console.log('🔍 DIAGNÓSTICO COMPLETO - PRODUCTOS DEL DÍA');
  console.log('='.repeat(50));

  try {
    const supabase = await loadSupabase();
    const today = new Date().toISOString().split('T')[0];

    // 1. Productos del día disponibles hoy
    console.log('\n1️⃣ PRODUCTOS DEL DÍA DISPONIBLES HOY:');
    
    const { data: dailyProducts, error: dailyError } = await supabase
      .from('daily_products')
      .select('id, name, stock_quantity, expires_at, seller_id')
      .gte('expires_at', new Date().toISOString())
      .order('stock_quantity', { ascending: false });

    if (dailyError) {
      console.error('❌ Error:', dailyError);
    } else if (dailyProducts && dailyProducts.length > 0) {
      dailyProducts.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name}`);
        console.log(`      Stock: ${product.stock_quantity}`);
        console.log(`      Expira: ${new Date(product.expires_at).toLocaleString()}`);
        console.log(`      Seller: ${product.seller_id}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️ No hay productos del día disponibles');
    }

    // 2. Órdenes de hoy con productos del día
    console.log('\n2️⃣ ÓRDENES DE HOY CON PRODUCTOS DEL DÍA:');
    
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        created_at,
        accepted_at,
        total,
        order_items!inner (
          id,
          product_id,
          daily_product_id,
          product_name,
          quantity,
          product_type
        )
      `)
      .gte('created_at', `${today}T00:00:00`)
      .eq('order_items.product_type', 'daily')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('❌ Error:', ordersError);
    } else if (orders && orders.length > 0) {
      console.log(`   📦 ${orders.length} órdenes encontradas:`);
      orders.forEach((order, index) => {
        console.log(`\n   ${index + 1}. Orden ${order.id.slice(0, 8)}...`);
        console.log(`      Estado: ${order.status}`);
        console.log(`      Creada: ${new Date(order.created_at).toLocaleString()}`);
        if (order.accepted_at) {
          console.log(`      Aceptada: ${new Date(order.accepted_at).toLocaleString()}`);
        }
        console.log(`      Total: Q${order.total}`);
        console.log(`      Items del día:`);
        
        order.order_items.forEach(item => {
          console.log(`         - ${item.quantity}x ${item.product_name}`);
          console.log(`           Product ID: ${item.product_id}`);
          console.log(`           Daily Product ID: ${item.daily_product_id}`);
        });
      });
    } else {
      console.log('   ℹ️ No hay órdenes de hoy con productos del día');
    }

    console.log('\n✅ Diagnóstico completado');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Auto-ejecutar
diagnosticoDiario();
