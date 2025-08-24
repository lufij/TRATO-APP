import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://ikdtfwqkqpfxtxzrxnuq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZHRmd3Frcf...'; // Service key

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticOrders() {
  console.log('🔍 DIAGNÓSTICO DE ÓRDENES - TRATO APP');
  console.log('==========================================');
  
  try {
    // 1. Verificar todas las órdenes
    console.log('\n📊 1. TODAS LAS ÓRDENES:');
    const { data: allOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (ordersError) {
      console.error('❌ Error al consultar órdenes:', ordersError.message);
      return;
    }
    
    console.log(`✅ Total de órdenes encontradas: ${allOrders?.length || 0}`);
    
    if (allOrders && allOrders.length > 0) {
      console.log('\n📋 Primeras 5 órdenes:');
      allOrders.slice(0, 5).forEach((order, index) => {
        console.log(`${index + 1}. ID: ${order.id}`);
        console.log(`   Seller ID: ${order.seller_id || 'NULL'}`);
        console.log(`   Buyer ID: ${order.buyer_id || 'NULL'}`);
        console.log(`   Customer: ${order.customer_name || 'Sin nombre'}`);
        console.log(`   Total: ${order.total_amount || order.total || 0}`);
        console.log(`   Status: ${order.status || 'Sin status'}`);
        console.log(`   Created: ${order.created_at}`);
        console.log('   ---');
      });
    }
    
    // 2. Verificar órdenes sin seller_id
    console.log('\n🚨 2. ÓRDENES SIN SELLER_ID:');
    const { data: ordersWithoutSeller, error: noSellerError } = await supabase
      .from('orders')
      .select('*')
      .is('seller_id', null);
    
    if (noSellerError) {
      console.error('❌ Error:', noSellerError.message);
    } else {
      console.log(`⚠️  Órdenes sin seller_id: ${ordersWithoutSeller?.length || 0}`);
      if (ordersWithoutSeller && ordersWithoutSeller.length > 0) {
        ordersWithoutSeller.forEach((order, index) => {
          console.log(`${index + 1}. ID: ${order.id} - Customer: ${order.customer_name}`);
        });
      }
    }
    
    // 3. Verificar todos los usuarios vendedores
    console.log('\n👥 3. USUARIOS VENDEDORES:');
    const { data: sellers, error: sellersError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'vendedor');
    
    if (sellersError) {
      console.error('❌ Error:', sellersError.message);
    } else {
      console.log(`✅ Vendedores encontrados: ${sellers?.length || 0}`);
      if (sellers && sellers.length > 0) {
        sellers.forEach((seller, index) => {
          console.log(`${index + 1}. ID: ${seller.id}`);
          console.log(`   Nombre: ${seller.business_name || seller.full_name || 'Sin nombre'}`);
          console.log(`   Email: ${seller.email || 'Sin email'}`);
          console.log('   ---');
        });
      }
    }
    
    // 4. Verificar order_items
    console.log('\n📦 4. ORDER_ITEMS:');
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .limit(10);
    
    if (itemsError) {
      console.error('❌ Error:', itemsError.message);
    } else {
      console.log(`✅ Order items encontrados: ${orderItems?.length || 0}`);
    }
    
    // 5. Intentar asociar órdenes huérfanas a vendedores
    if (ordersWithoutSeller && ordersWithoutSeller.length > 0 && sellers && sellers.length > 0) {
      console.log('\n🔧 5. INTENTANDO REPARAR ÓRDENES HUÉRFANAS:');
      const firstSeller = sellers[0]; // Asignar al primer vendedor encontrado
      
      for (const order of ordersWithoutSeller) {
        try {
          const { data, error } = await supabase
            .from('orders')
            .update({ seller_id: firstSeller.id })
            .eq('id', order.id);
          
          if (error) {
            console.log(`❌ Error actualizando orden ${order.id}: ${error.message}`);
          } else {
            console.log(`✅ Orden ${order.id} asignada a vendedor ${firstSeller.business_name || firstSeller.full_name}`);
          }
        } catch (err) {
          console.log(`❌ Error: ${err.message}`);
        }
      }
    }
    
    console.log('\n🎉 DIAGNÓSTICO COMPLETADO');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar diagnóstico
diagnosticOrders();
