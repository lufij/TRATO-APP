import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yxhnycriwuisxqwjucnw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4aG55Y3Jpd3Vpc3hxd2p1Y253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1OTE5NzMsImV4cCI6MjA1MDE2Nzk3M30.RkdJrrhYLKOPXYrYJ2EWFGwqj4xGu5Pko7x8Wf7JO_Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNotificationsTable() {
  try {
    console.log('🔍 Verificando tabla notifications...');
    
    const { data, error } = await supabase
      .from('notifications')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.log('❌ Error:', error.message);
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('📋 RESULTADO: La tabla notifications NO EXISTE en la base de datos');
        console.log('🔧 El cuadro de notificaciones es DECORATIVO/PRUEBA - no funcional');
      } else {
        console.log('📋 RESULTADO: Error diferente, tabla podría existir');
      }
    } else {
      console.log('✅ RESULTADO: La tabla notifications SÍ EXISTE y funciona');
      console.log('🔧 El cuadro de notificaciones es FUNCIONAL');
      console.log('📊 Datos:', data);
    }
  } catch (e) {
    console.log('❌ Error de conexión:', e.message);
  }
}

checkNotificationsTable();
