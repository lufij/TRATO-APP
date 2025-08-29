const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://deadlytelokolahufed.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRseXRlbG9rb2xhaHVmZWQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNDU0MDk3NSwiZXhwIjoyMDUwMTE2OTc1fQ.YgKw3kx1gLtInxRdRjPfnXsNPWOV9S0hUWYjd-PY8O4'
);

async function investigateStockProblem() {
  try {
    console.log('🔍 INVESTIGANDO PROBLEMA DE STOCK');
    console.log('==================================');
    
    // 1. Stock actual de Rellenitos
    console.log('\n1. Stock actual de Rellenitos de Frijol:');
    const { data: dailyProduct, error: dailyError } = await supabase
      .from('daily_products')
      .select('*')
      .eq('name', 'Rellenitos de Frijol')
      .single();
      
    if (dailyError) {
      console.error('Error:', dailyError.message);
      return;
    }
    
    console.log('  📦 Stock:', dailyProduct.stock_quantity);
    console.log('  🆔 ID:', dailyProduct.id);
    
    // 2. Últimas 3 órdenes entregadas
    console.log('\n2. Últimas órdenes entregadas:');
    const { data: orders } = await supabase
      .from('orders')
      .select('id, status, updated_at')
      .eq('status', 'delivered')
      .order('updated_at', { ascending: false })
      .limit(3);
      
    for (const order of orders || []) {
      console.log(`\n  📋 Orden ${order.id} (${order.status})`);
      
      // Items de cada orden
      const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
        
      items?.forEach(item => {
        console.log(`    📦 ${item.product_name}: ${item.quantity}x`);
        console.log(`       Product ID: ${item.product_id || 'null'}`);
        console.log(`       Daily Product ID: ${item.daily_product_id || 'null'}`);
        console.log(`       Product Type: ${item.product_type || 'null'}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

investigateStockProblem();
