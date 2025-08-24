import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://ikdtfwqkqpfxtxzrxnuq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZHRmd3Frcfextxzrxnuq.supabase.co';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSellerOrders() {
  console.log('🔍 Testing seller order access...');
  
  const sellerId = '56171e7-a66e-4166-93f0-3038666c4996'; // Del screenshot
  
  try {
    // 1. Consulta básica de órdenes
    console.log('📝 1. Consulta básica de órdenes...');
    const { data: basicOrders, error: basicError } = await supabase
      .from('orders')
      .select('*')
      .eq('seller_id', sellerId);
    
    if (basicError) {
      console.error('❌ Error en consulta básica:', basicError);
    } else {
      console.log(`✅ Órdenes encontradas: ${basicOrders?.length || 0}`);
      console.log('📊 Órdenes:', basicOrders);
    }
    
    // 2. Consulta con order_items (como en el componente)
    console.log('\n📝 2. Consulta con order_items...');
    const { data: ordersWithItems, error: itemsError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_name,
          quantity,
          price_per_unit,
          subtotal
        )
      `)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });
    
    if (itemsError) {
      console.error('❌ Error en consulta con items:', itemsError);
    } else {
      console.log(`✅ Órdenes con items: ${ordersWithItems?.length || 0}`);
      console.log('📊 Órdenes con items:', ordersWithItems);
    }
    
    // 3. Verificar RLS policies
    console.log('\n📝 3. Verificando acceso con autenticación simulada...');
    // Simular login del vendedor
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
    
    if (authError) {
      console.error('❌ Error de autenticación:', authError);
    } else {
      console.log('✅ Autenticación exitosa');
      
      // Consulta con usuario autenticado
      const { data: authOrders, error: authOrdersError } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_id', sellerId);
      
      if (authOrdersError) {
        console.error('❌ Error con RLS:', authOrdersError);
      } else {
        console.log(`✅ Órdenes con RLS: ${authOrders?.length || 0}`);
      }
    }
    
    // 4. Verificar seller en tabla users
    console.log('\n📝 4. Verificando vendedor en tabla users...');
    const { data: userCheck, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', sellerId);
    
    if (userError) {
      console.error('❌ Error verificando usuario:', userError);
    } else {
      console.log(`✅ Usuario encontrado: ${userCheck?.length || 0}`);
      console.log('👤 Datos del usuario:', userCheck);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testSellerOrders();
