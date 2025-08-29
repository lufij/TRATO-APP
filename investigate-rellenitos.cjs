const { createClient } = require('@supabase/supabase-js');

// Usar las variables directamente desde el .env.local
const supabase = createClient(
  'https://ymkdqgkqbtbcixsmcdtb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlta2RxZ2txYnRiY2l4c21jZHRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUxNTcwMzgsImV4cCI6MjA1MDczMzAzOH0.L8v-VEI8VyVtEzR1FQX3J0hQNfkj1RKuV1OzGKsXtk8'
);

async function investigateStockProblem() {
  console.log('🔍 INVESTIGANDO PROBLEMA DE STOCK DE RELLENITOS');
  console.log('=' .repeat(60));

  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Fecha de hoy: ${today}`);

    // 1. Buscar órdenes con rellenitos de hoy
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        created_at,
        order_items (
          id,
          product_id,
          product_name,
          quantity,
          product_type
        )
      `)
      .gte('created_at', `${today}T00:00:00`);

    if (ordersError) {
      console.error('❌ Error órdenes:', ordersError);
      return;
    }

    console.log(`\n📦 Total órdenes hoy: ${orders.length}`);

    // Filtrar órdenes con rellenitos
    const rellenitoOrders = [];
    orders.forEach(order => {
      const rellenitoItems = order.order_items?.filter(item => 
        item.product_name?.toLowerCase().includes('rellenito')
      ) || [];
      
      if (rellenitoItems.length > 0) {
        rellenitoOrders.push({
          ...order,
          rellenitoItems
        });
      }
    });

    console.log(`🥐 Órdenes con rellenitos: ${rellenitoOrders.length}`);

    if (rellenitoOrders.length > 0) {
      console.log('\n📋 DETALLES DE ÓRDENES CON RELLENITOS:');
      rellenitoOrders.forEach((order, index) => {
        console.log(`\n${index + 1}. Orden ID: ${order.id}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Hora: ${new Date(order.created_at).toLocaleTimeString()}`);
        
        order.rellenitoItems.forEach(item => {
          console.log(`   📦 ${item.product_name}: ${item.quantity} unidades`);
          console.log(`      ID: ${item.product_id} | Tipo: ${item.product_type}`);
        });
      });

      // 2. Verificar stock actual
      console.log('\n\n📊 STOCK ACTUAL DE RELLENITOS:');
      
      // Productos del día
      const { data: dailyProducts } = await supabase
        .from('daily_products')
        .select('*')
        .ilike('name', '%rellenito%');

      console.log(`\n🌅 Productos del día (${dailyProducts?.length || 0}):`);
      dailyProducts?.forEach(product => {
        console.log(`   - ${product.name}: ${product.stock} disponible (ID: ${product.id})`);
      });

      // Productos normales
      const { data: normalProducts } = await supabase
        .from('products')
        .select('*')
        .ilike('name', '%rellenito%');

      console.log(`\n🏪 Productos normales (${normalProducts?.length || 0}):`);
      normalProducts?.forEach(product => {
        console.log(`   - ${product.name}: ${product.stock} disponible (ID: ${product.id})`);
      });

      // 3. Análisis del problema
      console.log('\n\n🔍 ANÁLISIS DEL PROBLEMA:');
      
      const acceptedOrders = rellenitoOrders.filter(order => 
        ['accepted', 'ready', 'in_transit', 'delivered', 'completed'].includes(order.status)
      );

      console.log(`✅ Órdenes aceptadas que deberían haber descontado stock: ${acceptedOrders.length}`);
      
      if (acceptedOrders.length > 0) {
        console.log('\n⚠️  PROBLEMAS DETECTADOS:');
        
        acceptedOrders.forEach(order => {
          console.log(`\n🔸 Orden ${order.id} (Status: ${order.status}):`);
          
          order.rellenitoItems.forEach(item => {
            console.log(`   - Pidió: ${item.quantity} ${item.product_name}`);
            console.log(`     Product ID: ${item.product_id} | Tipo: ${item.product_type}`);
            
            // Verificar si el producto existe
            const allProducts = [...(dailyProducts || []), ...(normalProducts || [])];
            const productExists = allProducts.find(p => p.id === item.product_id);
            
            if (productExists) {
              console.log(`     ✅ Producto encontrado: ${productExists.stock} en stock`);
              if (productExists.stock >= item.quantity) {
                console.log(`     ⚠️  PROBLEMA: Stock NO fue descontado automáticamente`);
              }
            } else {
              console.log(`     ❌ PROBLEMA CRÍTICO: Producto no existe en base de datos`);
            }
          });
        });
      }

      // 4. Verificar configuración
      console.log('\n\n⚙️  PASOS PARA SOLUCIONAR:');
      console.log('1. Verificar que SellerOrderManagement.tsx llame stockManager');
      console.log('2. Verificar que los product_id coincidan entre order_items y productos');
      console.log('3. Verificar que el status change dispare el descuento');
      console.log('4. Verificar eventos de actualización en tiempo real');
    
    } else {
      console.log('\n✅ No se encontraron órdenes con rellenitos hoy');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

investigateStockProblem();
