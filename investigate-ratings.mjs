import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://deaddzyloiqdckublfed.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRkenlsb2lxZGNrdWJsZmVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDI3NjY1MSwiZXhwIjoyMDQ5ODUyNjUxfQ.t_djhBqkgvSJjNEXoMaVRtGCh0NB6nL6pFqnMQQyJhQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigateRatings() {
  console.log('🔍 INVESTIGANDO SISTEMA DE CALIFICACIONES...\n');

  // 1. Ver calificaciones completadas recientes
  console.log('📊 CALIFICACIONES COMPLETADAS (últimas 10):');
  const { data: ratings, error: ratingsError } = await supabase
    .from('ratings')
    .select('id, order_id, rater_id, rated_id, rating_type, rating, comment, status, created_at, completed_at')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(10);
    
  if (ratings) {
    console.table(ratings);
  } else {
    console.log('❌ Error:', ratingsError?.message);
  }

  // 2. Ver órdenes con calificaciones en la tabla orders
  console.log('\n📦 ÓRDENES CON CALIFICACIONES (seller_rating/driver_rating):');
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, seller_id, driver_id, seller_rating, driver_rating, status, created_at')
    .not('seller_rating', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (orders) {
    console.table(orders);
  } else {
    console.log('❌ Error:', ordersError?.message);
  }

  // 3. Verificar seller_ratings_view
  console.log('\n⭐ SELLER_RATINGS_VIEW (cálculos de calificaciones):');
  const { data: sellerRatings, error: sellerError } = await supabase
    .from('seller_ratings_view')
    .select('*')
    .limit(5);
    
  if (sellerRatings) {
    console.table(sellerRatings);
  } else {
    console.log('❌ Error:', sellerError?.message);
  }

  // 4. Ver un vendedor específico - 'Foto Estudio Digital'
  console.log('\n🎯 CALIFICACIONES PARA "Foto Estudio Digital":');
  const { data: fotoEstudio, error: fotoError } = await supabase
    .from('users')
    .select('id, business_name, name')
    .ilike('business_name', '%Foto Estudio Digital%')
    .single();
    
  if (fotoEstudio) {
    console.log('✅ Vendedor encontrado:', fotoEstudio);
    
    // Ver sus calificaciones en ratings
    const { data: vendorRatings } = await supabase
      .from('ratings')
      .select('*')
      .eq('rated_id', fotoEstudio.id)
      .eq('status', 'completed');
      
    console.log('\n📊 Calificaciones en tabla ratings:', vendorRatings?.length || 0);
    if (vendorRatings && vendorRatings.length > 0) {
      console.table(vendorRatings);
    }
    
    // Ver en seller_ratings_view
    const { data: viewRating } = await supabase
      .from('seller_ratings_view')
      .select('*')
      .eq('seller_id', fotoEstudio.id)
      .single();
      
    console.log('\n⭐ En seller_ratings_view:', viewRating);
  } else {
    console.log('❌ Error buscando vendedor:', fotoError?.message);
  }

  // 5. Verificar si existe una función que actualice seller_ratings_view
  console.log('\n🔧 VERIFICANDO FUNCIONES DE ACTUALIZACIÓN:');
  try {
    const { data: funcs, error: funcError } = await supabase
      .rpc('get_seller_rating', { seller_uuid: 'test' })
      .catch(e => ({ data: null, error: e }));
      
    if (funcError && !funcError.message.includes('invalid input syntax')) {
      console.log('❌ Función get_seller_rating:', funcError.message);
    } else {
      console.log('✅ Función get_seller_rating existe');
    }
  } catch (e) {
    console.log('🔍 Función get_seller_rating:', e.message);
  }
}

investigateRatings().then(() => process.exit(0));
