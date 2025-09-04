const { createClient } = require('@supabase/supabase-js');

// DIAGNÓSTICO COMPLETO DEL SISTEMA DE NOTIFICACIONES
console.log('🔍 DIAGNÓSTICO DEL SISTEMA DE NOTIFICACIONES - TRATO APP');
console.log('='.repeat(60));

async function diagnosticNotifications() {
  try {
    // 1. Verificar variables de entorno
    console.log('\n1️⃣ VERIFICANDO CONFIGURACIÓN DE SUPABASE...');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Variables de entorno faltantes:');
      console.log('   SUPABASE_URL:', supabaseUrl ? '✅ Configurada' : '❌ Faltante');
      console.log('   SUPABASE_KEY:', supabaseKey ? '✅ Configurada' : '❌ Faltante');
      return;
    }
    
    console.log('✅ Variables de entorno configuradas correctamente');
    console.log('   URL:', supabaseUrl.substring(0, 30) + '...');
    
    // 2. Probar conexión con Supabase
    console.log('\n2️⃣ PROBANDO CONEXIÓN CON SUPABASE...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 3. Verificar tablas necesarias
    console.log('\n3️⃣ VERIFICANDO TABLAS NECESARIAS...');
    
    const tables = ['orders', 'notifications', 'users'];
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          console.log(`❌ Tabla '${table}': ${error.message}`);
        } else {
          console.log(`✅ Tabla '${table}': Accesible`);
        }
      } catch (err) {
        console.log(`❌ Tabla '${table}': Error de conexión`);
      }
    }
    
    // 4. Verificar Realtime
    console.log('\n4️⃣ VERIFICANDO REALTIME...');
    try {
      const channel = supabase.channel('test-realtime')
        .on('broadcast', { event: 'test' }, () => {
          console.log('✅ Realtime: Funcional');
        })
        .subscribe((status) => {
          console.log('📡 Realtime Status:', status);
        });
      
      // Cleanup
      setTimeout(() => {
        supabase.removeChannel(channel);
      }, 2000);
    } catch (err) {
      console.log('❌ Realtime: Error -', err.message);
    }
    
    // 5. Verificar datos de prueba
    console.log('\n5️⃣ VERIFICANDO DATOS EXISTENTES...');
    
    // Órdenes recientes
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, status, created_at, seller_id, buyer_id')
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (error) {
        console.log('❌ Error al obtener órdenes:', error.message);
      } else {
        console.log(`📦 Órdenes encontradas: ${orders.length}`);
        orders.forEach((order, i) => {
          console.log(`   ${i+1}. ${order.id.substring(0, 8)}... - ${order.status} (${new Date(order.created_at).toLocaleString()})`);
        });
      }
    } catch (err) {
      console.log('❌ Error al verificar órdenes:', err.message);
    }
    
    // Usuarios activos
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, role')
        .limit(10);
        
      if (error) {
        console.log('❌ Error al obtener usuarios:', error.message);
      } else {
        console.log(`👥 Usuarios encontrados: ${users.length}`);
        const roles = users.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {});
        console.log('   Roles:', roles);
      }
    } catch (err) {
      console.log('❌ Error al verificar usuarios:', err.message);
    }
    
    // 6. Probar notificaciones
    console.log('\n6️⃣ PROBANDO SISTEMA DE NOTIFICACIONES...');
    
    try {
      const testNotification = {
        recipient_id: '00000000-0000-0000-0000-000000000000', // UUID de prueba
        type: 'test',
        title: 'Prueba de Sistema',
        message: 'Esta es una notificación de prueba del sistema',
        data: { test: true, timestamp: new Date().toISOString() }
      };
      
      const { data, error } = await supabase
        .from('notifications')
        .insert([testNotification])
        .select();
        
      if (error) {
        console.log('❌ Error al crear notificación de prueba:', error.message);
      } else {
        console.log('✅ Notificación de prueba creada exitosamente');
        
        // Limpiar la notificación de prueba
        if (data && data[0]) {
          await supabase
            .from('notifications')
            .delete()
            .eq('id', data[0].id);
          console.log('🧹 Notificación de prueba eliminada');
        }
      }
    } catch (err) {
      console.log('❌ Error en prueba de notificaciones:', err.message);
    }
    
    // 7. Verificar funciones RPC
    console.log('\n7️⃣ VERIFICANDO FUNCIONES RPC...');
    
    const rpcFunctions = [
      'update_order_status',
      'assign_driver_to_order',
      'get_available_deliveries'
    ];
    
    for (const funcName of rpcFunctions) {
      try {
        // Solo verificar que la función existe, no ejecutarla
        const { error } = await supabase.rpc(funcName, {});
        if (error && !error.message.includes('missing')) {
          console.log(`✅ Función '${funcName}': Existe`);
        } else if (error && error.message.includes('missing')) {
          console.log(`❌ Función '${funcName}': Faltan parámetros (pero existe)`);
        } else {
          console.log(`✅ Función '${funcName}': Funcional`);
        }
      } catch (err) {
        console.log(`❌ Función '${funcName}': No existe`);
      }
    }
    
  } catch (error) {
    console.log('💥 ERROR GENERAL:', error.message);
  }
}

// Verificar capacidades del navegador (simulado en Node)
console.log('\n8️⃣ CAPACIDADES REQUERIDAS...');
console.log('🌐 En el navegador se requiere:');
console.log('   ✅ HTTPS (para notificaciones push)');
console.log('   ✅ Notification API');
console.log('   ✅ Web Audio API (para sonidos)');
console.log('   ✅ Service Workers (para notificaciones en segundo plano)');

diagnosticNotifications().then(() => {
  console.log('\n' + '='.repeat(60));
  console.log('🏁 DIAGNÓSTICO COMPLETADO');
  console.log('\n📋 PASOS RECOMENDADOS:');
  console.log('1. Verificar que tu app esté en HTTPS');
  console.log('2. Activar Realtime en Supabase Dashboard');
  console.log('3. Asegurar permisos de notificación en el navegador');
  console.log('4. Verificar que no haya bloqueadores de popup/notificaciones');
  console.log('5. Comprobar que el audio no esté silenciado');
  process.exit(0);
}).catch(err => {
  console.error('💥 Error en diagnóstico:', err);
  process.exit(1);
});
