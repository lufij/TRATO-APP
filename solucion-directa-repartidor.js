// SOLUCIÓN DIRECTA PARA REPARTIDORES - MARCAR RECOGIDO
// ====================================================
// Ejecutar en la consola del navegador del repartidor

// 1. FUNCIÓN SIMPLE PARA ACTUALIZAR ESTADO
window.actualizarEstadoDirecto = async function(orderId, nuevoEstado) {
  console.log(`🚚 ACTUALIZANDO ORDEN DIRECTAMENTE`);
  console.log(`   📦 Orden ID: ${orderId}`);
  console.log(`   📊 Nuevo Estado: ${nuevoEstado}`);
  
  try {
    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Usuario no autenticado');
      return false;
    }
    
    console.log(`   👤 Driver ID: ${user.id}`);
    
    // Preparar datos de actualización
    const updateData = { 
      status: nuevoEstado,
      updated_at: new Date().toISOString()
    };
    
    // Agregar campos específicos
    if (nuevoEstado === 'picked_up') {
      updateData.picked_up_at = new Date().toISOString();
    } else if (nuevoEstado === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }
    
    console.log(`   📋 Datos a actualizar:`, updateData);
    
    // Actualizar en la base de datos
    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .eq('driver_id', user.id)
      .select('*');

    if (error) {
      console.error('❌ ERROR DE BASE DE DATOS:', error);
      return false;
    }

    if (!data || data.length === 0) {
      console.error('❌ ORDEN NO ENCONTRADA O NO PERTENECE AL DRIVER');
      return false;
    }

    console.log('✅ ORDEN ACTUALIZADA EXITOSAMENTE:', data[0]);
    
    // Recargar página para ver cambios
    console.log('🔄 Recargando página...');
    window.location.reload();
    
    return true;
    
  } catch (error) {
    console.error('💥 ERROR CRÍTICO:', error);
    return false;
  }
};

// 2. FUNCIÓN PARA BUSCAR ÓRDENES DEL REPARTIDOR
window.verOrdenesRepartidor = async function() {
  console.log('🔍 BUSCANDO ÓRDENES DEL REPARTIDOR...');
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Usuario no autenticado');
      return;
    }
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('driver_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error obteniendo órdenes:', error);
      return;
    }
    
    console.log(`📦 ÓRDENES ENCONTRADAS: ${orders.length}`);
    orders.forEach((order, index) => {
      console.log(`   ${index + 1}. ID: ${order.id}`);
      console.log(`      Estado: ${order.status}`);
      console.log(`      Total: Q${order.total}`);
      console.log(`      Creado: ${order.created_at}`);
      console.log(`      ---`);
    });
    
    return orders;
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
};

// 3. INSTRUCCIONES PARA EL USUARIO
console.log('🔧 SOLUCIÓN DIRECTA PARA REPARTIDORES CARGADA');
console.log('════════════════════════════════════════════');
console.log('');
console.log('📋 COMANDOS DISPONIBLES:');
console.log('');
console.log('1️⃣ Ver tus órdenes:');
console.log('   verOrdenesRepartidor()');
console.log('');
console.log('2️⃣ Marcar orden como recogida:');
console.log('   actualizarEstadoDirecto("ORDER_ID", "picked_up")');
console.log('');
console.log('3️⃣ Marcar orden en camino:');
console.log('   actualizarEstadoDirecto("ORDER_ID", "in_transit")');
console.log('');
console.log('4️⃣ Marcar orden como entregada:');
console.log('   actualizarEstadoDirecto("ORDER_ID", "delivered")');
console.log('');
console.log('🎯 EJEMPLO COMPLETO:');
console.log('   1. verOrdenesRepartidor()');
console.log('   2. Copia el ID de la orden que quieres actualizar');
console.log('   3. actualizarEstadoDirecto("PASTE_ORDER_ID_HERE", "picked_up")');
console.log('');
console.log('⚠️  IMPORTANTE: Reemplaza ORDER_ID con el ID real de la orden');
