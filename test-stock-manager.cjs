// ===============================================
// PRUEBA DEL STOCK MANAGER CORREGIDO
// Simula exactamente lo que hace SellerOrderManagement
// ===============================================

const https = require('https');

function querySupabase(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'sjvhxwqahglsfdohqkhf.supabase.co',
      path: '/rest/v1/' + endpoint,
      method: method,
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqdmh4d3FhaGdsc2Zkb2hxa2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3Mzk1MDgsImV4cCI6MjA1MDMxNTUwOH0.bYN5EuCkYFE0eV_pG02_sqoTKMOaXyxYV5FxHRxlKHY',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqdmh4d3FhaGdsc2Zkb2hxa2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3Mzk1MDgsImV4cCI6MjA1MDMxNTUwOH0.bYN5EuCkYFE0eV_pG02_sqoTKMOaXyxYV5FxHRxlKHY',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// Simulación del stockManager corregido
async function updateProductStockFixed(orderItems, orderId) {
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
    return { success: false, message: 'No hay items para actualizar stock' };
  }

  try {
    const updatedProducts = [];

    for (const item of orderItems) {
      console.log(`🔍 Procesando producto, cantidad: ${item.quantity}, tipo: ${item.product_type || 'regular'}`);

      const isDaily = item.product_type === 'daily' || !!item.daily_product_id;
      let currentProduct = null;

      // OPCIÓN 1: Para productos del día, buscar por product_id en daily_products
      if (isDaily && item.product_id) {
        console.log(`🔍 OPCIÓN 1: Buscando producto del día por product_id: ${item.product_id}`);
        const product = await querySupabase(`daily_products?id=eq.${item.product_id}`);

        if (product && product.length > 0) {
          currentProduct = product[0];
          console.log(`✅ ENCONTRADO por product_id en daily_products: ${currentProduct.name}`);
        } else {
          console.log(`❌ No encontrado por product_id en daily_products`);
        }
      }

      // OPCIÓN 2: Para productos regulares, buscar por product_id en products
      if (!currentProduct && !isDaily && item.product_id) {
        console.log(`🔍 OPCIÓN 2: Buscando producto regular por product_id: ${item.product_id}`);
        const product = await querySupabase(`products?id=eq.${item.product_id}`);

        if (product && product.length > 0) {
          currentProduct = product[0];
          console.log(`✅ ENCONTRADO por product_id en products: ${currentProduct.name}`);
        } else {
          console.log(`❌ No encontrado por product_id en products`);
        }
      }

      if (!currentProduct) {
        console.log(`❌ PRODUCTO NO ENCONTRADO`);
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

      const updatedData = await querySupabase(
        `${updateTableName}?id=eq.${currentProduct.id}`,
        'PATCH',
        updateData
      );

      console.log(`✅ Stock actualizado exitosamente para ${currentProduct.name}`);

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

// Función de prueba
async function testStockManager() {
  console.log('🧪 PROBANDO STOCK MANAGER CORREGIDO...\n');
  
  const productId = 'c103a8a0-78a3-4c7d-8d09-f9c3db2d4f47';
  
  try {
    // 1. Ver stock inicial
    const producto = await querySupabase(`daily_products?id=eq.${productId}`);
    console.log('📦 STOCK INICIAL:', producto[0]?.stock_quantity);
    
    // 2. Simular order_items como los crea el frontend
    const simulatedOrderItems = [{
      product_id: productId,
      daily_product_id: null, // En la estructura real esto está vacío
      quantity: 1,
      product_name: 'Plátanos Rellenos',
      product_type: 'daily'
    }];
    
    console.log('\n🚀 SIMULANDO ACEPTACIÓN DE ORDEN...');
    
    // 3. Probar el stockManager corregido
    const result = await updateProductStockFixed(simulatedOrderItems, 'test-order-123');
    
    console.log('\n📊 RESULTADO:');
    console.log('Success:', result.success);
    console.log('Message:', result.message);
    if (result.updatedProducts) {
      console.log('Updated Products:', result.updatedProducts);
    }
    
    // 4. Verificar stock final
    const productoFinal = await querySupabase(`daily_products?id=eq.${productId}`);
    console.log('\n📦 STOCK FINAL:', productoFinal[0]?.stock_quantity);
    
    console.log('\n✅ PRUEBA COMPLETADA');
    
  } catch (error) {
    console.error('❌ Error en prueba:', error.message);
  }
}

testStockManager();
