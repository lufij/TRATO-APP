// 🧪 Script para probar notificaciones unificadas en el NotificationBell
// Ejecutar en la consola del navegador cuando esté en la app

console.log('🔔 SCRIPT DE PRUEBA - SISTEMA DE NOTIFICACIONES UNIFICADO');

async function testUnifiedNotifications() {
  // Verificar si estamos en la app
  if (!window.location.href.includes('localhost')) {
    console.log('❌ Este script debe ejecutarse en la aplicación local');
    return;
  }

  // 1. Verificar conexión a Supabase
  console.log('🔗 Verificando conexión a Supabase...');
  
  // 2. Simular inserción de notificaciones de prueba
  const notifications = [
    {
      type: 'new_order',
      title: '🛒 Nueva Orden Recibida',
      message: 'Tienes una nueva orden de $25.000 - Cliente: María González',
      recipient_id: 'USER_ID_AQUI', // Se debe reemplazar con ID real
      data: { order_id: 'test-123', amount: 25000 }
    },
    {
      type: 'order_ready',
      title: '📦 Pedido Listo',
      message: 'El pedido #456 está listo para recoger',
      recipient_id: 'USER_ID_AQUI',
      data: { order_id: 'test-456' }
    },
    {
      type: 'order_assigned',
      title: '👤 Nuevo Delivery Asignado',
      message: 'Se te ha asignado una nueva entrega - Pedido #789',
      recipient_id: 'USER_ID_AQUI',
      data: { order_id: 'test-789' }
    }
  ];

  console.log('📋 Notificaciones de prueba creadas:', notifications);
  console.log(`
🔊 SONIDOS ESPERADOS POR TIPO DE USUARIO:
- Vendedores (new_order): Triple beep ascendente (800Hz → 1000Hz → 1200Hz)
- Repartidores (order_assigned): Doble beep (1000Hz x2)
- Otros tipos: Sonido suave (800Hz)

📱 EFECTOS ESPERADOS:
✅ Sonido + Vibración (móviles)
✅ Notificación del navegador
✅ Toast notification
✅ Badge en la campana del header
✅ Contador de notificaciones no leídas

🎯 PARA PROBAR:
1. Asegúrate de estar logueado
2. Ve al dashboard correspondiente a tu rol
3. Ejecuta insertNotification() desde la consola
4. Verifica que la campana del header se actualice
5. Haz clic en la campana para ver las notificaciones
6. Observa que el control de sonido ON/OFF funcione
  `);
}

// Función para insertar notificación de prueba
async function insertNotification(type = 'new_order') {
  if (typeof supabase === 'undefined') {
    console.error('❌ Supabase no está disponible');
    return;
  }

  // Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('❌ Usuario no autenticado');
    return;
  }

  const testNotification = {
    type: type,
    title: type === 'new_order' ? '🛒 Nueva Orden' : 
           type === 'order_ready' ? '📦 Pedido Listo' :
           type === 'order_assigned' ? '👤 Asignación' : '📢 Notificación',
    message: type === 'new_order' ? 'Nueva orden de $25.000 recibida' :
             type === 'order_ready' ? 'Tu pedido está listo para recoger' :
             type === 'order_assigned' ? 'Nueva entrega asignada' : 'Notificación de prueba',
    recipient_id: user.id,
    data: { test: true, timestamp: Date.now() }
  };

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert(testNotification)
      .select()
      .single();

    if (error) {
      console.error('❌ Error insertando notificación:', error.message);
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log(`
📋 LA TABLA notifications NO EXISTE
🔧 Ejecuta este SQL en Supabase Dashboard:

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notifications ADD CONSTRAINT notifications_recipient_id_fkey 
FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (recipient_id = auth.uid());
        `);
      }
      return;
    }

    console.log('✅ Notificación insertada:', data);
    console.log('🎵 Deberías escuchar el sonido correspondiente a tu rol');
    console.log('🔔 Revisa la campana del header para ver la notificación');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
}

// Función de prueba rápida
function quickTest() {
  console.log('🚀 PRUEBA RÁPIDA - Insertando notificación new_order...');
  insertNotification('new_order');
}

// Ejecutar prueba inicial
testUnifiedNotifications();

// Instrucciones finales
console.log(`
🎮 COMANDOS DISPONIBLES:
- quickTest() - Prueba rápida con new_order
- insertNotification('new_order') - Notificación para vendedores
- insertNotification('order_assigned') - Notificación para repartidores  
- insertNotification('order_ready') - Notificación general
`);

// Exportar funciones globalmente
window.testNotifications = { quickTest, insertNotification, testUnifiedNotifications };
