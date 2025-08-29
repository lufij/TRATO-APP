console.log('🧪 Probando sistema de descuento automático de stock...');

// Simular el flujo:
// 1. Vendedor acepta orden
// 2. Stock se descuenta automáticamente 
// 3. Frontend se actualiza en tiempo real

import { supabase } from './utils/supabase/client.js';

async function testStockSystem() {
  try {
    console.log('📋 1. Verificando productos del día con stock...');
    
    const { data: products, error } = await supabase
      .from('daily_products')
      .select('id, name, stock_quantity, seller_id')
      .gt('stock_quantity', 0)
      .limit(3);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('📦 Productos encontrados:', products?.map(p => 
      `${p.name} (Stock: ${p.stock_quantity})`
    ));

    if (!products || products.length === 0) {
      console.log('⚠️ No hay productos del día con stock para probar');
      return;
    }

    // Simular una orden con estos productos
    console.log('\n📋 2. Simulando orden con descuento automático...');
    
    const testProduct = products[0];
    const orderItems = [{
      product_id: testProduct.id,
      daily_product_id: testProduct.id,
      quantity: 2,
      product_name: testProduct.name,
      product_type: 'daily'
    }];

    console.log('🛒 Items de prueba:', orderItems);
    
    // Importar el stockManager dinámicamente
    const { updateProductStock } = await import('./utils/stockManager.ts');
    
    console.log('\n🔄 3. Ejecutando descuento de stock...');
    const result = await updateProductStock(orderItems, 'test-order-123');
    
    console.log('\n📊 4. Resultado:', result);
    
    if (result.success) {
      console.log('✅ ¡Stock descontado exitosamente!');
      console.log('📝 Productos actualizados:', result.updatedProducts);
      
      // Verificar el stock actualizado
      const { data: updatedProduct } = await supabase
        .from('daily_products')
        .select('name, stock_quantity')
        .eq('id', testProduct.id)
        .single();
        
      console.log(`📦 ${testProduct.name}: ${testProduct.stock_quantity} → ${updatedProduct?.stock_quantity}`);
    } else {
      console.log('❌ Error en descuento:', result.message);
    }

  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

testStockSystem();
