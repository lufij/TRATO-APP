/*
 * CORRECTOR DE ERRORES 400 - SELLER DASHBOARD
 * 
 * INSTRUCCIONES:
 * 1. Abre la app en el navegador (http://localhost:5174)
 * 2. Abre DevTools (F12)  
 * 3. Ve a la pestaña Console
 * 4. Copia y pega este código completo
 * 5. Presiona Enter para ejecutar
 */

console.log('🔧 INICIANDO CORRECCIÓN DE ERRORES 400...\n');

async function corregirErrores400Navegador() {
  try {
    // Verificar que Supabase esté disponible
    if (!window.supabase) {
      console.error('❌ Supabase no está disponible en window');
      console.log('💡 Asegúrate de estar en la página de la app (localhost:5174)');
      return;
    }
    
    console.log('✅ Supabase client encontrado');
    
    // 1. Verificar autenticación
    console.log('\n1️⃣ VERIFICANDO AUTENTICACIÓN...');
    const { data: { user }, error: authError } = await window.supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Error de autenticación:', authError);
    } else if (!user) {
      console.log('⚠️ No hay usuario autenticado');
      console.log('💡 Inicia sesión y vuelve a ejecutar este script');
      return;
    } else {
      console.log('✅ Usuario autenticado:', user.email);
      console.log('   ID:', user.id);
      console.log('   Role:', user.user_metadata?.role || 'no definido');
    }
    
    // 2. Probar consultas específicas que fallan
    console.log('\n2️⃣ PROBANDO CONSULTAS PROBLEMÁTICAS...');
    
    // Test 1: daily_products sin filtros
    console.log('\n📋 Test 1: daily_products (básico)');
    try {
      const { data: dailyBasic, error: dailyBasicError } = await window.supabase
        .from('daily_products')
        .select('id, name, seller_id')
        .limit(5);
      
      if (dailyBasicError) {
        console.error('❌ Error:', dailyBasicError);
        
        // Analizar el error
        if (dailyBasicError.message?.includes('RLS')) {
          console.log('🔒 PROBLEMA: Política RLS muy restrictiva');
        } else if (dailyBasicError.code === '42P01') {
          console.log('❓ PROBLEMA: Tabla daily_products no existe');
        }
      } else {
        console.log('✅ OK:', dailyBasic?.length || 0, 'productos');
        
        // Verificar si hay productos sin seller_id
        const sinSeller = dailyBasic?.filter(p => !p.seller_id);
        if (sinSeller?.length > 0) {
          console.log(`⚠️ PROBLEMA: ${sinSeller.length} productos sin seller_id`);
        }
      }
    } catch (error) {
      console.error('💥 Error en test básico:', error);
    }
    
    // Test 2: daily_products del usuario actual
    console.log('\n📋 Test 2: daily_products del usuario actual');
    try {
      const { data: userDaily, error: userDailyError } = await window.supabase
        .from('daily_products')
        .select('*')
        .eq('seller_id', user.id)
        .gte('expires_at', new Date().toISOString());
      
      if (userDailyError) {
        console.error('❌ Error:', userDailyError);
      } else {
        console.log('✅ OK:', userDaily?.length || 0, 'productos del usuario');
      }
    } catch (error) {
      console.error('💥 Error en test usuario:', error);
    }
    
    // Test 3: seller_ratings_view
    console.log('\n📋 Test 3: seller_ratings_view');
    try {
      const { data: ratings, error: ratingsError } = await window.supabase
        .from('seller_ratings_view')
        .select('seller_id, average_rating, total_reviews')
        .eq('seller_id', user.id)
        .single();
      
      if (ratingsError) {
        console.error('❌ Error:', ratingsError);
        
        if (ratingsError.code === '42P01') {
          console.log('❓ PROBLEMA: Vista seller_ratings_view no existe');
          console.log('💡 SOLUCIÓN: Crear la vista manualmente');
        }
      } else {
        console.log('✅ OK: Rating promedio:', ratings?.average_rating || 0);
      }
    } catch (error) {
      console.error('💥 Error en test ratings:', error);
    }
    
    // Test 4: orders
    console.log('\n📋 Test 4: orders del seller');
    try {
      const { data: orders, error: ordersError } = await window.supabase
        .from('orders')
        .select('id, total, status')
        .eq('seller_id', user.id)
        .limit(5);
      
      if (ordersError) {
        console.error('❌ Error:', ordersError);
      } else {
        console.log('✅ OK:', orders?.length || 0, 'órdenes');
      }
    } catch (error) {
      console.error('💥 Error en test orders:', error);
    }
    
    // 3. Intentar correcciones básicas
    console.log('\n3️⃣ APLICANDO CORRECCIONES BÁSICAS...');
    
    // Solo podemos hacer correcciones limitadas desde el cliente
    console.log('ℹ️ Las correcciones principales requieren acceso a base de datos');
    console.log('📝 ACCIONES RECOMENDADAS:');
    
    console.log('\n🔧 SI HAY PRODUCTOS SIN SELLER_ID:');
    console.log('   - Ejecutar el SQL: CORREGIR_ERRORES_400_SELLER.sql en Supabase SQL Editor');
    
    console.log('\n🔧 SI seller_ratings_view NO EXISTE:');
    console.log('   - Crear esta vista en Supabase SQL Editor:');
    console.log(`
CREATE OR REPLACE VIEW seller_ratings_view AS
SELECT 
  u.id as seller_id,
  u.name as seller_name,
  COALESCE(u.business_name, 'General') as business_name,
  COALESCE(AVG(r.rating), 0.0)::numeric(3,2) as average_rating,
  COUNT(r.id)::integer as total_reviews
FROM users u
LEFT JOIN ratings r ON r.seller_id = u.id 
GROUP BY u.id, u.name, u.business_name;

GRANT SELECT ON seller_ratings_view TO authenticated, anon;
    `);
    
    console.log('\n🔧 POLÍTICAS RLS MÁS PERMISIVAS:');
    console.log('   - Ejecutar en Supabase SQL Editor:');
    console.log(`
DROP POLICY IF EXISTS "daily_products_select_policy" ON daily_products;
CREATE POLICY "daily_products_select_policy" ON daily_products
  FOR SELECT USING (
    expires_at > NOW() OR auth.uid() = seller_id OR auth.role() = 'anon'
  );
    `);
    
    console.log('\n🎉 DIAGNÓSTICO COMPLETADO!');
    console.log('📋 RESUMEN:');
    console.log('   - Ejecuta los SQL sugeridos en Supabase SQL Editor');
    console.log('   - Recarga la página después de aplicar las correcciones');
    console.log('   - Los errores 400 deberían desaparecer');
    
  } catch (error) {
    console.error('💥 Error general en corrección:', error);
  }
}

// Ejecutar la corrección automáticamente
corregirErrores400Navegador();

// También hacer disponible como función global
window.corregirErrores400 = corregirErrores400Navegador;

console.log('\n📖 COMANDOS DISPONIBLES:');
console.log('   - corregirErrores400() - Ejecutar diagnóstico nuevamente');
console.log('   - Usa el script debug-400-errors.js para interceptar requests');
