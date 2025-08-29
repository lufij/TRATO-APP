/**
 * SCRIPT DE DEPURACIÓN ESPECÍFICO
 * ===============================
 * 
 * Para ejecutar en la consola del navegador
 * 
 * Este script va a:
 * 1. Buscar "Tostadas" en daily_products
 * 2. Verificar si hay items de Tostadas en el carrito
 * 3. Verificar órdenes recientes con Tostadas
 * 4. Simular exactamente lo que hace stockManager
 */

async function depurarTostadas() {
  console.log('🍞 DEPURACIÓN ESPECÍFICA: TOSTADAS');
  console.log('==================================');
  
  const { supabase } = window;
  
  // 1. Buscar todas las "Tostadas" en daily_products
  console.log('\n1️⃣ Buscando "Tostadas" en daily_products...');
  const { data: tostadas, error: tostadaError } = await supabase
    .from('daily_products')
    .select('*')
    .ilike('name', '%tostada%') // Búsqueda flexible
    .order('created_at', { ascending: false });
  
  if (tostadaError) {
    console.error('❌ Error:', tostadaError);
    return;
  }
  
  console.log(`📦 Encontradas ${tostadas?.length || 0} tostadas:`);
  tostadas?.forEach((tostada, idx) => {
    console.log(`   ${idx + 1}. ID: ${tostada.id}`);
    console.log(`      Nombre: ${tostada.name}`);
    console.log(`      Stock: ${tostada.stock_quantity}`);
    console.log(`      Expira: ${tostada.expires_at}`);
    console.log(`      Activo: ${new Date(tostada.expires_at) > new Date()}`);
    console.log('');
  });
  
  // 2. Buscar órdenes recientes que contengan tostadas
  console.log('\n2️⃣ Buscando órdenes con tostadas...');
  const { data: ordenesConTostadas, error: ordenError } = await supabase
    .from('order_items')
    .select('*, orders!inner(id, status, created_at)')
    .ilike('product_name', '%tostada%')
    .order('orders.created_at', { ascending: false })
    .limit(5);
  
  if (ordenError) {
    console.error('❌ Error:', ordenError);
    return;
  }
  
  console.log(`📋 Encontradas ${ordenesConTostadas?.length || 0} órdenes con tostadas:`);
  ordenesConTostadas?.forEach((item, idx) => {
    console.log(`\n   ${idx + 1}. Orden: ${item.order_id} (${item.orders.status})`);
    console.log(`      Product Name: ${item.product_name}`);
    console.log(`      Product ID: ${item.product_id}`);
    console.log(`      Daily Product ID: ${item.daily_product_id}`);
    console.log(`      Product Type: ${item.product_type}`);
    console.log(`      Quantity: ${item.quantity}`);
    console.log(`      Fecha: ${item.orders.created_at}`);
  });
  
  // 3. Para cada orden con tostadas, simular stockManager
  console.log('\n3️⃣ Simulando stockManager para cada orden...');
  
  const ordenesUnicas = [...new Set(ordenesConTostadas?.map(item => item.order_id))];
  
  for (const orderId of ordenesUnicas) {
    console.log(`\n🧪 === SIMULACIÓN ORDEN ${orderId} ===`);
    
    const itemsDeEstaOrden = ordenesConTostadas?.filter(item => item.order_id === orderId);
    
    for (const item of itemsDeEstaOrden || []) {
      if (!item.product_name.toLowerCase().includes('tostada')) continue;
      
      console.log(`\n   🔄 Procesando: ${item.product_name}`);
      console.log(`      Original data:`);
      console.log(`        product_id: ${item.product_id}`);
      console.log(`        daily_product_id: ${item.daily_product_id}`);
      console.log(`        product_type: ${item.product_type}`);
      console.log(`        quantity: ${item.quantity}`);
      
      // LÓGICA DEL STOCKMANAGER
      const isDaily = item.product_type === 'daily' || !!item.daily_product_id;
      const tableName = isDaily ? 'daily_products' : 'products';
      const productId = isDaily && item.daily_product_id ? item.daily_product_id : item.product_id;
      
      console.log(`\n      StockManager logic:`);
      console.log(`        isDaily: ${isDaily}`);
      console.log(`        tableName: ${tableName}`);
      console.log(`        productId: ${productId}`);
      
      // BÚSQUEDA POR ID
      if (productId) {
        const { data: currentProduct, error: fetchError } = await supabase
          .from(tableName)
          .select('id, name, stock_quantity, is_available')
          .eq('id', productId)
          .single();
        
        if (fetchError || !currentProduct) {
          console.log(`      ❌ NO ENCONTRADO por ID en ${tableName}:`);
          console.log(`         Error: ${fetchError?.message || 'No existe'}`);
          
          // BÚSQUEDA POR NOMBRE (FALLBACK)
          if (isDaily && item.product_name) {
            console.log(`      🔍 Intentando fallback por nombre: "${item.product_name}"`);
            
            const { data: productsByName, error: nameSearchError } = await supabase
              .from(tableName)
              .select('id, name, stock_quantity, is_available, expires_at, created_at')
              .eq('name', item.product_name)
              .gte('expires_at', new Date().toISOString())
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (!nameSearchError && productsByName && productsByName.length > 0) {
              const found = productsByName[0];
              console.log(`      ✅ ENCONTRADO por nombre:`);
              console.log(`         ID: ${found.id}`);
              console.log(`         Stock actual: ${found.stock_quantity}`);
              console.log(`         Stock después: ${found.stock_quantity - item.quantity}`);
              
              // AQUÍ DEBERÍA FUNCIONAR LA ACTUALIZACIÓN
              console.log(`      🎯 UPDATE EXITOSO ESPERADO`);
            } else {
              console.log(`      ❌ TAMPOCO encontrado por nombre:`);
              console.log(`         Error: ${nameSearchError?.message || 'No existe'}`);
              console.log(`      🚨 FALLO TOTAL - NO SE PUEDE ACTUALIZAR STOCK`);
            }
          }
        } else {
          console.log(`      ✅ ENCONTRADO por ID:`);
          console.log(`         Nombre: ${currentProduct.name}`);
          console.log(`         Stock actual: ${currentProduct.stock_quantity}`);
          console.log(`         Stock después: ${currentProduct.stock_quantity - item.quantity}`);
          console.log(`      🎯 UPDATE EXITOSO ESPERADO`);
        }
      } else {
        console.log(`      ❌ NO HAY productId válido`);
        console.log(`      🚨 FALLO - NO SE PUEDE BUSCAR PRODUCTO`);
      }
    }
  }
  
  console.log('\n🎯 DIAGNÓSTICO FINAL:');
  console.log('=====================');
  console.log('Si ves "🎯 UPDATE EXITOSO ESPERADO" = El código debería funcionar');
  console.log('Si ves "🚨 FALLO" = Ahí está el problema');
  console.log('\nSi todo se ve bien aquí, el problema está en el código de stockManager.ts');
}

