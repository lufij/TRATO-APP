// ===============================================
// SIMULACIÓN DE ACEPTACIÓN DE ORDEN
// Para probar exactamente lo que pasa en tiempo real
// ===============================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sjvhxwqahglsfdohqkhf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqdmh4d3FhaGdsc2Zkb2hxa2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3Mzk1MDgsImV4cCI6MjA1MDMxNTUwOH0.bYN5EuCkYFE0eV_pG02_sqoTKMOaXyxYV5FxHRxlKHY';

const supabase = createClient(supabaseUrl, supabaseKey);

// Función de stockManager copiada exactamente
async function updateProductStock(orderItems, orderId) {
  console.log('🔄 Iniciando actualización de stock para orden:', orderId);
  console.log('📦 Items a procesar:', orderItems.length);
  
  orderItems.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.product_name}`);
    console.log(`      - Cantidad: ${item.quantity}`);
    console.log(`      - Tipo: ${item.product_type || 'regular'}`);
    console.log(`      - Product ID: ${item.product_id}`);
    console.log(`      - Daily Product ID: ${item.daily_product_id || 'N/A'}`);
  });

  if (!orderItems || orderItems.length === 0) {
    console.log('⚠️ No hay items para procesar');
    return {
      success: false,
      message: 'No hay items para actualizar stock'
    };
  }

  try {
    const updatedProducts = [];

    for (const item of orderItems) {
      console.log(`🔍 Procesando producto, cantidad: ${item.quantity}, tipo: ${item.product_type || 'regular'}`);
      console.log(`    Product ID: ${item.product_id}, Daily Product ID: ${item.daily_product_id}`);

      const isDaily = item.product_type === 'daily' || !!item.daily_product_id;
      const tableName = isDaily ? 'daily_products' : 'products';
      
      let currentProduct = null;

      // OPCIÓN 1: Buscar por daily_product_id si existe
      if (isDaily && item.daily_product_id) {
        console.log(`🔍 OPCIÓN 1: Buscando por daily_product_id: ${item.daily_product_id}`);
        const { data: productByDailyId, error: dailyIdError } = await supabase
          .from('daily_products')
          .select('id, name, stock_quantity, is_available')
          .eq('id', item.daily_product_id)
          .single();

        if (!dailyIdError && productByDailyId) {
          currentProduct = productByDailyId;
          console.log(`✅ ENCONTRADO por daily_product_id: ${currentProduct.name}`);
        } else {
          console.log(`❌ No encontrado por daily_product_id:`, dailyIdError?.message);
        }
      }

      // OPCIÓN 2: Buscar por product_id en la tabla correspondiente
      if (!currentProduct && item.product_id) {
        console.log(`🔍 OPCIÓN 2: Buscando por product_id: ${item.product_id} en ${tableName}`);
        const { data: productById, error: idError } = await supabase
          .from(tableName)
          .select('id, name, stock_quantity, is_available')
          .eq('id', item.product_id)
          .single();

        if (!idError && productById) {
          currentProduct = productById;
          console.log(`✅ ENCONTRADO por product_id: ${currentProduct.name}`);
        } else {
          console.log(`❌ No encontrado por product_id:`, idError?.message);
        }
      }

      // OPCIÓN 3: Buscar por nombre en daily_products
      if (!currentProduct && isDaily && item.product_name) {
        console.log(`🔍 OPCIÓN 3: Buscando por nombre en daily_products: ${item.product_name}`);
        const { data: productsByName, error: nameError } = await supabase
          .from('daily_products')
          .select('id, name, stock_quantity, is_available, expires_at')
          .eq('name', item.product_name)
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (!nameError && productsByName && productsByName.length > 0) {
          currentProduct = productsByName[0];
          console.log(`✅ ENCONTRADO por nombre: ${currentProduct.name}`);
        } else {
          console.log(`❌ No encontrado por nombre:`, nameError?.message);
        }
      }

      if (!currentProduct) {
        console.log(`❌ PRODUCTO NO ENCONTRADO EN NINGUNA BÚSQUEDA`);
        return {
          success: false,
          message: `Error al obtener información del producto ${item.product_name}. Producto no encontrado.`
        };
      }

      const oldStock = currentProduct.stock_quantity;
      const newStock = oldStock - item.quantity;

      console.log(`📊 ${isDaily ? 'Producto del día' : 'Producto regular'} "${currentProduct.name}": ${oldStock} → ${newStock} (vendido: ${item.quantity})`);

      if (oldStock < item.quantity) {
        console.error(`❌ Stock insuficiente para ${currentProduct.name}: tiene ${oldStock}, necesita ${item.quantity}`);
        return {
          success: false,
          message: `Stock insuficiente para ${currentProduct.name}. Solo quedan ${oldStock} unidades.`
        };
      }

      const updateTableName = isDaily ? 'daily_products' : 'products';
      
      console.log(`🔄 Actualizando en tabla: ${updateTableName}, ID: ${currentProduct.id}`);

      const updateData = {
        stock_quantity: newStock,
        updated_at: new Date().toISOString()
      };

      const { data: updatedData, error: updateError } = await supabase
        .from(updateTableName)
        .update(updateData)
        .eq('id', currentProduct.id)
        .select()
        .single();

      if (updateError) {
        console.error(`❌ Error actualizando stock:`, updateError);
        return {
          success: false,
          message: `Error al actualizar stock de ${currentProduct.name}: ${updateError.message}`
        };
      }

      console.log(`✅ Stock actualizado exitosamente:`, updatedData);

      updatedProducts.push({
        product_id: currentProduct.id,
        old_stock: oldStock,
        new_stock: newStock,
        quantity_sold: item.quantity,
        product_type: item.product_type
      });
    }

    return {
      success: true,
      message: `Stock actualizado exitosamente para ${updatedProducts.length} productos`,
      updatedProducts
    };

  } catch (error) {
    console.error('❌ Error crítico en updateProductStock:', error);
    return {
      success: false,
      message: `Error crítico: ${error.message}`
    };
  }
}

async function simulateOrderAcceptance() {
  console.log('🧪 SIMULANDO ACEPTACIÓN DE ORDEN CON PLÁTANOS RELLENOS\n');
  
  // Buscar una orden real que tenga el producto
  const productId = 'c103a8a0-78a3-4c7d-8d09-f9c3db2d4f47';
  
  // 1. Ver el stock actual
  const { data: currentProduct } = await supabase
    .from('daily_products')
    .select('*')
    .eq('id', productId)
    .single();
  
  console.log('📦 ESTADO INICIAL:');
  console.log(`   Producto: ${currentProduct?.name}`);
  console.log(`   Stock actual: ${currentProduct?.stock_quantity}`);
  
  // 2. Buscar order_items reales de este producto
  const { data: orderItems } = await supabase
    .from('order_items')
    .select(`
      *,
      orders!inner(id, status)
    `)
    .eq('daily_product_id', productId)
    .limit(1);
  
  if (!orderItems || orderItems.length === 0) {
    console.log('❌ No se encontraron órdenes para simular');
    return;
  }
  
  const testItem = orderItems[0];
  
  console.log('\n🎯 SIMULANDO CON DATOS REALES:');
  console.log(`   Order ID: ${testItem.orders.id}`);
  console.log(`   Cantidad: ${testItem.quantity}`);
  console.log(`   Product Type: ${testItem.product_type}`);
  
  // 3. Simular la llamada exacta del frontend
  const simulatedOrderItems = [{
    product_id: testItem.product_id,
    daily_product_id: testItem.daily_product_id,
    quantity: testItem.quantity,
    product_name: testItem.product_name,
    product_type: testItem.product_type
  }];
  
  console.log('\n🚀 EJECUTANDO STOCKMANAGER...');
  const result = await updateProductStock(simulatedOrderItems, testItem.orders.id);
  
  console.log('\n📊 RESULTADO:');
  console.log(result);
  
  // 4. Verificar el nuevo stock
  const { data: updatedProduct } = await supabase
    .from('daily_products')
    .select('*')
    .eq('id', productId)
    .single();
  
  console.log('\n📦 ESTADO FINAL:');
  console.log(`   Stock después de la prueba: ${updatedProduct?.stock_quantity}`);
  console.log(`   ¿Se decrementó? ${updatedProduct?.stock_quantity < currentProduct?.stock_quantity ? '✅ SÍ' : '❌ NO'}`);
}

simulateOrderAcceptance();
