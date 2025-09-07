import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://deaddzyloiqdckublfed.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRkenlsb2lxZGNrdWJsZmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQyNzY2NTEsImV4cCI6MjA0OTg1MjY1MX0.RqtjzhJUNl4dIFECKvOobgOL3CHh_-WjD2W8z-7mWjg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRatingsSystem() {
  console.log('🔗 Conectando a Supabase...\n');

  // 1. Verificar tabla ratings
  console.log('📊 VERIFICANDO TABLA RATINGS:');
  const { data: ratingsData, error: ratingsError } = await supabase
    .from('ratings')
    .select('*')
    .limit(5);
    
  if (ratingsError) {
    console.log('❌ Error accediendo a tabla ratings:', ratingsError.message);
  } else {
    console.log('✅ Tabla ratings existe. Total registros encontrados:', ratingsData.length);
    if (ratingsData.length > 0) {
      console.table(ratingsData);
    }
  }
  
  // 2. Verificar órdenes entregadas que pueden calificarse
  console.log('\n📦 ÓRDENES ENTREGADAS (DELIVERED):');
  const { data: deliveredOrders, error: deliveredError } = await supabase
    .from('orders')
    .select('id, buyer_id, seller_id, driver_id, status, seller_rating, driver_rating, delivery_type, created_at')
    .eq('status', 'delivered')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (deliveredError) {
    console.log('❌ Error:', deliveredError.message);
  } else {
    console.log('✅ Órdenes entregadas encontradas:', deliveredOrders.length);
    if (deliveredOrders.length > 0) {
      console.table(deliveredOrders);
    }
  }

  // 3. Verificar función complete_rating - método indirecto
  console.log('\n🔧 VERIFICANDO FUNCIONES RPC:');
  try {
    const { data: testRpc, error: rpcError } = await supabase
      .rpc('complete_rating', { 
        p_rating_id: '00000000-0000-0000-0000-000000000000', 
        p_user_id: '00000000-0000-0000-0000-000000000000', 
        p_rating: 5, 
        p_comment: 'test' 
      });
      
    if (rpcError) {
      if (rpcError.message.includes('does not exist')) {
        console.log('❌ Función complete_rating NO existe');
      } else {
        console.log('✅ Función complete_rating existe (error:', rpcError.message, ')');
      }
    }
  } catch (e) {
    console.log('🔍 Error al probar función:', e.message);
  }

  // 4. Verificar rate_order_experience
  console.log('\n🌟 VERIFICANDO FUNCIÓN rate_order_experience:');
  try {
    const { data: testRate, error: rateError } = await supabase
      .rpc('rate_order_experience', { 
        p_order_id: '00000000-0000-0000-0000-000000000000',
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_seller_rating: 5
      });
      
    if (rateError) {
      if (rateError.message.includes('does not exist')) {
        console.log('❌ Función rate_order_experience NO existe');
      } else {
        console.log('✅ Función rate_order_experience existe (error:', rateError.message, ')');
      }
    }
  } catch (e) {
    console.log('🔍 Error al probar función:', e.message);
  }
}

checkRatingsSystem().then(() => process.exit(0));
