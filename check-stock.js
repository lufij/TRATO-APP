import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://deadlytelokolahufed.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRseXRlbG9rb2xhaHVmZWQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNDU0MDk3NSwiZXhwIjoyMDUwMTE2OTc1fQ.YgKw3kx1gLtInxRdRjPfnXsNPWOV9S0hUWYjd-PY8O4'
);

async function checkStock() {
  console.log('🔍 Verificando stock actual de productos del día...\n');
  
  const { data, error } = await supabase
    .from('daily_products')
    .select('id, name, stock_quantity, expires_at')
    .eq('name', 'Rellenitos de Frijol')
    .single();
    
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('📦 Stock actual de Rellenitos de Frijol:');
    console.log('   - ID:', data.id);
    console.log('   - Stock:', data.stock_quantity);
    console.log('   - Expira:', data.expires_at);
    console.log('');
  }

  // También verificar órdenes recientes
  console.log('📋 Verificando órdenes recientes...');
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      id, 
      status, 
      total_amount,
      created_at,
      order_items(product_id, product_name, quantity, product_type)
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (ordersError) {
    console.error('❌ Error obteniendo órdenes:', ordersError);
  } else {
    orders.forEach(order => {
      const rellenitos = order.order_items.filter(item => 
        item.product_name.includes('Rellenitos') || item.product_name.includes('Frijol')
      );
      
      if (rellenitos.length > 0) {
        console.log(`   Orden ${order.id} (${order.status}): ${rellenitos[0].quantity} rellenitos`);
      }
    });
  }
}

checkStock().catch(console.error);
