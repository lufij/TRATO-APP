// ===============================================
// CONSULTA DIRECTA CON FETCH (sin dependencias)
// ===============================================

const supabaseUrl = 'https://sjvhxwqahglsfdohqkhf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqdmh4d3FhaGdsc2Zkb2hxa2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3Mzk1MDgsImV4cCI6MjA1MDMxNTUwOH0.bYN5EuCkYFE0eV_pG02_sqoTKMOaXyxYV5FxHRxlKHY';

async function fetchFromSupabase(table, query = '') {
  const url = `${supabaseUrl}/rest/v1/${table}${query}`;
  const response = await fetch(url, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

async function diagnosticar() {
  const productId = 'c103a8a0-78a3-4c7d-8d09-f9c3db2d4f47';
  
  console.log('🔍 DIAGNÓSTICO DIRECTO CON FETCH\n');
  
  try {
    // 1. Ver el producto específico
    console.log('1️⃣ PRODUCTO EN DAILY_PRODUCTS:');
    const producto = await fetchFromSupabase('daily_products', `?id=eq.${productId}`);
    console.log(JSON.stringify(producto, null, 2));
    
    // 2. Ver order_items con daily_product_id
    console.log('\n2️⃣ ORDER_ITEMS CON daily_product_id:');
    const orderItemsByDaily = await fetchFromSupabase('order_items', `?daily_product_id=eq.${productId}&select=*`);
    console.log(`Cantidad: ${orderItemsByDaily.length}`);
    console.log(JSON.stringify(orderItemsByDaily, null, 2));
    
    // 3. Ver order_items con product_type=daily
    console.log('\n3️⃣ ORDER_ITEMS CON product_type=daily:');
    const orderItemsByType = await fetchFromSupabase('order_items', `?product_type=eq.daily&select=*`);
    console.log(`Total con product_type=daily: ${orderItemsByType.length}`);
    
    // Filtrar los que tienen el product_id específico
    const itemsForThisProduct = orderItemsByType.filter(item => item.product_id === productId);
    console.log(`Con nuestro product_id: ${itemsForThisProduct.length}`);
    console.log(JSON.stringify(itemsForThisProduct, null, 2));
    
    // 4. Resumen
    console.log('\n4️⃣ RESUMEN:');
    const totalItems = [...orderItemsByDaily, ...itemsForThisProduct];
    const uniqueItems = totalItems.filter((item, index, self) => 
      index === self.findIndex(i => i.id === item.id)
    );
    
    console.log(`Total order_items únicos para este producto: ${uniqueItems.length}`);
    
    if (uniqueItems.length > 0) {
      console.log('\n📦 DETALLES DE LOS ORDER_ITEMS:');
      uniqueItems.forEach((item, index) => {
        console.log(`   ${index + 1}. Order ID: ${item.order_id}`);
        console.log(`      Product ID: ${item.product_id}`);
        console.log(`      Daily Product ID: ${item.daily_product_id || 'N/A'}`);
        console.log(`      Product Type: ${item.product_type || 'N/A'}`);
        console.log(`      Product Name: ${item.product_name || 'N/A'}`);
        console.log(`      Quantity: ${item.quantity}`);
        console.log(`      Price: ${item.price}`);
      });
      
      // 5. Verificar status de las órdenes
      console.log('\n5️⃣ VERIFICANDO STATUS DE ÓRDENES:');
      for (const item of uniqueItems) {
        const orders = await fetchFromSupabase('orders', `?id=eq.${item.order_id}&select=id,status,created_at`);
        if (orders.length > 0) {
          console.log(`   Orden ${item.order_id}: ${orders[0].status} (${orders[0].created_at})`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

diagnosticar();
