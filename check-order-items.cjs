const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://deadlytelokolahufed.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRseXRlbG9rb2xhaHVmZWQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNDU0MDk3NSwiZXhwIjoyMDUwMTE2OTc1fQ.YgKw3kx1gLtInxRdRjPfnXsNPWOV9S0hUWYjd-PY8O4'
);

async function checkOrderItems() {
  console.log('🔍 Verificando items de órdenes recientes...');
  
  const { data: recentOrders, error: ordersError } = await supabase
    .from('orders')
    .select('id, status, total_amount, created_at')
    .order('created_at', { ascending: false })
    .limit(3);
    
  if (ordersError) {
    console.error('❌ Error órdenes:', ordersError);
    return;
  }
  
  for (const order of recentOrders) {
    console.log(`\n📋 Orden ${order.id} (${order.status}) - Q${order.total_amount}`);
    
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);
      
    if (itemsError) {
      console.error('  ❌ Error items:', itemsError);
    } else {
      items.forEach(item => {
        console.log(`  📦 ${item.product_name}: ${item.quantity}x - Tipo: ${item.product_type || 'no definido'}`);
        console.log(`      Product ID: ${item.product_id}, Daily Product ID: ${item.daily_product_id}`);
      });
    }
  }
  
  // Verificar stock actual de Rellenitos
  console.log('\n🔍 Stock actual de Rellenitos de Frijol:');
  const { data: dailyProduct, error: dailyError } = await supabase
    .from('daily_products')
    .select('id, name, stock_quantity, expires_at')
    .eq('name', 'Rellenitos de Frijol')
    .single();
    
  if (dailyError) {
    console.error('❌ Error:', dailyError);
  } else {
    console.log('📦 Stock:', dailyProduct);
  }
}

checkOrderItems();
