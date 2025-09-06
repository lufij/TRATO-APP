// Script para corregir errores 400 en Seller Dashboard
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://deaddzylqtgdckublfed.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRkenlscXRnZGNrdWJsZmVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTEwOTk5NCwiZXhwIjoyMDQwNjg1OTk0fQ.C_sEEFlCmHF1VdBdadfGp1t77e5wn72y4LbF7SL8Oqs',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function corregirErrores400() {
  console.log('🔧 CORRIGIENDO ERRORES 400 DEL SELLER DASHBOARD\n');
  
  try {
    // 1. Diagnosticar problemas actuales
    console.log('1️⃣ DIAGNÓSTICO DE PROBLEMAS:');
    
    // Verificar productos sin seller_id
    const { data: productosSinSeller, error: errorSinSeller } = await supabase
      .from('daily_products')
      .select('id, name, seller_id')
      .is('seller_id', null);
    
    if (errorSinSeller) {
      console.error('❌ Error verificando productos sin seller:', errorSinSeller);
    } else {
      console.log(`📊 Productos sin seller_id: ${productosSinSeller?.length || 0}`);
    }
    
    // 2. Obtener un seller_id válido para asignar
    console.log('\n2️⃣ OBTENIENDO SELLER VÁLIDO:');
    
    const { data: usuarios, error: errorUsuarios } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(5);
    
    if (errorUsuarios) {
      console.error('❌ Error obteniendo usuarios:', errorUsuarios);
      return;
    }
    
    const sellerValido = usuarios?.find(u => u.role === 'seller' || u.role === 'vendedor') || usuarios?.[0];
    
    if (!sellerValido) {
      console.error('❌ No se encontró ningún usuario válido');
      return;
    }
    
    console.log(`✅ Seller válido encontrado: ${sellerValido.email} (${sellerValido.id})`);
    
    // 3. Corregir productos sin seller_id
    if (productosSinSeller?.length > 0) {
      console.log('\n3️⃣ CORRIGIENDO PRODUCTOS SIN SELLER_ID:');
      
      for (const producto of productosSinSeller) {
        const { error: errorUpdate } = await supabase
          .from('daily_products')
          .update({ seller_id: sellerValido.id })
          .eq('id', producto.id);
        
        if (errorUpdate) {
          console.error(`❌ Error actualizando producto ${producto.name}:`, errorUpdate);
        } else {
          console.log(`✅ Producto actualizado: ${producto.name}`);
        }
      }
    } else {
      console.log('\n3️⃣ ✅ No hay productos sin seller_id');
    }
    
    // 4. Crear/verificar seller_ratings_view usando RPC
    console.log('\n4️⃣ CREANDO SELLER_RATINGS_VIEW:');
    
    const createViewSQL = `
      CREATE OR REPLACE VIEW seller_ratings_view AS
      SELECT 
        u.id as seller_id,
        u.name as seller_name,
        COALESCE(u.business_name, 'General') as business_name,
        COALESCE(AVG(r.rating), 0.0)::numeric(3,2) as average_rating,
        COUNT(r.id)::integer as total_reviews
      FROM users u
      LEFT JOIN ratings r ON r.seller_id = u.id AND r.target_type = 'seller'
      GROUP BY u.id, u.name, u.business_name;
      
      GRANT SELECT ON seller_ratings_view TO authenticated, anon;
    `;
    
    const { error: errorView } = await supabase.rpc('execute_sql', { 
      sql_query: createViewSQL 
    });
    
    if (errorView) {
      console.log('⚠️ No se pudo crear la vista (función RPC no disponible)');
      console.log('   La vista se debe crear manualmente en Supabase SQL Editor');
    } else {
      console.log('✅ seller_ratings_view creada exitosamente');
    }
    
    // 5. Verificación final
    console.log('\n5️⃣ VERIFICACIÓN FINAL:');
    
    // Test daily_products
    const { data: testDaily, error: errorTestDaily } = await supabase
      .from('daily_products')
      .select('id, name, seller_id')
      .limit(3);
    
    if (errorTestDaily) {
      console.error('❌ Error en test daily_products:', errorTestDaily);
    } else {
      console.log(`✅ daily_products funciona: ${testDaily?.length || 0} productos`);
    }
    
    // Test seller_ratings_view
    const { data: testRatings, error: errorTestRatings } = await supabase
      .from('seller_ratings_view')
      .select('seller_id, average_rating')
      .limit(3);
    
    if (errorTestRatings) {
      console.error('❌ Error en test seller_ratings_view:', errorTestRatings);
      console.log('   Necesitas crear la vista manualmente en Supabase');
    } else {
      console.log(`✅ seller_ratings_view funciona: ${testRatings?.length || 0} sellers`);
    }
    
    console.log('\n🎉 CORRECCIÓN COMPLETADA!');
    console.log('📝 PASOS ADICIONALES SI AÚN HAY ERRORES:');
    console.log('   1. Crear seller_ratings_view manualmente en Supabase SQL Editor');
    console.log('   2. Verificar políticas RLS de daily_products');
    console.log('   3. Usar el script debug-400-errors.js en el navegador para más detalles');
    
  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

corregirErrores400();
