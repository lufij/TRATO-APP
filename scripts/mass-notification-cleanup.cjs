const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://deaddzylotqdckublfed.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRkenlsb3RxZGNrdWJsZmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3OTU4NjEsImV4cCI6MjA3MTM3MTg2MX0.ktxZ0H7mI9NVdxu48sPd90kqPerSP-vkysQlIM1JpG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function massNotificationCleanup() {
  console.log('🚨 INICIANDO LIMPIEZA MASIVA DE NOTIFICACIONES...');
  
  try {
    // 1. Obtener estadísticas antes de la limpieza
    const { data: allNotifications, error: countError } = await supabase
      .from('notifications')
      .select('id, created_at, recipient_id')
      .order('created_at', { ascending: false });

    if (countError) {
      console.error('❌ Error obteniendo estadísticas:', countError);
      return;
    }

    console.log(`📊 Total de notificaciones en la BD: ${allNotifications?.length || 0}`);

    if (!allNotifications || allNotifications.length === 0) {
      console.log('✅ No hay notificaciones para limpiar');
      return;
    }

    // 2. Mostrar distribución por antigüedad
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      lastHour: 0,
      lastDay: 0,
      lastWeek: 0,
      older: 0
    };

    allNotifications.forEach(notification => {
      const createdAt = new Date(notification.created_at);
      if (createdAt > oneHourAgo) {
        stats.lastHour++;
      } else if (createdAt > oneDayAgo) {
        stats.lastDay++;
      } else if (createdAt > oneWeekAgo) {
        stats.lastWeek++;
      } else {
        stats.older++;
      }
    });

    console.log('📈 Distribución por antigüedad:');
    console.log(`   - Última hora: ${stats.lastHour}`);
    console.log(`   - Último día: ${stats.lastDay}`);
    console.log(`   - Última semana: ${stats.lastWeek}`);
    console.log(`   - Más antiguas: ${stats.older}`);

    // 3. ELIMINAR TODAS LAS NOTIFICACIONES ANTIGUAS (más de 1 día)
    console.log('\n🧹 ELIMINANDO TODAS las notificaciones más antiguas de 1 día...');
    
    const { error: deleteOldError, count: oldDeleted } = await supabase
      .from('notifications')
      .delete()
      .lt('created_at', oneDayAgo.toISOString());

    if (deleteOldError) {
      console.error('❌ Error eliminando notificaciones antiguas:', deleteOldError);
    } else {
      console.log(`✅ Eliminadas ${oldDeleted || 0} notificaciones antiguas (> 1 día)`);
    }

    // 4. Estadísticas finales
    console.log('\n📊 LIMPIEZA COMPLETADA - Estadísticas finales:');
    
    const { data: finalNotifications, error: finalCountError } = await supabase
      .from('notifications')
      .select('id')
      .order('created_at', { ascending: false });

    if (finalCountError) {
      console.error('❌ Error obteniendo estadísticas finales:', finalCountError);
    } else {
      const finalCount = finalNotifications?.length || 0;
      const totalDeleted = (allNotifications?.length || 0) - finalCount;
      console.log(`   - Notificaciones restantes: ${finalCount}`);
      console.log(`   - Total eliminadas: ${totalDeleted}`);
      console.log(`   - Reducción: ${((totalDeleted / (allNotifications?.length || 1)) * 100).toFixed(1)}%`);
    }

    console.log('\n🎉 LIMPIEZA MASIVA EXITOSA');

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

// Ejecutar la limpieza
massNotificationCleanup()
  .then(() => {
    console.log('\n👋 Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
