/**
 * Script para depurar el problema de stock de productos del día
 * 
 * PROBLEMA: Cuando se marca una orden como entregada, el stock de productos del día no se reduce
 * 
 * INVESTIGACIÓN:
 * 1. Verificar cómo se almacenan los productos del día en cart_items
 * 2. Verificar cómo se transfieren a order_items  
 * 3. Verificar qué datos recibe el stockManager
 * 4. Verificar por qué falla la actualización de stock
 */

// Para ejecutar en la consola del navegador (DevTools)
console.log('🚀 INVESTIGACIÓN PROFUNDA: STOCK DE PRODUCTOS DEL DÍA');
console.log('====================================================');

async function investigarStockDiario() {
  try {
    // Asumir que estamos en el contexto del navegador con acceso a supabase
    if (typeof window === 'undefined' || !window.supabase) {
      console.error('❌ Este script debe ejecutarse en la consola del navegador');
      return;
    }
    
    const { supabase } = window;
    
    console.log('\n🔍 PASO 1: Verificar productos del día actuales');
    const { data: dailyProducts, error: dailyError } = await supabase
      .from('daily_products')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    if (dailyError) {
      console.error('❌ Error obteniendo productos del día:', dailyError);
      return;
    }
    
    console.log(`📦 Productos del día encontrados: ${dailyProducts?.length || 0}`);
    dailyProducts?.forEach(product => {
      console.log(`   🍽️ ${product.name}`);
      console.log(`       ID: ${product.id}`);
      console.log(`       Stock: ${product.stock_quantity}`);
      console.log(`       Expira: ${product.expires_at}`);
      console.log('');
    });
    
    console.log('\n🔍 PASO 2: Verificar items en carrito');
    // Nota: Necesitaríamos el user_id para esto, simularemos con datos recientes
    
    console.log('\n🔍 PASO 3: Verificar órdenes recientes con productos del día');
    const { data: recentOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (ordersError) {
      console.error('❌ Error obteniendo órdenes:', ordersError);
      return;
    }
    
    for (const order of recentOrders || []) {
      console.log(`\n📋 === ORDEN ${order.id} (${order.status}) ===`);
      
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
      
      if (itemsError) {
        console.error(`❌ Error obteniendo items de orden ${order.id}:`, itemsError);
        continue;
      }
      
      for (const item of orderItems || []) {
        console.log(`\n   📦 ITEM: "${item.product_name}"`);
        console.log(`       product_id: ${item.product_id}`);
        console.log(`       daily_product_id: ${item.daily_product_id}`);
        console.log(`       product_type: ${item.product_type}`);
        console.log(`       quantity: ${item.quantity}`);
        
        // ANÁLISIS CRÍTICO: ¿Qué ID debería usar el stockManager?
        const isDaily = item.product_type === 'daily' || !!item.daily_product_id;
        const targetTable = isDaily ? 'daily_products' : 'products';
        const targetId = isDaily && item.daily_product_id ? item.daily_product_id : item.product_id;
        
        console.log(`\n       🎯 ANÁLISIS DE STOCKMANAGER:`);
        console.log(`          isDaily: ${isDaily}`);
        console.log(`          targetTable: ${targetTable}`);
        console.log(`          targetId: ${targetId}`);
        
        // Verificar si existe el producto en la tabla correcta
        if (targetId) {
          const { data: targetProduct, error: targetError } = await supabase
            .from(targetTable)
            .select('id, name, stock_quantity')
            .eq('id', targetId)
            .single();
          
          if (targetError) {
            console.log(`       ❌ ERROR buscando en ${targetTable}:`, targetError.message);
            
            // Si es producto del día y falla, intentar búsqueda por nombre
            if (isDaily && item.product_name) {
              console.log(`       🔍 Intentando búsqueda por nombre: "${item.product_name}"`);
              const { data: byName, error: nameError } = await supabase
                .from('daily_products')
                .select('id, name, stock_quantity, expires_at')
                .eq('name', item.product_name)
                .gte('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(1);
              
              if (nameError) {
                console.log(`       ❌ Error en búsqueda por nombre:`, nameError.message);
              } else if (byName && byName.length > 0) {
                console.log(`       ✅ ENCONTRADO por nombre:`, byName[0]);
                console.log(`          ID real: ${byName[0].id}`);
                console.log(`          Stock actual: ${byName[0].stock_quantity}`);
              } else {
                console.log(`       ❌ No encontrado por nombre`);
              }
            }
          } else {
            console.log(`       ✅ ENCONTRADO en ${targetTable}:`, targetProduct);
          }
        } else {
          console.log(`       ⚠️ NO HAY targetId válido`);
        }
      }
    }
    
    console.log('\n🎯 CONCLUSIONES:');
    console.log('================');
    console.log('1. Verificar que los daily_product_id en order_items apunten a IDs válidos');
    console.log('2. Verificar que el stockManager esté usando la lógica correcta de tablas');
    console.log('3. Si hay problemas de ID, el fallback por nombre debería funcionar');
    console.log('4. Revisar logs de consola cuando se marca como entregado');
    
  } catch (error) {
    console.error('💥 Error en investigación:', error);
  }
}

// Función para simular el proceso de stockManager
window.simularStockManager = async function(orderId) {
  console.log(`\n🧪 SIMULANDO STOCKMANAGER para orden ${orderId}`);
  console.log('===============================================');
  
  const { supabase } = window;
  
  // Obtener items de la orden
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('product_id, daily_product_id, quantity, product_name, product_type')
    .eq('order_id', orderId);
  
  if (itemsError) {
    console.error('❌ Error obteniendo items:', itemsError);
    return;
  }
  
  console.log('📦 Items obtenidos:', orderItems);
  
  for (const item of orderItems || []) {
    console.log(`\n🔄 Procesando: ${item.product_name}`);
    
    const isDaily = item.product_type === 'daily' || !!item.daily_product_id;
    const tableName = isDaily ? 'daily_products' : 'products';
    const productId = isDaily && item.daily_product_id ? item.daily_product_id : item.product_id;
    
    console.log(`   🎯 Configuración:`);
    console.log(`      isDaily: ${isDaily}`);
    console.log(`      tableName: ${tableName}`);
    console.log(`      productId: ${productId}`);
    
    // Intentar buscar el producto
    const { data: currentProduct, error: fetchError } = await supabase
      .from(tableName)
      .select('id, name, stock_quantity, is_available')
      .eq('id', productId)
      .single();
    
    if (fetchError || !currentProduct) {
      console.log(`   ❌ No encontrado por ID:`, fetchError?.message);
      
      // Búsqueda por nombre como fallback
      if (isDaily && item.product_name) {
        console.log(`   🔍 Buscando por nombre...`);
        const { data: productsByName, error: nameSearchError } = await supabase
          .from(tableName)
          .select('id, name, stock_quantity, is_available, expires_at, created_at')
          .eq('name', item.product_name)
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!nameSearchError && productsByName && productsByName.length > 0) {
          console.log(`   ✅ Encontrado por nombre:`, productsByName[0]);
          
          // Simular actualización
          const oldStock = productsByName[0].stock_quantity;
          const newStock = oldStock - item.quantity;
          console.log(`   📊 Stock: ${oldStock} → ${newStock}`);
          
          // AQUÍ ESTARÍA LA ACTUALIZACIÓN REAL
          console.log(`   🔄 [SIMULACIÓN] UPDATE ${tableName} SET stock_quantity = ${newStock} WHERE id = '${productsByName[0].id}'`);
          
        } else {
          console.log(`   ❌ Tampoco encontrado por nombre:`, nameSearchError?.message);
        }
      }
    } else {
      console.log(`   ✅ Encontrado por ID:`, currentProduct);
      const oldStock = currentProduct.stock_quantity;
      const newStock = oldStock - item.quantity;
      console.log(`   📊 Stock: ${oldStock} → ${newStock}`);
      console.log(`   🔄 [SIMULACIÓN] UPDATE ${tableName} SET stock_quantity = ${newStock} WHERE id = '${currentProduct.id}'`);
    }
  }
};

// Ejecutar investigación
investigarStockDiario();
