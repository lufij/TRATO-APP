const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://deaddzylotqdckublfed.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRkenlsb3RxZGNrdWJsZmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3OTU4NjEsImV4cCI6MjA3MTM3MTg2MX0.ktxZ0H7mI9NVdxu48sPd90kqPerSP-vkysQlIM1JpG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestNotification() {
  console.log('🧪 CREANDO NOTIFICACIÓN DE PRUEBA...');
  
  try {
    // Nota: Debes reemplazar este ID con un ID de usuario real de tu sistema
    const testUserId = 'usuario-prueba-123'; // CAMBIAR POR ID REAL
    
    const testNotifications = [
      {
        recipient_id: testUserId,
        type: 'order_delivered',
        title: '¡Tu pedido ha llegado!',
        message: 'Tu pedido #6336b85a ha sido entregado. ¡Califica al vendedor y repartidor!',
        is_read: false,
        data: { test: true, orderId: '6336b85a' }
      },
      {
        recipient_id: testUserId,
        type: 'promotion',
        title: '🎉 ¡Oferta especial!',
        message: 'Descuento del 20% en todos los productos de FotoEstudio Digital',
        is_read: false,
        data: { test: true, discount: 20 }
      },
      {
        recipient_id: testUserId,
        type: 'new_product',
        title: '🆕 Nuevo producto disponible',
        message: 'Rellenitos de frijol ahora disponibles en Tu Tienda Favorita',
        is_read: false,
        data: { test: true, productName: 'Rellenitos de frijol' }
      }
    ];

    console.log('📝 Insertando notificaciones de prueba...');
    
    const { data, error } = await supabase
      .from('notifications')
      .insert(testNotifications)
      .select();

    if (error) {
      console.error('❌ Error creando notificaciones:', error);
      return;
    }

    console.log('✅ Notificaciones de prueba creadas exitosamente:');
    data.forEach((notification, index) => {
      console.log(`   ${index + 1}. [${notification.type}] ${notification.title}`);
    });

    console.log('\n🎯 INSTRUCCIONES:');
    console.log('1. Ve a la aplicación web');
    console.log('2. Entra como comprador');
    console.log('3. Deberías ver las notificaciones flotantes en la parte superior');
    console.log('4. Desliza las notificaciones para eliminarlas');
    console.log('5. O espera 5 minutos para que se auto-eliminen');

    console.log('\n⚠️  NOTA IMPORTANTE:');
    console.log(`   El ID de usuario usado es: ${testUserId}`);
    console.log('   Asegúrate de que este ID corresponda al usuario con el que estás probando');

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

// Función para obtener usuarios reales del sistema
async function listRealUsers() {
  console.log('👥 USUARIOS REALES EN EL SISTEMA:');
  
  try {
    // Intentar obtener usuarios de la tabla auth (si está disponible)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (!authError && authUsers?.users) {
      console.log('📋 Usuarios encontrados en auth:');
      authUsers.users.slice(0, 5).forEach((user, index) => {
        console.log(`   ${index + 1}. ID: ${user.id}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Fecha: ${new Date(user.created_at).toLocaleDateString()}`);
      });
      
      if (authUsers.users.length > 0) {
        console.log(`\n💡 Puedes usar cualquiera de estos IDs para crear notificaciones de prueba`);
        console.log(`   Por ejemplo: ${authUsers.users[0].id}`);
      }
    } else {
      console.log('⚠️  No se pudieron obtener usuarios de auth');
    }

  } catch (error) {
    console.log('⚠️  Error obteniendo usuarios:', error.message);
    console.log('');
    console.log('🔧 SOLUCIÓN MANUAL:');
    console.log('1. Ve a la aplicación web y entra como comprador');
    console.log('2. Abre las herramientas de desarrollador (F12)');
    console.log('3. En la consola, ejecuta: localStorage');
    console.log('4. Busca información del usuario autenticado');
    console.log('5. Usa ese ID en este script');
  }
}

// Menú principal
console.log('🚀 SCRIPT DE PRUEBAS DE NOTIFICACIONES FLOTANTES\n');

const args = process.argv.slice(2);
const command = args[0];

if (command === 'users') {
  listRealUsers()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
} else if (command === 'test') {
  createTestNotification()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
} else {
  console.log('📋 COMANDOS DISPONIBLES:');
  console.log('   node scripts/test-floating-notifications.cjs users  - Listar usuarios reales');
  console.log('   node scripts/test-floating-notifications.cjs test   - Crear notificaciones de prueba');
  console.log('');
  console.log('🎯 RECOMENDACIÓN:');
  console.log('   1. Primero ejecuta "users" para obtener un ID real');
  console.log('   2. Edita este script con el ID correcto');
  console.log('   3. Luego ejecuta "test" para crear las notificaciones');
  process.exit(0);
}