// Función adicional para probar la actualización real
window.probarActualizacionReal = async function(orderId) {
  console.log(`\n🧪 PRUEBA REAL DE ACTUALIZACIÓN - Orden ${orderId}`);
  console.log('================================================');
  
  const { supabase } = window;
  
  // Obtener items de la orden
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('product_id, daily_product_id, quantity, product_name, product_type')
    .eq('order_id', orderId);
  
  for (const item of orderItems || []) {
    if (!item.product_name.toLowerCase().includes('tostada')) continue;
    
    console.log(`\n🔄 ACTUALIZANDO: ${item.product_name}`);
    
    const isDaily = item.product_type === 'daily' || !!item.daily_product_id;
    const tableName = isDaily ? 'daily_products' : 'products';
    const productId = isDaily && item.daily_product_id ? item.daily_product_id : item.product_id;
    
    // Primero buscar el producto
    let targetProduct = null;
    
    if (productId) {
      const { data: currentProduct } = await supabase
        .from(tableName)
        .select('id, name, stock_quantity')
        .eq('id', productId)
        .single();
      
      targetProduct = currentProduct;
    }
    
    // Si no se encuentra por ID, buscar por nombre
    if (!targetProduct && isDaily && item.product_name) {
      const { data: productsByName } = await supabase
        .from(tableName)
        .select('id, name, stock_quantity, expires_at, created_at')
        .eq('name', item.product_name)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (productsByName && productsByName.length > 0) {
        targetProduct = productsByName[0];
        console.log(`   ✅ Producto encontrado por nombre: ${targetProduct.id}`);
      }
    }
    
    if (targetProduct) {
      const oldStock = targetProduct.stock_quantity;
      const newStock = oldStock - item.quantity;
      
      console.log(`   📊 Stock: ${oldStock} → ${newStock}`);
      
      // ACTUALIZACIÓN REAL
      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          stock_quantity: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetProduct.id);
      
      if (updateError) {
        console.error(`   ❌ ERROR en actualización:`, updateError);
      } else {
        console.log(`   ✅ Stock actualizado exitosamente`);
        
        // Verificar la actualización
        const { data: verificacion } = await supabase
          .from(tableName)
          .select('stock_quantity')
          .eq('id', targetProduct.id)
          .single();
        
        console.log(`   🔍 Verificación - Nuevo stock: ${verificacion?.stock_quantity}`);
      }
    } else {
      console.log(`   ❌ No se pudo encontrar el producto para actualizar`);
    }
  }
};

// Ejecutar depuración
depurarTostadas();
