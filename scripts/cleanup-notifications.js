// Script para limpiar todas las notificaciones viejas de la base de datos
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://deadlytelokolahufed.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRseXRlbG9rb2xhaHVmZWQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNDU0MDk3NSwiZXhwIjoyMDUwMTE2OTc1fQ.YgKw3kx1gLtInxRdRjPfnXsNPWOV9S0hUWYjd-PY8O4'
);

async function cleanupOldNotifications() {
  console.log('🧹 LIMPIEZA MASIVA: Iniciando limpieza de notificaciones viejas...');
  
  try {
    // Eliminar notificaciones de más de 5 minutos
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    
    console.log('🕐 Eliminando notificaciones más viejas que:', fiveMinutesAgo.toISOString());
    
    const { data, error, count } = await supabase
      .from('notifications')
      .delete()
      .lt('created_at', fiveMinutesAgo.toISOString());
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log(`✅ ÉXITO: Eliminadas ${count || 0} notificaciones viejas`);
    
    // Mostrar estadísticas restantes
    const { data: remaining, error: countError } = await supabase
      .from('notifications')
      .select('user_id', { count: 'exact' });
    
    if (!countError) {
      console.log(`📊 Notificaciones restantes: ${remaining?.length || 0}`);
    }
    
  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

// Ejecutar limpieza
cleanupOldNotifications().then(() => {
  console.log('🏁 Limpieza completada');
  process.exit(0);
}).catch(console.error);
