const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debugStockIssue() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DEL PROBLEMA DE STOCK');
  console.log('=' .repeat(50));

  try {
    // 1. Revisar órdenes de hoy con rellenitos
    console.log('\n1. 📋 ÓRDENES DE HOY CON RELLENITOS DE MANJAR:');
    const today = new Date().toISOString().split('T')[0];
    
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        created_at,
        total_amount,
        order_items (
          id,
          product_id,
          product_name,
          quantity,
          product_type,
          price_per_unit,
          total_price
        )
      `)
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('❌ Error al obtener órdenes:', ordersError);
      return;
    }

    const rellenitoOrders = orders.filter(order => 
      order.order_items?.some(item => 
        item.product_name?.toLowerCase().includes('rellenito')
      )
    );

    console.log(`📊 Total órdenes hoy: ${orders.length}`);
    console.log(`🥐 Órdenes con rellenitos: ${rellenitoOrders.length}`);

    rellenitoOrders.forEach(order => {
      console.log(`\n🔸 Orden ID: ${order.id} | Status: ${order.status}`);
      console.log(`   Creada: ${new Date(order.created_at).toLocaleString()}`);
      
      const rellenitoItems = order.order_items.filter(item => 
        item.product_name?.toLowerCase().includes('rellenito')
      );
      
      rellenitoItems.forEach(item => {
        console.log(`   - ${item.product_name}: ${item.quantity} unidades`);
        console.log(`     Product ID: ${item.product_id} | Tipo: ${item.product_type}`);
      });
    });

    // 2. Revisar stock actual de rellenitos
    console.log('\n\n2. 📦 STOCK ACTUAL DE RELLENITOS:');
    
    // Productos del día
    const { data: dailyProducts, error: dailyError } = await supabase
      .from('daily_products')
      .select('*')
      .ilike('name', '%rellenito%')
      .gte('created_at', `${today}T00:00:00`);

    if (dailyError) {
      console.error('❌ Error al obtener productos del día:', dailyError);
    } else {
      console.log(`\n📅 PRODUCTOS DEL DÍA (${dailyProducts.length} encontrados):`);
      dailyProducts.forEach(product => {
        console.log(`   - ${product.name}: ${product.stock} disponible`);
        console.log(`     ID: ${product.id} | Precio: Q${product.price}`);
        console.log(`     Creado: ${new Date(product.created_at).toLocaleString()}`);
      });
    }

    // Productos normales
    const { data: normalProducts, error: normalError } = await supabase
      .from('products')
      .select('*')
      .ilike('name', '%rellenito%');

    if (normalError) {
      console.error('❌ Error al obtener productos normales:', normalError);
    } else {
      console.log(`\n🏪 PRODUCTOS NORMALES (${normalProducts.length} encontrados):`);
      normalProducts.forEach(product => {
        console.log(`   - ${product.name}: ${product.stock} disponible`);
        console.log(`     ID: ${product.id} | Precio: Q${product.price}`);
      });
    }

    // 3. Análisis del problema
    console.log('\n\n3. 🔍 ANÁLISIS DEL PROBLEMA:');
    
    // Verificar si hay órdenes aceptadas que no descontaron stock
    const acceptedOrders = rellenitoOrders.filter(order => 
      ['accepted', 'ready', 'in_transit', 'delivered', 'completed'].includes(order.status)
    );

    console.log(`\n📈 Órdenes aceptadas: ${acceptedOrders.length}`);
    
    if (acceptedOrders.length > 0) {
      console.log('\n⚠️  POSIBLES PROBLEMAS DETECTADOS:');
      
      acceptedOrders.forEach(order => {
        const rellenitoItems = order.order_items.filter(item => 
          item.product_name?.toLowerCase().includes('rellenito')
        );
        
        rellenitoItems.forEach(item => {
          console.log(`\n🔸 Orden ${order.id} (${order.status}):`);
          console.log(`   - Producto: ${item.product_name}`);
          console.log(`   - Cantidad pedida: ${item.quantity}`);
          console.log(`   - Product ID: ${item.product_id}`);
          console.log(`   - Tipo: ${item.product_type}`);
          
          // Buscar producto correspondiente
          let correspondingProduct;
          if (item.product_type === 'daily') {
            correspondingProduct = dailyProducts.find(p => p.id === item.product_id);
          } else {
            correspondingProduct = normalProducts.find(p => p.id === item.product_id);
          }
          
          if (correspondingProduct) {
            console.log(`   - Stock actual: ${correspondingProduct.stock}`);
            if (correspondingProduct.stock >= item.quantity) {
              console.log(`   ✅ Stock suficiente - ¿Por qué no se descontó?`);
            } else {
              console.log(`   ❌ Stock insuficiente - Posible descuento ya aplicado`);
            }
          } else {
            console.log(`   ⚠️  PRODUCTO NO ENCONTRADO - PROBLEMA CRÍTICO`);
          }
        });
      });
    }

    // 4. Verificar configuración del stockManager
    console.log('\n\n4. ⚙️ VERIFICANDO CONFIGURACIÓN:');
    console.log('   - stockManager.ts debe estar importado en SellerOrderManagement.tsx');
    console.log('   - Función updateOrderStatus debe llamar stockManager.updateProductStock');
    console.log('   - Eventos de actualización deben dispararse correctamente');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

debugStockIssue();
