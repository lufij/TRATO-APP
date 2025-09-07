// =====================================================
// SCRIPT DE PRUEBA: SIMULAR NUEVA ORDEN PARA NOTIFICACIONES  
// =====================================================
// Este script simula una nueva orden para probar notificaciones
// =====================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ ERROR: Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function simularNuevaOrdenConNotificacion() {
  console.log('🧪 INICIANDO SIMULACIÓN DE NUEVA ORDEN PARA NOTIFICACIONES');
  console.log('='.repeat(60));

  try {
    // 1. BUSCAR VENDEDOR ACTIVO
    console.log('1️⃣ Buscando vendedor activo...');
    const { data: vendedores, error: vendedoresError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'vendedor')
      .limit(1);

    if (vendedoresError || !vendedores || vendedores.length === 0) {
      console.log('❌ No se encontraron vendedores:', vendedoresError);
      return;
    }

    const vendedor = vendedores[0];
    console.log(`✅ Vendedor encontrado: ${vendedor.name || vendedor.email}`);

    // 2. BUSCAR COMPRADOR (o crear uno simulado)
    console.log('2️⃣ Buscando comprador...');
    const { data: compradores, error: compradoresError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'comprador')
      .limit(1);

    let comprador;
    if (!compradores || compradores.length === 0) {
      console.log('⚠️  No hay compradores, usando vendedor como comprador para prueba');
      comprador = vendedor;
    } else {
      comprador = compradores[0];
    }

    console.log(`✅ Comprador: ${comprador.name || comprador.email}`);

    // 3. CREAR ORDEN DE PRUEBA
    console.log('3️⃣ Creando orden de prueba...');
    
    const nuevaOrden = {
      id: `test-${Date.now()}`,
      seller_id: vendedor.id,
      buyer_id: comprador.id,
      customer_name: comprador.name || 'Cliente Prueba',
      customer_phone: '1234-5678',
      delivery_address: 'Gualán, Zacapa - Dirección de prueba',
      delivery_type: 'delivery',
      status: 'pending', // IMPORTANTE: este status dispara el trigger
      total_amount: 125.50,
      total: 125.50,
      notes: 'Orden de prueba para verificar notificaciones con sonido',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: ordenCreada, error: ordenError } = await supabase
      .from('orders')
      .insert([nuevaOrden])
      .select()
      .single();

    if (ordenError) {
      console.log('❌ Error creando orden:', ordenError);
      return;
    }

    console.log('✅ Orden creada exitosamente:');
    console.log(`   ID: ${ordenCreada.id}`);
    console.log(`   Vendedor: ${ordenCreada.seller_id.slice(-8)}...`);
    console.log(`   Total: $${ordenCreada.total}`);
    console.log(`   Estado: ${ordenCreada.status}`);

    // 4. VERIFICAR QUE SE CREÓ LA NOTIFICACIÓN PUSH
    console.log('4️⃣ Verificando notificación push creada...');
    
    // Esperar un momento para que el trigger funcione
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { data: notificaciones, error: notificacionesError } = await supabase
      .from('push_notifications_queue')
      .select('*')
      .eq('user_id', vendedor.id)
      .order('created_at', { ascending: false })
      .limit(3);

    if (notificacionesError) {
      console.log('⚠️  Error verificando notificaciones:', notificacionesError);
    } else if (notificaciones && notificaciones.length > 0) {
      console.log('✅ Notificaciones push encontradas:');
      notificaciones.forEach((notif, i) => {
        console.log(`   ${i + 1}. ${notif.title} - ${notif.body}`);
        console.log(`      Tipo: ${notif.type} | Prioridad: ${notif.priority}`);
        console.log(`      Enviada: ${notif.sent ? 'Sí' : 'Pendiente'}`);
      });
    } else {
      console.log('⚠️  No se encontraron notificaciones push (puede ser normal si el trigger no está activo)');
    }

    // 5. INSTRUCCIONES PARA EL USUARIO
    console.log('\n5️⃣ INSTRUCCIONES PARA PROBAR NOTIFICACIÓN:');
    console.log('='.repeat(60));
    console.log('🎯 AHORA DEBES:');
    console.log('   1. Abrir tu dashboard de vendedor en el móvil');
    console.log('   2. Verificar que aparezca la nueva orden');
    console.log('   3. Debe haber sonado notificación crítica (triple beep)');
    console.log('   4. Debe haber aparecido notificación del navegador');

    console.log('\n🔍 VERIFICAR EN MÓVIL:');
    console.log('   - ¿Sonó el triple beep ascendente?');
    console.log('   - ¿Vibró el móvil con patrón largo-corto-largo?');
    console.log('   - ¿Apareció notificación incluso con pantalla apagada?');
    console.log('   - ¿Se ve la nueva orden en el dashboard?');

    console.log('\n🧪 PRUEBA ADICIONAL:');
    console.log('   En consola del navegador móvil ejecuta:');
    console.log('   window.testTratoNotifications()');

    // 6. LIMPIAR ORDEN DE PRUEBA (opcional)
    console.log('\n6️⃣ Limpieza...');
    const limpiarPrueba = process.argv.includes('--limpiar');
    
    if (limpiarPrueba) {
      console.log('🧹 Eliminando orden de prueba...');
      
      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .eq('id', ordenCreada.id);

      if (deleteError) {
        console.log('⚠️  Error eliminando orden de prueba:', deleteError);
      } else {
        console.log('✅ Orden de prueba eliminada');
      }
    } else {
      console.log('💡 Para limpiar la orden de prueba, ejecuta con --limpiar');
    }

    console.log('\n🎉 SIMULACIÓN COMPLETADA');
    console.log('Si no funcionó, revisa:');
    console.log('1. Que esté ejecutado el SQL de configuración');
    console.log('2. Que el banner naranja esté activado en móvil');
    console.log('3. Que tengas permisos de notificación');

  } catch (error) {
    console.error('❌ Error durante simulación:', error);
  }
}

// Ejecutar simulación
simularNuevaOrdenConNotificacion()
  .then(() => {
    console.log('\n✅ Script completado - Verifica tu móvil');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error crítico:', error);
    process.exit(1);
  });
