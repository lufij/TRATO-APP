const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://deadlytelokolahufed.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRseXRlbG9rb2xhaHVmZWQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNDU0MDk3NSwiZXhwIjoyMDUwMTE2OTc1fQ.YgKw3kx1gLtInxRdRjPfnXsNPWOV9S0hUWYjd-PY8O4'
);

async function debugStockUpdateIssue() {
  console.log('🔍 DEBUGGING: ¿Por qué no se actualiza el stock?');
  console.log('===============================================');
  
  try {
    // 1. Verificar la última orden entregada
    console.log('\n1️⃣ Últimas órdenes entregadas:');
    const { data: deliveredOrders, error: orderError } = await supabase
      .from('orders')
      .select('id, status, created_at, updated_at')
      .eq('status', 'delivered')
      .order('updated_at', { ascending: false })
      .limit(3);
      
    if (orderError) {
      console.error('❌ Error órdenes:', orderError.message);
      return;
    }
    
    if (!deliveredOrders || deliveredOrders.length === 0) {
      console.log('⚠️ No hay órdenes entregadas');
      return;
    }
    
    const lastOrder = deliveredOrders[0];
    console.log(`📋 Última orden entregada: ${lastOrder.id}`);
    console.log(`   Entregada: ${lastOrder.updated_at}`);
    
    // 2. Verificar los items de esa orden
    console.log('\n2️⃣ Items de la última orden:');
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id, daily_product_id, quantity, product_name, product_type')
      .eq('order_id', lastOrder.id);
      
    if (itemsError) {
      console.error('❌ Error items:', itemsError.message);
      return;
    }
    
    console.log('📦 Items encontrados:');
    orderItems?.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.product_name}: ${item.quantity}x`);
      console.log(`      Product ID: ${item.product_id || 'null'}`);
      console.log(`      Daily Product ID: ${item.daily_product_id || 'null'}`);
      console.log(`      Product Type: ${item.product_type || 'null'}`);
    });
    
    // 3. Para cada item de Rellenitos, verificar el producto
    const rellenitosItems = orderItems?.filter(item => 
      item.product_name?.includes('Rellenitos')
    );
    
    if (rellenitosItems && rellenitosItems.length > 0) {
      console.log('\n3️⃣ Verificando productos de Rellenitos:');
      
      for (const item of rellenitosItems) {
        const isDaily = item.product_type === 'daily';
        const productId = isDaily && item.daily_product_id ? item.daily_product_id : item.product_id;
        const tableName = isDaily ? 'daily_products' : 'products';
        
        console.log(`\n   Buscando en tabla: ${tableName}`);
        console.log(`   ID a buscar: ${productId}`);
        
        const { data: product, error: productError } = await supabase
          .from(tableName)
          .select('id, name, stock_quantity, expires_at')
          .eq('id', productId)
          .single();
          
        if (productError) {
          console.error(`   ❌ Error buscando producto:`, productError.message);
          
          // Si no lo encuentra por ID, buscar por nombre
          if (item.product_name) {
            console.log(`   🔍 Buscando por nombre: ${item.product_name}`);
            const { data: byName, error: nameError } = await supabase
              .from(tableName)
              .select('id, name, stock_quantity, expires_at, created_at')
              .eq('name', item.product_name)
              .order('created_at', { ascending: false });
              
            if (nameError) {
              console.error(`   ❌ Error buscando por nombre:`, nameError.message);
            } else {
              console.log(`   📦 Productos encontrados por nombre:`, byName?.length || 0);
              byName?.forEach(p => {
                console.log(`      - ID: ${p.id}, Stock: ${p.stock_quantity}`);
              });
            }
          }
        } else {
          console.log(`   ✅ Producto encontrado:`);
          console.log(`      ID: ${product.id}`);
          console.log(`      Nombre: ${product.name}`);
          console.log(`      Stock: ${product.stock_quantity}`);
          if (product.expires_at) {
            console.log(`      Expira: ${product.expires_at}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Error inesperado:', error.message);
  }
}

debugStockUpdateIssue();
