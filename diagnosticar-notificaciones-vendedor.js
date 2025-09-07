// =====================================================
// DIAGNÓSTICO COMPLETO: NOTIFICACIONES VENDEDOR
// =====================================================
// Analiza el sistema actual de notificaciones y detecta problemas
// =====================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
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
      console.log(`   ${i + 1}. ${v.name || 'Sin nombre'} (${v.email}) - ID: ${v.id}`);
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
      console.log(`   ${i + 1}. Orden #${orden.id.slice(-6)} - ${orden.status} - ${minutosAtras} min atrás - Vendedor: ${orden.seller_id?.slice(-6) || 'N/A'}`);
    });

    // 3. ANÁLISIS POR VENDEDOR
    console.log('\n3️⃣ ANÁLISIS DETALLADO POR VENDEDOR...');
    for (const vendedor of vendedores) {
      console.log(`\n📊 VENDEDOR: ${vendedor.name} (${vendedor.id.slice(-6)}...)`);
      
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
        console.log('   📝 Detalles:');
        ordenesVendedor.forEach((orden, i) => {
          const createdAt = new Date(orden.created_at);
          const minutosAtras = Math.floor((ahora - createdAt) / (1000 * 60));
          console.log(`      ${i + 1}. #${orden.id.slice(-6)} - ${orden.status} - ${minutosAtras} min - $${orden.total || 0}`);
        });
      } else {
        console.log('   ⚠️  Sin órdenes recientes - No hay actividad para probar notificaciones');
      }

      // Productos activos
      const { data: productos } = await supabase
        .from('products')
        .select('id, name, is_available')
        .eq('seller_id', vendedor.id);

      console.log(`   📦 Productos activos: ${productos?.filter(p => p.is_available)?.length || 0} de ${productos?.length || 0}`);
    }

    // 4. VERIFICAR SUSCRIPCIONES REALTIME
    console.log('\n4️⃣ VERIFICANDO CONFIGURACIÓN SUPABASE REALTIME...');
    
    // Verificar si las tablas tienen RLS habilitado
    const { data: tablesInfo, error: tablesError } = await supabase
      .rpc('show_tables_with_rls');

    if (tablesError) {
      console.log('⚠️  No se pudo verificar RLS automáticamente');
    } else if (tablesInfo) {
      console.log('✅ Información de tablas obtenida');
    }

    // 5. SIMULAR ORDEN DE PRUEBA
    console.log('\n5️⃣ ANÁLISIS DE ÚLTIMA ORDEN PARA NOTIFICACIONES...');
    
    if (ordenes.length > 0) {
      const ultimaOrden = ordenes[0];
      console.log('🔍 ÚLTIMA ORDEN DETECTADA:');
      console.log(`   ID: ${ultimaOrden.id}`);
      console.log(`   Estado: ${ultimaOrden.status}`);
      console.log(`   Vendedor ID: ${ultimaOrden.seller_id}`);
      console.log(`   Comprador ID: ${ultimaOrden.buyer_id}`);
      console.log(`   Total: $${ultimaOrden.total || ultimaOrden.total_amount || 0}`);
      console.log(`   Creada: ${new Date(ultimaOrden.created_at).toLocaleString()}`);
      console.log(`   Tipo entrega: ${ultimaOrden.delivery_type || 'N/A'}`);
      
      // Verificar si el vendedor existe
      const vendedorOrden = vendedores.find(v => v.id === ultimaOrden.seller_id);
      if (vendedorOrden) {
        console.log(`   ✅ Vendedor válido: ${vendedorOrden.name}`);
      } else {
        console.log(`   ❌ PROBLEMA: Vendedor no encontrado en usuarios`);
      }

      // Verificar comprador
      const { data: comprador } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', ultimaOrden.buyer_id)
        .single();

      if (comprador) {
        console.log(`   ✅ Comprador válido: ${comprador.name || comprador.email}`);
      } else {
        console.log(`   ❌ PROBLEMA: Comprador no encontrado`);
      }
    }

    // 6. DIAGNÓSTICO FINAL Y RECOMENDACIONES
    console.log('\n6️⃣ DIAGNÓSTICO FINAL');
    console.log('='.repeat(60));
    
    console.log('📋 RESUMEN DE PROBLEMAS DETECTADOS:');
    
    let problemasDetectados = [];
    
    if (vendedores.length === 0) {
      problemasDetectados.push('❌ No hay vendedores registrados');
    }
    
    if (ordenes.length === 0) {
      problemasDetectados.push('❌ No hay órdenes en el sistema');
    }
    
    const ordenesRecientes = ordenes.filter(o => {
      const createdAt = new Date(o.created_at);
      const minutosAtras = (ahora - createdAt) / (1000 * 60);
      return minutosAtras < 60; // Últimas 1 hora
    });
    
    if (ordenesRecientes.length === 0) {
      problemasDetectados.push('⚠️  No hay órdenes recientes (última hora) para probar notificaciones');
    }

    if (problemasDetectados.length === 0) {
      console.log('✅ SISTEMA LISTO PARA NOTIFICACIONES');
      console.log('   - Vendedores activos detectados');
      console.log('   - Órdenes recientes disponibles');
      console.log('   - Base de datos funcionando correctamente');
      
      console.log('\n🔧 PRÓXIMOS PASOS PARA ACTIVAR NOTIFICACIONES:');
      console.log('   1. Abrir dashboard de vendedor en navegador');
      console.log('   2. Verificar que aparece banner de notificaciones');
      console.log('   3. Hacer clic en "Activar Notificaciones"');
      console.log('   4. Permitir notificaciones del navegador');
      console.log('   5. Hacer pedido de prueba desde otro dispositivo');
    } else {
      console.log('⚠️  PROBLEMAS DETECTADOS:');
      problemasDetectados.forEach(problema => {
        console.log(`   ${problema}`);
      });
    }

    console.log('\n📱 VERIFICAR EN NAVEGADOR:');
    console.log('   - ¿Aparece el banner naranja de notificaciones?');
    console.log('   - ¿Se solicitan permisos automáticamente?');
    console.log('   - ¿Funciona el componente CriticalNotifications?');
    console.log('   - ¿Se reproduce sonido al hacer evento de prueba?');

  } catch (error) {
    console.error('❌ Error durante diagnóstico:', error);
  }
}

// Ejecutar diagnóstico
diagnosticarNotificacionesVendedor()
  .then(() => {
    console.log('\n🎉 DIAGNÓSTICO COMPLETADO');
    console.log('Para activar notificaciones con sonido:');
    console.log('1. Dashboard vendedor → Banner naranja → Activar');
    console.log('2. Permitir notificaciones del navegador');
    console.log('3. Mantener app abierta en background');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error crítico:', error);
    process.exit(1);
  });
