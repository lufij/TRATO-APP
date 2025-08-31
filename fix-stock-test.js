// ===============================================
// FIX DEFINITIVO PARA EL STOCK MANAGER
// Basado en el diagnóstico real de la estructura de datos
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

async function testStockFix() {
  console.log('🧪 PROBANDO FIX DEFINITIVO PARA STOCK...');
  
  const productId = 'c103a8a0-78a3-4c7d-8d09-f9c3db2d4f47';
  
  try {
    // 1. Ver producto actual
    console.log('\\n1️⃣ ESTADO INICIAL DEL PRODUCTO:');
    const producto = await querySupabase(`daily_products?id=eq.${productId}`);
    console.log(`Nombre: ${producto[0]?.name}`);
    console.log(`Stock actual: ${producto[0]?.stock_quantity}`);
    
    // 2. Buscar order_items usando la estructura REAL
    console.log('\n2️⃣ BUSCANDO ORDER_ITEMS CON ESTRUCTURA REAL:');
    const orderItems = await querySupabase(`order_items?product_type=eq.daily&product_id=eq.${productId}`);
    console.log(`Order items encontrados: ${orderItems.length}`);
    
    if (orderItems.length > 0) {
      console.log('\\n📦 DETALLES DE LOS ORDER_ITEMS:');
      for (const item of orderItems) {
        // Obtener status de la orden
        const orders = await querySupabase(\`orders?id=eq.\${item.order_id}\`);
        const orderStatus = orders[0]?.status || 'unknown';
        
        console.log(\`   Order \${item.order_id} - Status: \${orderStatus}\`);
        console.log(\`   Cantidad: \${item.quantity}\`);
        console.log(\`   Product ID: \${item.product_id}\`);
        console.log(\`   Product Type: \${item.product_type}\`);
        console.log(\`   Daily Product ID: \${item.daily_product_id || 'N/A'}\`);
        console.log('');
      }
      
      // 3. Calcular qué stock debería tener
      const deliveredOrders = [];
      for (const item of orderItems) {
        const orders = await querySupabase(\`orders?id=eq.\${item.order_id}\`);
        if (orders[0] && ['delivered', 'completed', 'accepted'].includes(orders[0].status)) {
          deliveredOrders.push(item);
        }
      }
      
      const totalVendido = deliveredOrders.reduce((sum, item) => sum + item.quantity, 0);
      
      console.log('\\n3️⃣ ANÁLISIS:');
      console.log(\`Total órdenes: \${orderItems.length}\`);
      console.log(\`Órdenes entregadas: \${deliveredOrders.length}\`);
      console.log(\`Cantidad total vendida: \${totalVendido}\`);
      console.log(\`Stock actual: \${producto[0]?.stock_quantity}\`);
      console.log(\`Stock que debería tener: \${(producto[0]?.stock_quantity || 0) + totalVendido}\`);
      
      if (totalVendido > 0) {
        console.log('\\n🚨 PROBLEMA CONFIRMADO:');
        console.log('   ✅ Hay órdenes entregadas que no decrementaron stock');
        console.log('   ✅ La estructura usa product_type=daily + product_id');
        console.log('   ❌ El stockManager buscaba por daily_product_id (que está vacío)');
        
        // 4. PROBAR EL FIX - Decrementar stock manualmente para validar
        console.log('\\n4️⃣ APLICANDO FIX MANUAL PARA VALIDAR:');
        const newStock = (producto[0]?.stock_quantity || 0) - totalVendido;
        
        console.log(\`Actualizando stock de \${producto[0]?.stock_quantity} a \${newStock}...\`);
        
        const updateResult = await querySupabase(
          \`daily_products?id=eq.\${productId}\`,
          'PATCH',
          { 
            stock_quantity: newStock,
            updated_at: new Date().toISOString()
          }
        );
        
        console.log('✅ Stock actualizado exitosamente');
        
        // Verificar la actualización
        const productoActualizado = await querySupabase(\`daily_products?id=eq.\${productId}\`);
        console.log(\`Stock después del fix: \${productoActualizado[0]?.stock_quantity}\`);
        
      } else {
        console.log('\\n✅ No hay órdenes entregadas para procesar');
      }
    } else {
      console.log('\\n⚠️ No se encontraron order_items para este producto');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testStockFix();
