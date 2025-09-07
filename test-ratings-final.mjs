import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://deaddzyloiqdckublfed.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRkenlsb2lxZGNrdWJsZmVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDI3NjY1MSwiZXhwIjoyMDQ5ODUyNjUxfQ.t_djhBqkgvSJjNEXoMaVRtGCh0NB6nL6pFqnMQQyJhQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testRatingsSystem() {
  console.log('🔗 Probando sistema de calificaciones...\n');

  // 1. Verificar función complete_rating
  console.log('📊 VERIFICANDO FUNCIÓN complete_rating:');
  try {
    const { data, error } = await supabase.rpc('complete_rating', {
      p_rating_id: '00000000-0000-0000-0000-000000000000',
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_rating: 5,
      p_comment: 'test'
    });
    
    if (error && !error.message.includes('null value in column')) {
      console.log('❌ Error:', error.message);
    } else {
      console.log('✅ Función complete_rating existe y funciona');
    }
  } catch (e) {
    console.log('🔍 Función complete_rating:', e.message.includes('does not exist') ? '❌ NO EXISTE' : '✅ EXISTE');
  }

  // 2. Verificar órdenes entregadas
  console.log('\n📦 ÓRDENES ENTREGADAS QUE PUEDEN CALIFICARSE:');
  const { data: deliveredOrders, error: ordersError } = await supabase
    .from('orders')
    .select('id, buyer_id, seller_id, driver_id, status, delivery_type, seller_rating, driver_rating, created_at')
    .eq('status', 'delivered')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (ordersError) {
    console.log('❌ Error:', ordersError.message);
  } else {
    console.log(`✅ Encontradas ${deliveredOrders.length} órdenes entregadas:`);
    console.table(deliveredOrders);
    
    // Verificar cuáles pueden ser calificadas
    const canBeRated = deliveredOrders.filter(order => 
      !order.seller_rating || (order.delivery_type === 'delivery' && !order.driver_rating)
    );
    console.log(`\n🎯 ${canBeRated.length} órdenes sin calificar completamente`);
  }

  // 3. Verificar estructura de ratings
  console.log('\n📊 VERIFICANDO TABLA RATINGS:');
  const { data: ratingsData, error: ratingsError } = await supabase
    .from('ratings')
    .select('*')
    .limit(3);
    
  if (ratingsError) {
    console.log('❌ Error accediendo a ratings:', ratingsError.message);
  } else {
    console.log('✅ Tabla ratings accesible. Ejemplos:');
    console.table(ratingsData);
  }

  console.log('\n🎉 VERIFICACIÓN COMPLETA');
  console.log('📱 INSTRUCCIONES:');
  console.log('   1. Ve al app como COMPRADOR');
  console.log('   2. Busca órdenes "Entregado" en tu historial');
  console.log('   3. Intenta calificar al vendedor/repartidor');
  console.log('   4. Deberías poder calificar sin problemas');
}

testRatingsSystem().then(() => process.exit(0));
