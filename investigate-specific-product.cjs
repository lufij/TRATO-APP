const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ymkdqgkqbtbcixsmcdtb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlta2RxZ2txYnRiY2l4c21jZHRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUxNTcwMzgsImV4cCI6MjA1MDczMzAzOH0.L8v-VEI8VyVtEzR1FQX3J0hQNfkj1RKuV1OzGKsXtk8'
);

async function investigateRellenitoProduct() {
  console.log('🔍 INVESTIGANDO QUÉ PRODUCTO DE RELLENITOS EXISTE HOY');
  console.log('=' .repeat(60));

  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Investigando productos para: ${today}`);

    // 1. Buscar productos del día de rellenitos
    console.log('\n1. 🌅 PRODUCTOS DEL DÍA CON "RELLENITO":');
    const { data: dailyProducts, error: dailyError } = await supabase
      .from('daily_products')
      .select('*')
      .ilike('name', '%rellenito%')
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false });

    if (dailyError) {
      console.error('❌ Error productos del día:', dailyError);
    } else {
      console.log(`   Encontrados: ${dailyProducts?.length || 0} productos`);
      dailyProducts?.forEach((product, index) => {
        console.log(`\n   ${index + 1}. "${product.name}"`);
        console.log(`      ID: ${product.id}`);
        console.log(`      Stock: ${product.stock_quantity}`);
        console.log(`      Disponible: ${product.is_available}`);
        console.log(`      Precio: Q${product.price}`);
        console.log(`      Creado: ${new Date(product.created_at).toLocaleString()}`);
        console.log(`      Expira: ${new Date(product.expires_at).toLocaleString()}`);
        console.log(`      Seller ID: ${product.seller_id}`);
      });
    }

    // 2. Buscar productos regulares de rellenitos
    console.log('\n\n2. 🏪 PRODUCTOS REGULARES CON "RELLENITO":');
    const { data: regularProducts, error: regularError } = await supabase
      .from('products')
      .select('*')
      .ilike('name', '%rellenito%')
      .order('created_at', { ascending: false });

    if (regularError) {
      console.error('❌ Error productos regulares:', regularError);
    } else {
      console.log(`   Encontrados: ${regularProducts?.length || 0} productos`);
      regularProducts?.forEach((product, index) => {
        console.log(`\n   ${index + 1}. "${product.name}"`);
        console.log(`      ID: ${product.id}`);
        console.log(`      Stock: ${product.stock_quantity}`);
        console.log(`      Disponible: ${product.is_available}`);
        console.log(`      Precio: Q${product.price}`);
        console.log(`      Creado: ${new Date(product.created_at).toLocaleString()}`);
        console.log(`      Seller ID: ${product.seller_id}`);
      });
    }

    // 3. Verificar si hay órdenes de hoy
    console.log('\n\n3. 📋 ÓRDENES DE HOY CON RELLENITOS:');
    const { data: todayOrders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        created_at,
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
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('❌ Error órdenes:', ordersError);
    } else {
      // Filtrar órdenes que tienen rellenitos
      const rellenitoOrders = todayOrders?.filter(order => 
        order.order_items?.some(item => 
          item.product_name?.toLowerCase().includes('rellenito')
        )
      ) || [];

      console.log(`   Órdenes totales hoy: ${todayOrders?.length || 0}`);
      console.log(`   Órdenes con rellenitos: ${rellenitoOrders.length}`);

      rellenitoOrders.forEach((order, index) => {
        console.log(`\n   ${index + 1}. Orden ${order.id}`);
        console.log(`      Status: ${order.status}`);
        console.log(`      Hora: ${new Date(order.created_at).toLocaleTimeString()}`);
        
        const rellenitoItems = order.order_items.filter(item => 
          item.product_name?.toLowerCase().includes('rellenito')
        );
        
        rellenitoItems.forEach(item => {
          console.log(`      📦 ${item.product_name}: ${item.quantity} unidades`);
          console.log(`         Product ID: ${item.product_id}`);
          console.log(`         Daily Product ID: ${item.daily_product_id || 'null'}`);
          console.log(`         Tipo: ${item.product_type || 'undefined'}`);
        });
      });
    }

    // 4. Conclusión
    console.log('\n\n4. 📊 RESUMEN:');
    console.log(`✅ Productos del día encontrados: ${dailyProducts?.length || 0}`);
    console.log(`✅ Productos regulares encontrados: ${regularProducts?.length || 0}`);
    console.log(`✅ Órdenes con rellenitos hoy: ${todayOrders ? todayOrders.filter(o => o.order_items?.some(i => i.product_name?.toLowerCase().includes('rellenito'))).length : 0}`);

    console.log('\n🎯 PRODUCTO ESPECÍFICO DE RELLENITOS HOY:');
    if (dailyProducts && dailyProducts.length > 0) {
      const mainProduct = dailyProducts[0];
      console.log(`   "${mainProduct.name}" (ID: ${mainProduct.id})`);
      console.log(`   Stock actual: ${mainProduct.stock_quantity}`);
      console.log(`   ¿Es este el producto que mencionas?`);
    } else if (regularProducts && regularProducts.length > 0) {
      const mainProduct = regularProducts[0];
      console.log(`   "${mainProduct.name}" (ID: ${mainProduct.id})`);
      console.log(`   Stock actual: ${mainProduct.stock_quantity}`);
      console.log(`   ¿Es este el producto que mencionas?`);
    } else {
      console.log(`   ❌ NO se encontraron productos de rellenitos`);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

investigateRellenitoProduct();
