// Test final para verificar que todo funciona con las credenciales correctas

import { createClient } from '@supabase/supabase-js';

// Credenciales actualizadas (las mismas del .env.local)
const supabaseUrl = 'https://yygiwwqjejkhfxmokrxe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5Z2l3d3FqZWpraGZ4bW9rcnhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ3NzIzMzEsImV4cCI6MjA0MDM0ODMzMX0.o8YtI8V3AQIML24WLf1T6aYevhYCEZqzWFxBAJD9GBM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFinal() {
  try {
    console.log('🎯 Test final de conectividad...');
    
    // Test 1: Conexión básica
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, total')
      .limit(3);

    if (ordersError) {
      console.error('❌ Error al obtener órdenes:', ordersError);
      return;
    }

    console.log(`✅ Órdenes encontradas: ${orders?.length || 0}`);
    
    // Test 2: Filtro de órdenes activas (como en la app)
    const { data: activeOrders, error: activeError } = await supabase
      .from('orders')
      .select('id, status')
      .in('status', ['pending', 'accepted', 'ready', 'assigned']);

    if (activeError) {
      console.error('❌ Error al filtrar órdenes activas:', activeError);
      return;
    }

    console.log(`📋 Órdenes activas: ${activeOrders?.length || 0}`);
    if (activeOrders && activeOrders.length > 0) {
      console.log('Estados encontrados:', activeOrders.map(o => o.status));
    }

    // Test 3: Verificar usuarios
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, role')
      .limit(2);

    if (usersError) {
      console.error('❌ Error al obtener usuarios:', usersError);
      return;
    }

    console.log(`👥 Usuarios encontrados: ${users?.length || 0}`);
    
    console.log('🎉 ¡Conexión totalmente funcional!');
    console.log('📱 La aplicación debería funcionar correctamente ahora');

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

testFinal();
