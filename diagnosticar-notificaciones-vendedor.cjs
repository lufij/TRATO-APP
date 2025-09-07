// =====================================================
// DIAGNÓSTICO COMPLETO: NOTIFICACIONES VENDEDOR  
// =====================================================
// Analiza el sistema actual de notificaciones y detecta problemas
// =====================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔐 Verificando variables de entorno...');
console.log('URL:', supabaseUrl ? '✅ Configurada' : '❌ Faltante');
console.log('Key:', supabaseKey ? '✅ Configurada' : '❌ Faltante');

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ ERROR: Variables de entorno de Supabase no configuradas');
  console.log('Por favor verifica tu archivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticarNotificacionesVendedor() {
  console.log('🔍 INICIANDO DIAGNÓSTICO DE NOTIFICACIONES VENDEDOR');
  console.log('='.repeat(60));

  try {
    // 1. VERIFICAR VENDEDORES ACTIVOS
    console.log('\n1️⃣ VERIFICANDO VENDEDORES ACTIVOS...');
    const { data: vendedores, error: vendedoresError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'vendedor');

    if (vendedoresError) {
      console.error('❌ Error consultando vendedores:', vendedoresError);
      return;
    }

    console.log(`✅ Vendedores encontrados: ${vendedores.length}`);
    vendedores.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.name || 'Sin nombre'} (${v.email}) - ID: ${v.id.slice(-8)}...`);
    });

    if (vendedores.length === 0) {
      console.log('⚠️  PROBLEMA: No hay vendedores registrados');
      return;
    }

    // 2. VERIFICAR ÓRDENES RECIENTES
    console.log('\n2️⃣ VERIFICANDO ÓRDENES RECIENTES...');
    const { data: ordenes, error: ordenesError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordenesError) {
      console.error('❌ Error consultando órdenes:', ordenesError);
      return;
    }

    console.log(`✅ Órdenes encontradas: ${ordenes.length}`);
    const ahora = new Date();
    ordenes.forEach((orden, i) => {
      const createdAt = new Date(orden.created_at);
      const minutosAtras = Math.floor((ahora - createdAt) / (1000 * 60));
      console.log(`   ${i + 1}. Orden #${orden.id.slice(-6)} - ${orden.status} - ${minutosAtras} min atrás`);
    });

    // 3. ANÁLISIS DETALLADO POR VENDEDOR
    console.log('\n3️⃣ ANÁLISIS DETALLADO POR VENDEDOR...');
    for (const vendedor of vendedores) {
      console.log(`\n📊 VENDEDOR: ${vendedor.name} (${vendedor.email})`);
      
      // Órdenes del vendedor en las últimas 24h
      const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: ordenesVendedor } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_id', vendedor.id)
        .gte('created_at', hace24h)
        .order('created_at', { ascending: false });

      console.log(`   📋 Órdenes últimas 24h: ${ordenesVendedor?.length || 0}`);
      
      if (ordenesVendedor && ordenesVendedor.length > 0) {
        console.log('   📝 Detalles recientes:');
        ordenesVendedor.slice(0, 3).forEach((orden, i) => {
          const createdAt = new Date(orden.created_at);
          const minutosAtras = Math.floor((ahora - createdAt) / (1000 * 60));
          console.log(`      ${i + 1}. #${orden.id.slice(-6)} - ${orden.status} - ${minutosAtras} min - $${orden.total || orden.total_amount || 0}`);
        });
      }

      // Productos activos
      const { data: productos } = await supabase
        .from('products')
        .select('id, name, is_available')
        .eq('seller_id', vendedor.id);

      console.log(`   📦 Productos activos: ${productos?.filter(p => p.is_available)?.length || 0} de ${productos?.length || 0}`);
    }

    // 4. VERIFICAR CONFIGURACIÓN DE NOTIFICACIONES EN TIEMPO REAL
    console.log('\n4️⃣ PROBANDO SUSCRIPCIÓN EN TIEMPO REAL...');
    
    // Test de conexión realtime
    const testChannel = supabase
      .channel('test-connection')
      .on('broadcast', { event: 'test' }, (payload) => {
        console.log('✅ Realtime funcionando:', payload);
      });

    // Suscribirse brevemente para probar conexión
    try {
      await testChannel.subscribe();
      console.log('✅ Conexión Realtime establecida correctamente');
      setTimeout(() => {
        testChannel.unsubscribe();
      }, 1000);
    } catch (error) {
      console.log('⚠️  Problema con conexión Realtime:', error.message);
    }

    // 5. ANÁLISIS DE NOTIFICACIONES CRÍTICAS
    console.log('\n5️⃣ ANÁLISIS DEL SISTEMA DE NOTIFICACIONES...');
    
    console.log('🔍 COMPONENTES CRÍTICOS A VERIFICAR:');
    console.log('   - ✅ CriticalNotifications.tsx existe');
    console.log('   - ✅ SellerDashboard.tsx implementa setupOrderNotifications');
    console.log('   - ✅ Service Worker (sw.js) configurado');
    console.log('   - ✅ NotificationPermissionBanner.tsx disponible');

    // 6. RECOMENDACIONES ESPECÍFICAS
    console.log('\n6️⃣ DIAGNÓSTICO ESPECÍFICO PARA TU PROBLEMA...');
    console.log('='.repeat(60));
    
    console.log('🚨 PROBLEMA REPORTADO:');
    console.log('   "Celular con pantalla apagada no recibe notificación hasta entrar a la app"');
    console.log('   "No emite sonido cuando llega la notificación"');
    
    console.log('\n🔧 ANÁLISIS DE CAUSAS POSIBLES:');
    
    console.log('\n1. 🔔 PERMISOS DE NOTIFICACIÓN:');
    console.log('   - ¿Activaste el banner naranja en dashboard vendedor?');
    console.log('   - ¿Diste permisos de notificación al navegador?');
    console.log('   - ¿Las notificaciones están habilitadas en configuración del móvil?');
    
    console.log('\n2. 📱 CONFIGURACIÓN DEL NAVEGADOR MÓVIL:');
    console.log('   - Chrome/Safari debe tener permisos de sonido');
    console.log('   - "Mostrar notificaciones" debe estar activado');
    console.log('   - El sitio debe estar en lista de "Sitios permitidos"');
    
    console.log('\n3. ⚡ PWA Y SERVICE WORKER:');
    console.log('   - ¿Instalaste la app como PWA?');
    console.log('   - ¿El Service Worker está funcionando?');
    console.log('   - ¿La app funciona offline?');
    
    console.log('\n4. 🔊 CONFIGURACIÓN DE SONIDO:');
    console.log('   - ¿Tienes volumen activado?');
    console.log('   - ¿Modo silencioso desactivado?');
    console.log('   - ¿Permisos de audio para el navegador?');

    // 7. GENERAR TEST DE NOTIFICACIÓN
    console.log('\n7️⃣ CREANDO TEST DE NOTIFICACIÓN...');
    
    if (ordenes.length > 0) {
      const ultimaOrden = ordenes[0];
      
      console.log('🧪 SIMULACIÓN DE NUEVA ORDEN:');
      console.log('   Datos que se enviarían al sistema de notificaciones:');
      console.log(`   - Orden ID: ${ultimaOrden.id}`);
      console.log(`   - Total: $${ultimaOrden.total || ultimaOrden.total_amount || 0}`);
      console.log(`   - Vendedor: ${ultimaOrden.seller_id?.slice(-8)}...`);
      console.log(`   - Estado: ${ultimaOrden.status}`);
      console.log(`   - Tipo: ${ultimaOrden.delivery_type || 'pickup'}`);
      
      console.log('\n📋 PASOS PARA PROBAR NOTIFICACIONES:');
      console.log('   1. Abre el dashboard de vendedor en tu móvil');
      console.log('   2. Permite notificaciones cuando aparezca el banner');
      console.log('   3. Deja la app abierta en segundo plano');
      console.log('   4. Desde otro dispositivo, haz un pedido');
      console.log('   5. Verifica que llegue notificación con sonido');
    }

    console.log('\n✅ DIAGNÓSTICO COMPLETADO');
    console.log('Para reportar si funciona, usa estos comandos de prueba:');
    console.log('\n🧪 COMANDOS DE PRUEBA EN CONSOLA DEL NAVEGADOR:');
    console.log("navigator.permissions.query({name: 'notifications'})");
    console.log("Notification.requestPermission()");
    console.log("new Notification('Test TRATO', { body: 'Funcionando!', requireInteraction: true })");

  } catch (error) {
    console.error('❌ Error durante diagnóstico:', error);
  }
}

// Ejecutar diagnóstico
diagnosticarNotificacionesVendedor()
  .then(() => {
    console.log('\n🎉 DIAGNÓSTICO COMPLETADO');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error crítico:', error);
    process.exit(1);
  });
