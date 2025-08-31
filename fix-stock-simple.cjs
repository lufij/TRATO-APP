// Fix definitivo para el stock - versión simple
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

const productId = 'c103a8a0-78a3-4c7d-8d09-f9c3db2d4f47';

(async () => {
  console.log('🔧 FIX DEFINITIVO PARA STOCK...');
  
  try {
    // 1. Ver producto actual
    const producto = await querySupabase('daily_products?id=eq.' + productId);
    console.log('Stock actual:', producto[0]?.stock_quantity);
    
    // 2. Buscar order_items con la estructura correcta
    const orderItems = await querySupabase('order_items?product_type=eq.daily&product_id=eq.' + productId);
    console.log('Order items encontrados:', orderItems.length);
    
    if (orderItems.length > 0) {
      // 3. Verificar status de cada orden
      let totalVendido = 0;
      
      for (const item of orderItems) {
        const orders = await querySupabase('orders?id=eq.' + item.order_id);
        const status = orders[0]?.status;
        
        console.log('Orden', item.order_id, '- Status:', status, '- Cantidad:', item.quantity);
        
        if (['delivered', 'completed', 'accepted'].includes(status)) {
          totalVendido += item.quantity;
        }
      }
      
      console.log('Total vendido que debería descontarse:', totalVendido);
      
      if (totalVendido > 0) {
        // 4. Aplicar el fix
        const stockActual = producto[0]?.stock_quantity || 0;
        const nuevoStock = stockActual - totalVendido;
        
        console.log('Actualizando stock de', stockActual, 'a', nuevoStock);
        
        await querySupabase(
          'daily_products?id=eq.' + productId,
          'PATCH',
          { 
            stock_quantity: nuevoStock,
            updated_at: new Date().toISOString()
          }
        );
        
        console.log('✅ STOCK CORREGIDO EXITOSAMENTE');
        
        // Verificar
        const productoActualizado = await querySupabase('daily_products?id=eq.' + productId);
        console.log('Nuevo stock:', productoActualizado[0]?.stock_quantity);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
