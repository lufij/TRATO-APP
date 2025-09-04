// Script para ejecutar en la consola del navegador para eliminar TODAS las notificaciones
// Instrucciones: 
// 1. Abrir DevTools (F12)
// 2. Ir a la pestaña Console
// 3. Pegar este código y presionar Enter

console.log('🧹 INICIANDO LIMPIEZA TOTAL DE NOTIFICACIONES...');

// Función para eliminar todas las notificaciones
async function limpiarTodasLasNotificaciones() {
  try {
    // Obtener el cliente de Supabase desde window (debe estar disponible)
    const supabase = window.supabase || window._supabase;
    if (!supabase) {
      console.error('❌ Supabase no está disponible en window');
      return;
    }

    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Usuario no autenticado');
      return;
    }

    console.log('👤 Usuario:', user.email, '| ID:', user.id);

    // Método 1: Eliminar con recipient_id
    console.log('🔄 Método 1: Eliminando con recipient_id...');
    const { count: count1, error: error1 } = await supabase
      .from('notifications')
      .delete()
      .eq('recipient_id', user.id);
    
    console.log(`Método 1: ${error1 ? '❌ Error' : '✅ Éxito'} - Eliminadas: ${count1 || 0}`);
    if (error1) console.error('Error 1:', error1);

    // Método 2: Eliminar con user_id
    console.log('🔄 Método 2: Eliminando con user_id...');
    const { count: count2, error: error2 } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);
    
    console.log(`Método 2: ${error2 ? '❌ Error' : '✅ Éxito'} - Eliminadas: ${count2 || 0}`);
    if (error2) console.error('Error 2:', error2);

    // Método 3: Verificar y eliminar cualquier notificación restante
    console.log('🔄 Método 3: Verificando notificaciones restantes...');
    const { data: remaining, error: error3 } = await supabase
      .from('notifications')
      .select('id')
      .or(`recipient_id.eq.${user.id},user_id.eq.${user.id}`);

    if (remaining && remaining.length > 0) {
      console.log(`🔄 Encontradas ${remaining.length} notificaciones restantes. Eliminando...`);
      const ids = remaining.map(n => n.id);
      const { count: count3, error: error4 } = await supabase
        .from('notifications')
        .delete()
        .in('id', ids);
      
      console.log(`Método 3: ${error4 ? '❌ Error' : '✅ Éxito'} - Eliminadas: ${count3 || 0}`);
      if (error4) console.error('Error 3:', error4);
    } else {
      console.log('✅ No hay notificaciones restantes');
    }

    const totalEliminadas = (count1 || 0) + (count2 || 0);
    console.log(`🎉 LIMPIEZA COMPLETADA: ${totalEliminadas} notificaciones eliminadas`);
    
    // Recargar la página para ver los cambios
    console.log('🔄 Recargando página en 2 segundos...');
    setTimeout(() => {
      window.location.reload();
    }, 2000);

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

// Ejecutar la función
limpiarTodasLasNotificaciones();
