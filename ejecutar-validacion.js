import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pqmjfpucqpcgzxcbczat.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxbWpmcHVjcXBjZ3p4Y2JjemF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NzAzNzUsImV4cCI6MjA1MDE0NjM3NX0.K1qBQUWOXRjJqKP_LYpKgLPHj8LplOvlN6SbJmh6_pQ'
);

async function validarSistema() {
  try {
    console.log('🚀 EJECUTANDO VALIDACIÓN DEL SISTEMA DE ENTREGA...\n');
    
    // 1. Obtener todas las órdenes
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*');
      
    if (error) {
      console.error('❌ Error obteniendo órdenes:', error);
      return;
    }
    
    console.log(`📊 Total de órdenes encontradas: ${orders.length}\n`);
    
    // 2. Distribución por tipo de entrega
    console.log('🚀 DISTRIBUCIÓN DE TIPOS DE ENTREGA:');
    const byType = {};
    orders.forEach(order => {
      const type = order.delivery_type || 'sin_tipo';
      byType[type] = (byType[type] || 0) + 1;
    });
    
    Object.entries(byType).forEach(([type, count]) => {
      const percent = ((count / orders.length) * 100).toFixed(1);
      console.log(`   ${type}: ${count} órdenes (${percent}%)`);
    });
    console.log('');
    
    // 3. Análisis por tipo de entrega
    console.log('🎯 ANÁLISIS POR TIPO DE ENTREGA:');
    Object.keys(byType).forEach(type => {
      if (type === 'sin_tipo') return;
      
      const ordersOfType = orders.filter(o => o.delivery_type === type);
      const withDriver = ordersOfType.filter(o => o.driver_id).length;
      const withoutDriver = ordersOfType.length - withDriver;
      const expected = type === 'delivery' ? 'Debe tener repartidor' : 'NO debe tener repartidor';
      
      console.log(`   ${type}:`);
      console.log(`     Total: ${ordersOfType.length}`);
      console.log(`     Con repartidor: ${withDriver}`);
      console.log(`     Sin repartidor: ${withoutDriver}`);
      console.log(`     Esperado: ${expected}`);
      console.log('');
    });
    
    // 4. Órdenes listas para entrega (solo delivery)
    const readyDeliveries = orders.filter(order => 
      order.status === 'ready' && 
      order.delivery_type === 'delivery'
    );
    
    console.log('📦 ÓRDENES LISTAS PARA ENTREGA (solo delivery):');
    if (readyDeliveries.length === 0) {
      console.log('   No hay órdenes delivery en estado "ready"');
    } else {
      readyDeliveries.slice(0, 5).forEach(order => {
        const disponibilidad = order.driver_id ? 'Asignado' : 'Disponible';
        console.log(`   ${order.id.slice(0,8)} - ${order.customer_name} - Q${order.total} - ${disponibilidad}`);
      });
    }
    console.log('');
    
    // 5. Verificar órdenes problemáticas
    const problemOrders = orders.filter(order => 
      ['pickup', 'dine-in'].includes(order.delivery_type) && order.driver_id
    );
    
    console.log('⚠️ PROBLEMA: Órdenes pickup/dine-in con repartidor asignado:');
    if (problemOrders.length === 0) {
      console.log('   ✅ No hay problemas - Correcto!');
    } else {
      console.log(`   🔴 ENCONTRADOS ${problemOrders.length} problemas:`);
      problemOrders.forEach(order => {
        console.log(`     ${order.id.slice(0,8)} - ${order.delivery_type} - Repartidor: ${order.driver_id}`);
      });
    }
    console.log('');
    
    // 6. Resumen ejecutivo
    console.log('📊 RESUMEN EJECUTIVO:');
    const stats = {
      total: orders.length,
      delivery: orders.filter(o => o.delivery_type === 'delivery').length,
      pickup: orders.filter(o => o.delivery_type === 'pickup').length,
      dinein: orders.filter(o => o.delivery_type === 'dine-in').length,
      sinTipo: orders.filter(o => !o.delivery_type).length,
      deliveryConRepartidor: orders.filter(o => o.delivery_type === 'delivery' && o.driver_id).length,
      problemaRepartidor: problemOrders.length
    };
    
    console.log(`   Total órdenes: ${stats.total}`);
    console.log(`   Entregas domicilio: ${stats.delivery}`);
    console.log(`   Recoger tienda: ${stats.pickup}`);
    console.log(`   Comer en lugar: ${stats.dinein}`);
    console.log(`   Sin tipo: ${stats.sinTipo}`);
    console.log(`   Delivery con repartidor: ${stats.deliveryConRepartidor}`);
    console.log(`   Problema repartidor innecesario: ${stats.problemaRepartidor}`);
    console.log('');
    
    // 7. Validación final
    console.log('✅ VALIDACIÓN FINAL:');
    if (stats.problemaRepartidor === 0) {
      console.log('   🟢 CORRECTO: No hay pickup/dine-in con repartidor');
    } else {
      console.log(`   🔴 ERROR: ${stats.problemaRepartidor} órdenes tienen repartidor innecesario`);
    }
    
    const readyDeliveryCount = orders.filter(o => 
      o.delivery_type === 'delivery' && 
      o.status === 'ready' && 
      !o.driver_id
    ).length;
    
    if (readyDeliveryCount > 0) {
      console.log('   🟢 CORRECTO: Hay órdenes delivery disponibles para repartidores');
    } else {
      console.log('   🟡 INFO: No hay órdenes delivery pendientes');
    }
    
    console.log('\n🎉 VALIDACIÓN COMPLETADA!');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

validarSistema();
