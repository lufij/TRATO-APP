const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://deaddzylotqdckublfed.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRkenlsb3RxZGNrdWJsZmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3OTU4NjEsImV4cCI6MjA3MTM3MTg2MX0.ktxZ0H7mI9NVdxu48sPd90kqPerSP-vkysQlIM1JpG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticNotificationsProblem() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DEL PROBLEMA DE NOTIFICACIONES...\n');
  
  try {
    // 1. Obtener estadísticas generales
    console.log('📊 ESTADÍSTICAS GENERALES:');
    const { data: allNotifications, error: allError } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (allError) {
      console.error('❌ Error obteniendo notificaciones:', allError);
      return;
    }

    console.log(`   Total de notificaciones en la BD: ${allNotifications?.length || 0}`);

    if (!allNotifications || allNotifications.length === 0) {
      console.log('✅ No hay notificaciones en la base de datos');
      return;
    }

    // 2. Análisis por usuario
    console.log('\n👥 ANÁLISIS POR USUARIO:');
    const userStats = {};
    allNotifications.forEach(notification => {
      const userId = notification.recipient_id || 'sin_usuario';
      if (!userStats[userId]) {
        userStats[userId] = {
          count: 0,
          types: {},
          oldest: notification.created_at,
          newest: notification.created_at,
          messages: new Set()
        };
      }
      userStats[userId].count++;
      userStats[userId].types[notification.type] = (userStats[userId].types[notification.type] || 0) + 1;
      userStats[userId].messages.add(notification.message);
      
      if (new Date(notification.created_at) < new Date(userStats[userId].oldest)) {
        userStats[userId].oldest = notification.created_at;
      }
      if (new Date(notification.created_at) > new Date(userStats[userId].newest)) {
        userStats[userId].newest = notification.created_at;
      }
    });

    // Mostrar estadísticas por usuario
    Object.entries(userStats).forEach(([userId, stats]) => {
      console.log(`\n   Usuario: ${userId}`);
      console.log(`   ├─ Total notificaciones: ${stats.count}`);
      console.log(`   ├─ Mensajes únicos: ${stats.messages.size}`);
      console.log(`   ├─ Tipos: ${Object.keys(stats.types).join(', ')}`);
      console.log(`   ├─ Más antigua: ${new Date(stats.oldest).toLocaleString()}`);
      console.log(`   └─ Más reciente: ${new Date(stats.newest).toLocaleString()}`);
      
      if (stats.count > 10) {
        console.log(`   ⚠️  USUARIO CON MUCHAS NOTIFICACIONES (${stats.count})`);
      }
    });

    // 3. Identificar patrones de duplicación
    console.log('\n🔄 ANÁLISIS DE DUPLICACIÓN:');
    const messagePatterns = {};
    allNotifications.forEach(notification => {
      const key = `${notification.recipient_id}-${notification.type}-${notification.title}`;
      if (!messagePatterns[key]) {
        messagePatterns[key] = [];
      }
      messagePatterns[key].push(notification);
    });

    let duplicatesFound = 0;
    Object.entries(messagePatterns).forEach(([pattern, notifications]) => {
      if (notifications.length > 1) {
        duplicatesFound++;
        console.log(`   🔄 Patrón duplicado (${notifications.length}x): ${pattern}`);
        notifications.slice(0, 3).forEach((notif, index) => {
          console.log(`      ${index + 1}. ID: ${notif.id} - ${new Date(notif.created_at).toLocaleString()}`);
        });
        if (notifications.length > 3) {
          console.log(`      ... y ${notifications.length - 3} más`);
        }
      }
    });

    if (duplicatesFound === 0) {
      console.log('   ✅ No se encontraron patrones de duplicación');
    } else {
      console.log(`   ⚠️  Se encontraron ${duplicatesFound} patrones de duplicación`);
    }

    // 4. Análisis temporal
    console.log('\n⏰ ANÁLISIS TEMPORAL:');
    const now = new Date();
    const timeRanges = {
      'Última hora': 60 * 60 * 1000,
      'Últimas 24 horas': 24 * 60 * 60 * 1000,
      'Última semana': 7 * 24 * 60 * 60 * 1000,
      'Último mes': 30 * 24 * 60 * 60 * 1000
    };

    Object.entries(timeRanges).forEach(([label, milliseconds]) => {
      const cutoff = new Date(now.getTime() - milliseconds);
      const count = allNotifications.filter(n => new Date(n.created_at) > cutoff).length;
      console.log(`   ${label}: ${count} notificaciones`);
    });

    // 5. Proponer soluciones específicas
    console.log('\n💡 SOLUCIONES RECOMENDADAS:');
    
    const problematicUsers = Object.entries(userStats).filter(([_, stats]) => stats.count > 20);
    if (problematicUsers.length > 0) {
      console.log('   🎯 ACCIÓN 1: Limpiar usuarios con exceso de notificaciones');
      problematicUsers.forEach(([userId, stats]) => {
        console.log(`      - Usuario ${userId}: ${stats.count} notificaciones`);
      });
    }

    if (duplicatesFound > 5) {
      console.log('   🎯 ACCIÓN 2: Eliminar notificaciones duplicadas');
    }

    const oldNotifications = allNotifications.filter(n => 
      new Date(now.getTime() - n.created_at) > 7 * 24 * 60 * 60 * 1000
    ).length;
    
    if (oldNotifications > 0) {
      console.log(`   🎯 ACCIÓN 3: Eliminar ${oldNotifications} notificaciones antiguas (>7 días)`);
    }

    console.log('\n🔧 Para ejecutar la limpieza automática, usa el siguiente comando:');
    console.log('   node scripts/fix-notifications-problem.cjs');

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

// Ejecutar diagnóstico
diagnosticNotificationsProblem()
  .then(() => {
    console.log('\n🏁 Diagnóstico completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
