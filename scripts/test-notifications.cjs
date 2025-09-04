const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://deaddzylotqdckublfed.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRkenlsb3RxZGNrdWJsZmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3OTU4NjEsImV4cCI6MjA3MTM3MTg2MX0.ktxZ0H7mI9NVdxu48sPd90kqPerSP-vkysQlIM1JpG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNotifications() {
  console.log('🧪 PROBANDO SISTEMA DE NOTIFICACIONES...');
  
  try {
    // 1. Verificar la estructura de la tabla
    console.log('\n📋 Verificando estructura de la tabla...');
    const { data: tableInfo, error: structError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);

    if (structError) {
      console.error('❌ Error verificando estructura:', structError);
      return;
    }

    console.log('✅ Tabla de notificaciones disponible');

    // 2. Crear una notificación de prueba
    console.log('\n✨ Creando notificación de prueba...');
    
    // ID de usuario de prueba (ajusta según tu sistema)
    const testUserId = '12345678-1234-1234-1234-123456789012';
    
    const { data: newNotification, error: insertError } = await supabase
      .from('notifications')
      .insert([
        {
          recipient_id: testUserId,
          type: 'system',
          title: 'Prueba del sistema',
          message: 'Esta es una notificación de prueba para verificar que el sistema funciona correctamente.',
          is_read: false,
          data: { test: true }
        }
      ])
      .select();

    if (insertError) {
      console.error('❌ Error creando notificación:', insertError);
      return;
    }

    console.log('✅ Notificación de prueba creada:', newNotification);

    // 3. Leer todas las notificaciones
    console.log('\n📖 Leyendo todas las notificaciones...');
    const { data: allNotifications, error: readError } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (readError) {
      console.error('❌ Error leyendo notificaciones:', readError);
      return;
    }

    console.log(`📋 Total de notificaciones: ${allNotifications?.length || 0}`);
    
    if (allNotifications && allNotifications.length > 0) {
      console.log('\n📝 Notificaciones encontradas:');
      allNotifications.forEach((notification, index) => {
        console.log(`   ${index + 1}. [${notification.type}] ${notification.title}`);
        console.log(`      Usuario: ${notification.recipient_id}`);
        console.log(`      Fecha: ${new Date(notification.created_at).toLocaleString()}`);
        console.log(`      Leída: ${notification.is_read ? 'Sí' : 'No'}`);
        console.log('');
      });
    }

    // 4. Limpiar la notificación de prueba después de 10 segundos
    console.log('\n⏰ La notificación de prueba se eliminará en 10 segundos...');
    setTimeout(async () => {
      if (newNotification && newNotification[0]) {
        const { error: deleteError } = await supabase
          .from('notifications')
          .delete()
          .eq('id', newNotification[0].id);

        if (deleteError) {
          console.error('❌ Error eliminando notificación de prueba:', deleteError);
        } else {
          console.log('✅ Notificación de prueba eliminada');
        }
      }
    }, 10000);

    console.log('\n🎉 PRUEBA COMPLETADA EXITOSAMENTE');

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

// Ejecutar la prueba
testNotifications()
  .then(() => {
    console.log('\n👋 Prueba finalizada');
    // No salir inmediatamente para permitir la limpieza
    setTimeout(() => process.exit(0), 12000);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
