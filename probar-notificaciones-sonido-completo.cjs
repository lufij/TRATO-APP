// =====================================================
// SCRIPT MEJORADO: SIMULAR ORDEN CON NOTIFICACIONES DE SONIDO
// =====================================================
// Este script crea una orden real y activa las notificaciones de sonido
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

async function probarNotificacionesConSonido() {
  console.log('🔔 INICIANDO PRUEBA DE NOTIFICACIONES CON SONIDO');
  console.log('='.repeat(60));

  try {
    // 1. ENCONTRAR VENDEDOR ACTIVO
    console.log('1️⃣ Buscando vendedor para recibir notificación...');
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
    console.log(`   ID: ${vendedor.id.slice(-8)}...`);

    // 2. CREAR ORDEN QUE DISPARE NOTIFICACIÓN
    console.log('\n2️⃣ Creando orden para disparar notificación...');
    
    const nuevaOrden = {
      id: `sound-test-${Date.now()}`,
      seller_id: vendedor.id,
      buyer_id: vendedor.id, // Usar mismo ID para prueba
      customer_name: 'Cliente de Prueba Sonido',
      customer_phone: '4000-0000',
      delivery_address: 'Gualán, Zacapa - Prueba de Notificaciones',
      delivery_type: 'delivery',
      status: 'pending', // CRÍTICO: esto debe disparar la notificación
      total_amount: 199.99,
      total: 199.99,
      notes: '🔔 ORDEN DE PRUEBA PARA VERIFICAR SONIDOS DE NOTIFICACIÓN',
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
    console.log(`   Total: $${ordenCreada.total}`);
    console.log(`   Cliente: ${ordenCreada.customer_name}`);

    // 3. INSTRUCCIONES CRÍTICAS PARA EL USUARIO
    console.log('\n🎯 INSTRUCCIONES CRÍTICAS:');
    console.log('='.repeat(60));
    console.log('');
    console.log('📱 EN TU MÓVIL AHORA DEBES:');
    console.log('');
    console.log('1. ✅ Verificar que el BANNER NARANJA esté activado');
    console.log('   → Si no lo ves, refresca la página');
    console.log('   → Toca "ACTIVAR AHORA" en el banner naranja');
    console.log('   → Acepta TODOS los permisos que pida');
    console.log('');
    console.log('2. 🔔 Verificar permisos de notificación:');
    console.log('   → Configuración del navegador → Notificaciones → Permitir');
    console.log('   → Configuración del sistema → Sonidos → Activados');
    console.log('   → Volumen del sistema AL MÁXIMO');
    console.log('');
    console.log('3. 🎵 Lo que DEBES escuchar:');
    console.log('   → Múltiples BEEPS superpuestos (800-1400 Hz)');
    console.log('   → Sonido durante 2 segundos completos');
    console.log('   → Vibración: corta-larga-corta-larga-muy larga');
    console.log('');
    console.log('4. 📺 Lo que DEBES ver:');
    console.log('   → Notificación del navegador: "🛒 ¡NUEVA ORDEN RECIBIDA!"');
    console.log('   → La nueva orden aparece en tu dashboard');
    console.log('   → Indicador verde: "🔔 Notificaciones Activas"');
    console.log('');

    // 4. INFORMACIÓN DE DEBUGGING
    console.log('🔍 INFORMACIÓN DE DEBUG:');
    console.log('='.repeat(60));
    console.log('');
    console.log(`🌐 URL Local: http://localhost:5173/`);
    console.log(`📱 URL Móvil: http://192.168.1.117:5173/`);
    console.log('');
    console.log('📊 Para verificar en consola del móvil:');
    console.log('   → F12 → Console → Ejecutar:');
    console.log('   → window.testTratoNotifications()');
    console.log('');
    console.log('🎛️ Si no funciona, verifica:');
    console.log('   → Permisos de notificación: granted');
    console.log('   → Sonidos del sistema activados');
    console.log('   → App en primer plano al momento de la prueba');
    console.log('   → Browser no está en modo silencioso');
    console.log('');

    // 5. ESPERAR Y LUEGO LIMPIAR (OPCIONAL)
    console.log('⏳ Esperando 30 segundos antes de limpiar...');
    console.log('   (Cancela con Ctrl+C si quieres mantener la orden)');
    
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Limpiar orden de prueba
    console.log('\n🧹 Limpiando orden de prueba...');
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', ordenCreada.id);

    if (deleteError) {
      console.log('⚠️ Error eliminando orden de prueba:', deleteError);
    } else {
      console.log('✅ Orden de prueba eliminada correctamente');
    }

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  }

  console.log('\n🎉 PRUEBA COMPLETADA');
  console.log('');
  console.log('💡 Si no escuchaste sonidos:');
  console.log('   1. Revisa el banner naranja y actívalo');
  console.log('   2. Verifica volumen y permisos del móvil');
  console.log('   3. Ejecuta: window.testTratoNotifications() en consola');
  console.log('   4. Contacta soporte si persiste el problema');
}

// Ejecutar prueba
probarNotificacionesConSonido()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error crítico en el script:', error);
    process.exit(1);
  });
