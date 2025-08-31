/**
 * 🔍 DIAGNÓSTICO CRÍTICO: ¿Por qué NO se descuenta el stock?
 * 
 * Vamos a analizar EXACTAMENTE qué está pasando cuando aceptas una orden
 */

// Usar dynamic import para ES modules
async function loadSupabase() {
  const { supabase } = await import('./utils/supabase/client.js');
  return supabase;
}

async function diagnosticoCritico() {
  console.log('🚨 DIAGNÓSTICO CRÍTICO - STOCK NO SE DESCUENTA');
  console.log('='.repeat(60));

  try {
    const supabase = await loadSupabase();

    // 1. Ver orden más reciente
    console.log('\n1️⃣ ÚLTIMA ORDEN CREADA:');
    
    const { data: lastOrder, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (orderError) {
      console.error('❌ Error obteniendo última orden:', orderError);
      return;
    }

    console.log(`📦 Orden: ${lastOrder.id}`);
    console.log(`   Estado: ${lastOrder.status}`);
    console.log(`   Creada: ${lastOrder.created_at}`);
    console.log(`   Aceptada: ${lastOrder.accepted_at || 'No aceptada'}`);

    // 2. Ver items de esa orden
    console.log('\n2️⃣ ITEMS DE LA ÚLTIMA ORDEN:');
    
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', lastOrder.id);

    if (itemsError) {
      console.error('❌ Error obteniendo items:', itemsError);
      return;
    }

    console.log(`📋 ${orderItems.length} items encontrados:`);
    orderItems.forEach((item, index) => {
      console.log(`\n   ${index + 1}. ${item.product_name}`);
      console.log(`      - product_id: ${item.product_id}`);
      console.log(`      - daily_product_id: ${item.daily_product_id || 'NULL'}`);
      console.log(`      - quantity: ${item.quantity}`);
      console.log(`      - product_type: ${item.product_type || 'NULL'}`);
    });

    // 3. Verificar productos del día
    console.log('\n3️⃣ PRODUCTOS DEL DÍA EN LA BASE DE DATOS:');
    
    const { data: dailyProducts, error: dailyError } = await supabase
      .from('daily_products')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .order('stock_quantity', { ascending: false });

    if (dailyError) {
      console.error('❌ Error obteniendo productos del día:', dailyError);
      return;
    }

    console.log(`🎯 ${dailyProducts.length} productos del día encontrados:`);
    dailyProducts.forEach((product, index) => {
      console.log(`\n   ${index + 1}. ${product.name}`);
      console.log(`      - ID: ${product.id}`);
      console.log(`      - Stock: ${product.stock_quantity}`);
      console.log(`      - Disponible: ${product.is_available}`);
      console.log(`      - Expira: ${product.expires_at}`);
    });

    // 4. ANÁLISIS CRÍTICO: ¿Coinciden los IDs?
    console.log('\n4️⃣ ANÁLISIS CRÍTICO - COINCIDENCIA DE IDs:');
    
    for (const item of orderItems) {
      console.log(`\n🔍 Analizando: ${item.product_name}`);
      
      // Buscar en daily_products por product_id
      const productById = dailyProducts.find(p => p.id === item.product_id);
      if (productById) {
        console.log(`   ✅ Encontrado por product_id: ${productById.name} (Stock: ${productById.stock_quantity})`);
      } else {
        console.log(`   ❌ NO encontrado por product_id en daily_products`);
      }

      // Buscar en daily_products por daily_product_id
      if (item.daily_product_id) {
        const productByDailyId = dailyProducts.find(p => p.id === item.daily_product_id);
        if (productByDailyId) {
          console.log(`   ✅ Encontrado por daily_product_id: ${productByDailyId.name} (Stock: ${productByDailyId.stock_quantity})`);
        } else {
          console.log(`   ❌ NO encontrado por daily_product_id en daily_products`);
        }
      }

      // Buscar en daily_products por nombre
      const productByName = dailyProducts.find(p => 
        p.name.toLowerCase().includes(item.product_name.toLowerCase()) ||
        item.product_name.toLowerCase().includes(p.name.toLowerCase())
      );
      if (productByName) {
        console.log(`   ✅ Encontrado por nombre: ${productByName.name} (Stock: ${productByName.stock_quantity})`);
      } else {
        console.log(`   ❌ NO encontrado por nombre en daily_products`);
      }
    }

    // 5. SIMULAR LO QUE HACE EL STOCKMANAGER
    console.log('\n5️⃣ SIMULANDO STOCKMANAGER:');
    
    for (const item of orderItems) {
      console.log(`\n🧪 Simulando para: ${item.product_name}`);
      
      const isDaily = item.product_type === 'daily' || !!item.daily_product_id;
      const tableName = isDaily ? 'daily_products' : 'products';
      const productId = isDaily && item.daily_product_id ? item.daily_product_id : item.product_id;
      
      console.log(`   - isDaily: ${isDaily}`);
      console.log(`   - tableName: ${tableName}`);
      console.log(`   - productId: ${productId}`);
      
      // Intentar obtener el producto
      const { data: currentProduct, error: fetchError } = await supabase
        .from(tableName)
        .select('id, name, stock_quantity, is_available')
        .eq('id', productId)
        .single();

      if (fetchError) {
        console.log(`   ❌ Error buscando producto: ${fetchError.message}`);
        
        // Intentar buscar por nombre
        const { data: productsByName, error: nameSearchError } = await supabase
          .from(tableName)
          .select('id, name, stock_quantity, is_available')
          .eq('name', item.product_name)
          .single();

        if (nameSearchError) {
          console.log(`   ❌ Error buscando por nombre: ${nameSearchError.message}`);
        } else if (productsByName) {
          console.log(`   ✅ Encontrado por nombre: ${productsByName.name} (Stock: ${productsByName.stock_quantity})`);
        }
      } else if (currentProduct) {
        console.log(`   ✅ Encontrado por ID: ${currentProduct.name} (Stock: ${currentProduct.stock_quantity})`);
      }
    }

    console.log('\n6️⃣ DIAGNÓSTICO COMPLETADO');
    console.log('🔧 Revisa los logs arriba para identificar el problema específico');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Auto-ejecutar
diagnosticoCritico();
