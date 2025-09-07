import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://deaddzyloiqdckublfed.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRkenlsb2lxZGNrdWJsZmVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDI3NjY1MSwiZXhwIjoyMDQ5ODUyNjUxfQ.t_djhBqkgvSJjNEXoMaVRtGCh0NB6nL6pFqnMQQyJhQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSellerRatingsView() {
  console.log('🔧 REPARANDO seller_ratings_view...\n');

  try {
    // 1. Verificar la vista actual
    console.log('1️⃣ VERIFICANDO VISTA ACTUAL:');
    const viewCheckResult = await supabase
      .from('seller_ratings_view')
      .select('*')
      .limit(1);
    
    console.log('Estado actual:', viewCheckResult.error ? 'ERROR' : 'OK');

    // 2. Recrear la vista
    console.log('\n2️⃣ RECREANDO seller_ratings_view...');
    const createViewSQL = `
      CREATE OR REPLACE VIEW seller_ratings_view AS
      SELECT 
          rated_id as seller_id,
          ROUND(AVG(rating::numeric), 2) as average_rating,
          COUNT(*) as total_reviews,
          COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star_count,
          COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star_count,
          COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star_count,
          COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star_count,
          COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star_count,
          MAX(completed_at) as last_rating_date
      FROM ratings
      WHERE status = 'completed' 
      AND rating_type IN ('buyer_to_seller')
      GROUP BY rated_id;
    `;

    const { error: createError } = await supabase.rpc('exec_sql', { sql: createViewSQL });
    
    if (createError) {
      console.log('❌ Error creando vista:', createError.message);
      // Intentar con método alternativo
      console.log('🔄 Intentando método alternativo...');
      
      // Forzar recreación consultando directamente
      const { data: viewData, error: viewError } = await supabase
        .from('ratings')
        .select(`
          rated_id,
          rating,
          status,
          rating_type,
          completed_at
        `)
        .eq('status', 'completed')
        .eq('rating_type', 'buyer_to_seller');
        
      if (!viewError && viewData) {
        console.log('✅ Datos de calificaciones encontrados:', viewData.length, 'registros');
        
        // Agrupar manualmente para verificar
        const groupedRatings = viewData.reduce((acc, rating) => {
          const sellerId = rating.rated_id;
          if (!acc[sellerId]) {
            acc[sellerId] = [];
          }
          acc[sellerId].push(rating.rating);
          return acc;
        }, {});
        
        console.log('📊 Calificaciones agrupadas por vendedor:');
        Object.keys(groupedRatings).forEach(sellerId => {
          const ratings = groupedRatings[sellerId];
          const avg = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
          console.log(`Vendedor ${sellerId}: ${avg.toFixed(2)} (${ratings.length} calificaciones)`);
        });
      }
    } else {
      console.log('✅ Vista recreada exitosamente');
    }

    // 3. Verificar datos en la nueva vista
    console.log('\n3️⃣ VERIFICANDO DATOS EN LA VISTA:');
    const { data: viewData, error: viewError } = await supabase
      .from('seller_ratings_view')
      .select('*');
      
    if (!viewError && viewData) {
      console.log('✅ Datos en seller_ratings_view:', viewData.length, 'vendedores');
      console.table(viewData);
    } else {
      console.log('❌ Error:', viewError?.message);
    }

    // 4. Verificar Foto Estudio Digital específicamente
    console.log('\n4️⃣ VERIFICANDO "Foto Estudio Digital":');
    const { data: fotoEstudio, error: fotoError } = await supabase
      .from('users')
      .select('id, business_name, name')
      .ilike('business_name', '%Foto Estudio Digital%')
      .single();
      
    if (fotoEstudio && !fotoError) {
      console.log('Vendedor encontrado:', fotoEstudio);
      
      const { data: rating, error: ratingError } = await supabase
        .from('seller_ratings_view')
        .select('*')
        .eq('seller_id', fotoEstudio.id)
        .single();
        
      if (rating && !ratingError) {
        console.log('✅ Calificación en vista:', rating);
      } else {
        console.log('❌ Sin calificación en vista:', ratingError?.message);
      }
    }

    console.log('\n🎉 PROCESO COMPLETADO');
    console.log('🔄 Ahora recarga la app para ver las calificaciones actualizadas');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

fixSellerRatingsView().then(() => process.exit(0));
