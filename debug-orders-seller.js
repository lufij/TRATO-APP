import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://gnbruemdcwtvgpxgcqhy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduYnJ1ZW1kY3d0dmdweGdjcWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwMDQ1ODYsImV4cCI6MjA1MDU4MDU4Nn0.vZrnOhWXlvPtaQcGh7u7YJQJcTQNdGGJ-iC3gJnLdFo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSellerOrders() {
  try {
    console.log('🔍 Verificando órdenes en la base de datos...\n');
    
    // Obtener todas las órdenes
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        buyer_id,
        seller_id,
        status,
        delivery_method,
        delivery_address,
        total,
        created_at,
        users!orders_buyer_id_fkey (
          name,
          phone
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) {
      console.error('❌ Error al obtener órdenes:', ordersError);
      return;
    }

    if (!orders || orders.length === 0) {
      console.log('⚠️ No se encontraron órdenes en la base de datos');
      return;
    }

    console.log(`📊 Se encontraron ${orders.length} órdenes:\n`);
    
    orders.forEach((order, index) => {
      console.log(`📦 Orden ${index + 1}:`);
      console.log(`   ID: ${order.id}`);
      console.log(`   Número: ${order.order_number}`);
      console.log(`   Comprador: ${order.users?.name || 'Sin nombre'} (ID: ${order.buyer_id})`);
      console.log(`   Vendedor ID: ${order.seller_id}`);
      console.log(`   Estado: ${order.status}`);
      console.log(`   Método de entrega: ${order.delivery_method || 'NO ESPECIFICADO'}`);
      console.log(`   Dirección: ${order.delivery_address || 'N/A'}`);
      console.log(`   Total: Q${order.total}`);
      console.log(`   Fecha: ${new Date(order.created_at).toLocaleString('es-GT')}`);
      console.log('   ---');
    });

    // Estadísticas
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    const deliveryMethodCounts = orders.reduce((acc, order) => {
      const method = order.delivery_method || 'no_especificado';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📈 Estadísticas:');
    console.log('Estados de órdenes:', statusCounts);
    console.log('Métodos de entrega:', deliveryMethodCounts);

    // Verificar si hay órdenes pendientes
    const pendingOrders = orders.filter(order => order.status === 'pending');
    console.log(`\n⏳ Órdenes pendientes: ${pendingOrders.length}`);
    
    // Verificar si hay órdenes de entrega a domicilio
    const deliveryOrders = orders.filter(order => order.delivery_method === 'delivery');
    console.log(`🚚 Órdenes de entrega a domicilio: ${deliveryOrders.length}`);

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

// Ejecutar el script
debugSellerOrders();
