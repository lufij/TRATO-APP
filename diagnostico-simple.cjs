/**
 * 🔍 DIAGNÓSTICO SIMPLE - Verificar estado actual
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qzjwrsvhkpqfipsdcvsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6andyc3Zoa3BxZmlwc2RjdnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQyNzI0MDIsImV4cCI6MjA0OTg0ODQwMn0.iJ1bQ0jnbCkjwMwR5gC0w2YjPWLzNhZyPWjJoKXJE7c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticoRapido() {
  console.log('🔍 DIAGNÓSTICO RÁPIDO - PRODUCTOS DEL DÍA');
  console.log('='.repeat(50));

  try {
    // 1. Productos del día disponibles
    console.log('\n1️⃣ PRODUCTOS DEL DÍA DISPONIBLES:');
    
    const { data: dailyProducts, error: dailyError } = await supabase
      .from('daily_products')
      .select('id, name, stock_quantity, expires_at')
      .gte('expires_at', new Date().toISOString())
      .order('stock_quantity', { ascending: false })
      .limit(5);

    if (dailyError) {
      console.error('❌ Error productos del día:', dailyError.message);
    } else if (dailyProducts && dailyProducts.length > 0) {
      dailyProducts.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} - Stock: ${product.stock_quantity}`);
      });
    } else {
      console.log('   ⚠️ No hay productos del día disponibles');
    }

    // 2. Órdenes recientes con productos del día
    console.log('\n2️⃣ ÚLTIMAS ÓRDENES CON PRODUCTOS DEL DÍA:');
    
    const today = new Date().toISOString().split('T')[0];
    
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        created_at,
        order_items (
          product_name,
          quantity,
          product_type
        )
      `)
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (ordersError) {
      console.error('❌ Error órdenes:', ordersError.message);
    } else if (orders && orders.length > 0) {
      let ordersWithDaily = orders.filter(order => 
        order.order_items.some(item => item.product_type === 'daily')
      );
      
      if (ordersWithDaily.length > 0) {
        console.log(`   📦 ${ordersWithDaily.length} órdenes con productos del día:`);
        ordersWithDaily.forEach((order, index) => {
          console.log(`   ${index + 1}. ${order.id.slice(0, 8)}... - ${order.status}`);
          const dailyItems = order.order_items.filter(item => item.product_type === 'daily');
          dailyItems.forEach(item => {
            console.log(`      - ${item.quantity}x ${item.product_name}`);
          });
        });
      } else {
        console.log('   ℹ️ No hay órdenes recientes con productos del día');
      }
    } else {
      console.log('   ℹ️ No hay órdenes recientes');
    }

    console.log('\n✅ Diagnóstico completado');

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

diagnosticoRapido();
