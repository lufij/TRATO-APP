// Script para rastrear exactamente de dónde viene la información para descontar stock
import { supabase } from './utils/supabase/client.js';

console.log('🔍 INVESTIGANDO FLUJO DE DESCUENTO DE STOCK');
console.log('=====================================\n');

async function investigateStockFlow() {
  try {
    // 1. Verificar órdenes existentes
    console.log('📋 1. ÓRDENES EN EL SISTEMA:');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, buyer_name, total, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (ordersError) {
      console.error('❌ Error obteniendo órdenes:', ordersError);
      return;
    }

    console.log('Órdenes encontradas:');
    orders?.forEach(order => {
      console.log(`- ${order.id.slice(0, 8)}: ${order.buyer_name} | ${order.status} | Q${order.total}`);
    });

    if (!orders || orders.length === 0) {
      console.log('⚠️ No hay órdenes en el sistema');
      return;
    }

    // 2. Verificar order_items de la primera orden
    const firstOrder = orders[0];
    console.log(`\n📦 2. ORDER_ITEMS DE LA ORDEN ${firstOrder.id.slice(0, 8)}:`);
    
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id, daily_product_id, quantity, product_name, product_type, unit_price')
      .eq('order_id', firstOrder.id);

    if (itemsError) {
      console.error('❌ Error obteniendo order_items:', itemsError);
      return;
    }

    console.log('Items en la orden:');
    orderItems?.forEach(item => {
      console.log(`- ${item.product_name}`);
      console.log(`  • Cantidad: ${item.quantity}`);
      console.log(`  • Product ID: ${item.product_id}`);
      console.log(`  • Daily Product ID: ${item.daily_product_id || 'null'}`);
      console.log(`  • Tipo: ${item.product_type || 'no especificado'}`);
      console.log(`  • Precio unitario: Q${item.unit_price}`);
      console.log('');
    });

    // 3. Verificar stock actual en daily_products
    console.log('📊 3. STOCK ACTUAL EN DAILY_PRODUCTS:');
    const { data: dailyProducts, error: dailyError } = await supabase
      .from('daily_products')
      .select('id, name, stock_quantity, price, created_at')
      .order('created_at', { ascending: false });

    if (dailyError) {
      console.error('❌ Error obteniendo daily_products:', dailyError);
    } else {
      console.log('Productos del día:');
      dailyProducts?.forEach(product => {
        console.log(`- ${product.name}: Stock ${product.stock_quantity} | Q${product.price} | ID: ${product.id.slice(0, 8)}`);
      });
    }

    // 4. Verificar stock en products regulares
    console.log('\n📊 4. STOCK ACTUAL EN PRODUCTS (regulares):');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, stock_quantity, price, created_at')
      .gt('stock_quantity', 0)
      .order('created_at', { ascending: false })
      .limit(5);

    if (productsError) {
      console.error('❌ Error obteniendo products:', productsError);
    } else {
      console.log('Productos regulares:');
      products?.forEach(product => {
        console.log(`- ${product.name}: Stock ${product.stock_quantity} | Q${product.price} | ID: ${product.id.slice(0, 8)}`);
      });
    }

    // 5. Mostrar el flujo de descuento
    console.log('\n🔄 5. FLUJO DE DESCUENTO:');
    console.log('1. Vendedor acepta orden → SellerOrderManagement.tsx');
    console.log('2. Se obtienen order_items de la tabla "order_items" usando order_id');
    console.log('3. Para cada item:');
    console.log('   - Si tiene daily_product_id → Descuenta de "daily_products"');
    console.log('   - Si NO tiene daily_product_id → Descuenta de "products"');
    console.log('4. Se actualiza stock_quantity = stock_actual - cantidad_comprada');
    console.log('5. Se dispara evento para actualizar frontend');

    // 6. Simular el descuento para ver qué datos se usarían
    if (orderItems && orderItems.length > 0) {
      console.log('\n🧪 6. SIMULACIÓN DE DESCUENTO:');
      orderItems.forEach(item => {
        const isDaily = item.product_type === 'daily' || !!item.daily_product_id;
        const tableName = isDaily ? 'daily_products' : 'products';
        const productId = isDaily && item.daily_product_id ? item.daily_product_id : item.product_id;
        
        console.log(`${item.product_name}:`);
        console.log(`  • Tabla: ${tableName}`);
        console.log(`  • ID a buscar: ${productId}`);
        console.log(`  • Cantidad a descontar: ${item.quantity}`);
        console.log(`  • Query: UPDATE ${tableName} SET stock_quantity = stock_quantity - ${item.quantity} WHERE id = '${productId}'`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error en investigación:', error);
  }
}

investigateStockFlow();
