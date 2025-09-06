// Debug script para errores 400 en SellerDashboard
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://deaddzylqtgdckublfed.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRkenlscXRnZGNrdWJsZmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjUxMDk5OTQsImV4cCI6MjA0MDY4NTk5NH0.vQKfI_rTwIwM8sjlc9O6HtLvpFaZekuE_8x1_eT1_0M'
);

async function debugSellerErrors() {
  console.log('🔍 DIAGNÓSTICO DE ERRORES 400 EN SELLER DASHBOARD\n');
  
  try {
    // 1. Probar autenticación anónima
    console.log('1️⃣ Estado de autenticación:');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Error de autenticación:', authError);
    } else if (!user) {
      console.log('⚠️ No hay usuario autenticado (anon key)');
    } else {
      console.log('✅ Usuario autenticado:', user.id);
    }
    
    // 2. Probar daily_products con diferentes filtros
    console.log('\n2️⃣ Probando daily_products:');
    
    // Sin filtros
    const { data: allDaily, error: allDailyError } = await supabase
      .from('daily_products')
      .select('id, name, seller_id')
      .limit(3);
    
    if (allDailyError) {
      console.error('❌ Error consultando daily_products:', allDailyError);
    } else {
      console.log('✅ daily_products (sin filtros):', allDaily?.length || 0, 'productos');
      if (allDaily?.length > 0) {
        console.log('   Ejemplo:', allDaily[0]);
      }
    }
    
    // Con filtro de fecha (esta consulta específica falla)
    const { data: filteredDaily, error: filteredDailyError } = await supabase
      .from('daily_products')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .limit(3);
    
    if (filteredDailyError) {
      console.error('❌ Error con filtro de fecha:', filteredDailyError);
    } else {
      console.log('✅ daily_products con filtro fecha:', filteredDaily?.length || 0, 'productos');
    }
    
    // 3. Probar consulta de users/sellers
    console.log('\n3️⃣ Probando users (sellers):');
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, business_name')
      .limit(3);
    
    if (usersError) {
      console.error('❌ Error consultando users:', usersError);
    } else {
      console.log('✅ users:', users?.length || 0, 'usuarios');
      if (users?.length > 0) {
        console.log('   Ejemplo:', users[0]);
      }
    }
    
    // 4. Probar seller_ratings_view (esta es la que falla en el código)
    console.log('\n4️⃣ Probando seller_ratings_view:');
    
    const { data: ratings, error: ratingsError } = await supabase
      .from('seller_ratings_view')
      .select('*')
      .limit(3);
    
    if (ratingsError) {
      console.error('❌ Error consultando seller_ratings_view:', ratingsError);
      console.log('   Posible causa: Vista no existe o RLS muy restrictivo');
    } else {
      console.log('✅ seller_ratings_view:', ratings?.length || 0, 'registros');
    }
    
    // 5. Verificar permisos RLS específicos
    console.log('\n5️⃣ Probando permisos RLS con usuario específico:');
    
    // Intentar consultar con un seller_id específico
    if (users?.length > 0) {
      const testSellerId = users[0].id;
      console.log(`   Probando con seller_id: ${testSellerId}`);
      
      const { data: sellerProducts, error: sellerError } = await supabase
        .from('daily_products')
        .select('*')
        .eq('seller_id', testSellerId)
        .limit(3);
      
      if (sellerError) {
        console.error('❌ Error con filtro seller_id:', sellerError);
      } else {
        console.log('✅ Productos del vendedor:', sellerProducts?.length || 0);
      }
    }
    
    console.log('\n📋 RESUMEN:');
    console.log('- Los errores 400 típicamente indican problemas de RLS o campos faltantes');
    console.log('- Revisar que seller_id no sea NULL en daily_products');
    console.log('- Verificar que seller_ratings_view exista y tenga permisos');
    console.log('- Considerar autenticación con usuario real vs anon');
    
  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

debugSellerErrors();
