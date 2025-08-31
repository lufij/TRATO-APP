/**
 * 🧪 TEST: Verificar que el stock de productos del día se descuenta correctamente
 * 
 * Este script simula el proceso que ahora debería funcionar:
 * 1. Comprador hace pedido → Estado: pending
 * 2. Vendedor acepta → Estado: accepted + stock se descuenta automáticamente
 * 3. Verificar que el stock disminuyó correctamente
 */

import { supabase } from './utils/supabase/client.js';

async function testStockFix() {
  console.log('🧪 PROBANDO FIX DE STOCK PARA PRODUCTOS DEL DÍA');
  console.log('='.repeat(50));

  try {
    // 1. Obtener un producto del día con stock > 0
    console.log('\n1️⃣ Buscando productos del día disponibles...');
    
    const { data: dailyProducts, error: dailyError } = await supabase
      .from('daily_products')
      .select('id, name, stock_quantity, seller_id')
      .gt('stock_quantity', 0)
      .gte('expires_at', new Date().toISOString())
      .limit(1);

    if (dailyError) {
      console.error('❌ Error obteniendo productos del día:', dailyError);
      return;
    }

    if (!dailyProducts || dailyProducts.length === 0) {
      console.log('⚠️ No hay productos del día disponibles para probar');
      return;
    }

    const testProduct = dailyProducts[0];
    console.log(`✅ Producto encontrado: ${testProduct.name}`);
    console.log(`   Stock inicial: ${testProduct.stock_quantity}`);
    console.log(`   Seller ID: ${testProduct.seller_id}`);

    // 2. Buscar un comprador (no seller)
    console.log('\n2️⃣ Buscando comprador para la prueba...');
    
    const { data: buyers, error: buyersError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('role', 'buyer')
      .neq('id', testProduct.seller_id)
      .limit(1);

    if (buyersError || !buyers || buyers.length === 0) {
      console.log('⚠️ No hay compradores disponibles, creando orden de prueba genérica');
      console.log('   (En producción, esto viene del comprador real)');
    }

    const testBuyer = buyers?.[0] || { 
      id: '00000000-0000-0000-0000-000000000001', 
      name: 'Test Buyer',
      email: 'test@buyer.com'
    };

    // 3. Crear una orden de prueba
    console.log('\n3️⃣ Creando orden de prueba...');
    
    const orderData = {
      buyer_id: testBuyer.id,
      seller_id: testProduct.seller_id,
      subtotal: 15.00,
      delivery_fee: 0.00,
      total: 15.00,
      delivery_type: 'pickup',
      customer_notes: 'Orden de prueba para testing stock',
      phone_number: '12345678',
      customer_name: testBuyer.name,
      status: 'pending',
      estimated_time: 30
    };

    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (orderError) {
      console.error('❌ Error creando orden:', orderError);
      return;
    }

    console.log(`✅ Orden creada: ${newOrder.id}`);

    // 4. Crear item de la orden (producto del día)
    console.log('\n4️⃣ Agregando producto del día a la orden...');
    
    const orderItemData = {
      order_id: newOrder.id,
      product_id: testProduct.id,
      daily_product_id: testProduct.id, // ✅ Importante para productos del día
      product_name: testProduct.name,
      quantity: 2, // Probar con 2 unidades
      product_type: 'daily', // ✅ Tipo crucial
      price_per_unit: 7.50,
      total_price: 15.00
    };

    const { error: itemError } = await supabase
      .from('order_items')
      .insert([orderItemData]);

    if (itemError) {
      console.error('❌ Error creando item:', itemError);
      // Limpiar orden creada
      await supabase.from('orders').delete().eq('id', newOrder.id);
      return;
    }

    console.log(`✅ Item agregado: 2x ${testProduct.name}`);

    // 5. Simular aceptación por vendedor (esto debería activar el stock update)
    console.log('\n5️⃣ Simulando aceptación del vendedor...');
    console.log('   (Esto debería descontar 2 unidades del stock)');

    const { error: acceptError } = await supabase
      .from('orders')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', newOrder.id);

    if (acceptError) {
      console.error('❌ Error aceptando orden:', acceptError);
      // Limpiar
      await supabase.from('orders').delete().eq('id', newOrder.id);
      return;
    }

    console.log('✅ Orden marcada como "accepted"');

    // 6. Esperar un momento para que el trigger/función procese
    console.log('\n6️⃣ Esperando procesamiento de stock...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 7. Verificar stock actualizado
    console.log('\n7️⃣ Verificando stock después de aceptar...');
    
    const { data: updatedProduct, error: stockError } = await supabase
      .from('daily_products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    if (stockError) {
      console.error('❌ Error verificando stock:', stockError);
    } else {
      const newStock = updatedProduct.stock_quantity;
      const expectedStock = testProduct.stock_quantity - 2;
      
      console.log(`📊 RESULTADOS:`);
      console.log(`   Stock inicial: ${testProduct.stock_quantity}`);
      console.log(`   Cantidad vendida: 2`);
      console.log(`   Stock esperado: ${expectedStock}`);
      console.log(`   Stock actual: ${newStock}`);
      
      if (newStock === expectedStock) {
        console.log('🎉 ¡ÉXITO! El stock se descontó correctamente');
      } else {
        console.log('❌ FALLO: El stock NO se descontó');
        console.log('   Posibles causas:');
        console.log('   - El trigger no está configurado');
        console.log('   - La función updateProductStock tiene un bug');
        console.log('   - El frontend no llamó a la función');
      }
    }

    // 8. Limpiar (eliminar orden de prueba)
    console.log('\n8️⃣ Limpiando orden de prueba...');
    await supabase.from('order_items').delete().eq('order_id', newOrder.id);
    await supabase.from('orders').delete().eq('id', newOrder.id);
    console.log('✅ Limpieza completada');

  } catch (error) {
    console.error('❌ Error general en la prueba:', error);
  }
}

// Ejecutar prueba
testStockFix();
