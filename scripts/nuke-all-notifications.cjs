const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://deaddzylotqdckublfed.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRkenlsb3RxZGNrdWJsZmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3OTU4NjEsImV4cCI6MjA3MTM3MTg2MX0.ktxZ0H7mI9NVdxu48sPd90kqPerSP-vkysQlIM1JpG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function nukeAllNotifications() {
  console.log('💥 ELIMINACIÓN NUCLEAR DE TODAS LAS NOTIFICACIONES...\n');
  
  try {
    // Paso 1: Verificar que existan notificaciones
    console.log('🔍 Verificando notificaciones existentes...');
    const { data: beforeCount, error: beforeError } = await supabase
      .from('notifications')
      .select('id, recipient_id, type, title, created_at')
      .order('created_at', { ascending: false });

    if (beforeError) {
      console.error('❌ Error verificando notificaciones:', beforeError);
      return;
    }

    console.log(`📊 Notificaciones encontradas: ${beforeCount?.length || 0}`);

    if (!beforeCount || beforeCount.length === 0) {
      console.log('✅ No hay notificaciones para eliminar');
      return;
    }

    // Mostrar algunas de las notificaciones encontradas
    console.log('\n📋 Muestra de notificaciones encontradas:');
    beforeCount.slice(0, 5).forEach((notif, index) => {
      console.log(`   ${index + 1}. Usuario: ${notif.recipient_id} | Tipo: ${notif.type} | Título: ${notif.title}`);
      console.log(`      Fecha: ${new Date(notif.created_at).toLocaleString()}`);
    });

    if (beforeCount.length > 5) {
      console.log(`   ... y ${beforeCount.length - 5} más`);
    }

    // Paso 2: ELIMINACIÓN NUCLEAR - Sin filtros, eliminar TODAS
    console.log('\n💥 INICIANDO ELIMINACIÓN NUCLEAR...');
    console.log('⚠️  ADVERTENCIA: Esto eliminará TODAS las notificaciones de TODOS los usuarios');
    
    // Eliminar TODO sin condiciones
    const { error: deleteError, count: deletedCount } = await supabase
      .from('notifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Condición que siempre es verdadera

    if (deleteError) {
      console.error('❌ Error en eliminación nuclear:', deleteError);
      
      // Método alternativo: eliminar por lotes
      console.log('\n🔄 Intentando eliminación por lotes...');
      const batchSize = 100;
      let totalDeleted = 0;
      
      for (let i = 0; i < beforeCount.length; i += batchSize) {
        const batch = beforeCount.slice(i, i + batchSize);
        const ids = batch.map(n => n.id);
        
        console.log(`   Eliminando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(beforeCount.length/batchSize)} (${ids.length} items)`);
        
        const { error: batchError, count: batchCount } = await supabase
          .from('notifications')
          .delete()
          .in('id', ids);
        
        if (batchError) {
          console.error(`   ❌ Error en lote ${Math.floor(i/batchSize) + 1}:`, batchError);
        } else {
          totalDeleted += batchCount || 0;
          console.log(`   ✅ Lote eliminado: ${batchCount || 0} items`);
        }
        
        // Pequeña pausa entre lotes
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`\n📊 Total eliminado por lotes: ${totalDeleted}`);
      
    } else {
      console.log(`✅ ELIMINACIÓN NUCLEAR EXITOSA: ${deletedCount || 0} notificaciones eliminadas`);
    }

    // Paso 3: Verificación final
    console.log('\n🔍 VERIFICACIÓN FINAL...');
    const { data: afterCount, error: afterError } = await supabase
      .from('notifications')
      .select('id')
      .limit(10);

    if (afterError) {
      console.error('❌ Error en verificación final:', afterError);
    } else {
      console.log(`📊 Notificaciones restantes: ${afterCount?.length || 0}`);
      
      if (afterCount && afterCount.length === 0) {
        console.log('🎉 ¡ÉXITO TOTAL! Todas las notificaciones han sido eliminadas');
      } else {
        console.log('⚠️  Aún quedan notificaciones en la base de datos');
        console.log('🔄 Puedes ejecutar este script nuevamente si es necesario');
      }
    }

    // Paso 4: Instrucciones finales
    console.log('\n📋 INSTRUCCIONES FINALES:');
    console.log('1. Actualiza la página web (F5 o Ctrl+R)');
    console.log('2. Limpia el cache del navegador (Ctrl+Shift+R)');
    console.log('3. Verifica que las notificaciones ya no aparezcan');
    console.log('4. Si aún aparecen, usa el botón "LIMPIAR CACHE" en la app');

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

// Ejecutar eliminación nuclear
nukeAllNotifications()
  .then(() => {
    console.log('\n🏁 Eliminación nuclear completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
