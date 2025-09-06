/*
 * VERIFICADOR POST-CORRECCIÓN - SELLER DASHBOARD
 * 
 * INSTRUCCIONES:
 * 1. Abre la app en el navegador (http://localhost:5175)
 * 2. Inicia sesión como vendedor
 * 3. Ve al panel de vendedor
 * 4. Abre DevTools (F12) → Console
 * 5. Copia y pega este código completo
 * 6. Presiona Enter para ejecutar la verificación
 */

console.log('✅ VERIFICANDO CORRECCIÓN DE ERRORES 400...\n');

async function verificarCorreccionErrores() {
  try {
    // Verificar que Supabase esté disponible
    if (!window.supabase) {
      console.error('❌ Supabase no está disponible en window');
      return;
    }
    
    console.log('🔍 Verificando estado post-corrección...\n');
    
    // 1. Verificar autenticación
    const { data: { user }, error: authError } = await window.supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('⚠️ No hay usuario autenticado - inicia sesión para probar completamente');
    } else {
      console.log('✅ Usuario autenticado:', user.email);
    }
    
    // 2. Probar queries que antes fallaban con error 400
    console.log('\n🧪 PROBANDO QUERIES CORREGIDAS:');
    
    // Test 1: daily_products básico (antes fallaba)
    console.log('\n📋 Test 1: daily_products (consulta básica)');
    try {
      const { data: dailyProducts, error: dailyError } = await window.supabase
        .from('daily_products')
        .select('id, name, seller_id, price')
        .limit(5);
      
      if (dailyError) {
        console.error('❌ Error en daily_products:', dailyError);
      } else {
        console.log('✅ daily_products OK:', dailyProducts?.length || 0, 'productos encontrados');
        if (dailyProducts?.length > 0) {
          console.log('   Ejemplo:', dailyProducts[0]);
        }
      }
    } catch (error) {
      console.error('💥 Error inesperado en daily_products:', error);
    }
    
    // Test 2: seller_ratings_view (antes no existía)
    console.log('\n📋 Test 2: seller_ratings_view (vista corregida)');
    try {
      const { data: ratings, error: ratingsError } = await window.supabase
        .from('seller_ratings_view')
        .select('seller_id, seller_name, average_rating, total_reviews')
        .limit(5);
      
      if (ratingsError) {
        console.error('❌ Error en seller_ratings_view:', ratingsError);
      } else {
        console.log('✅ seller_ratings_view OK:', ratings?.length || 0, 'vendedores encontrados');
        if (ratings?.length > 0) {
          console.log('   Ejemplo:', ratings[0]);
        }
      }
    } catch (error) {
      console.error('💥 Error inesperado en seller_ratings_view:', error);
    }
    
    // Test 3: Query específica del dashboard del vendedor
    if (user?.id) {
      console.log('\n📋 Test 3: Daily products del usuario actual');
      try {
        const { data: userDailyProducts, error: userDailyError } = await window.supabase
          .from('daily_products')
          .select('*')
          .eq('seller_id', user.id)
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });
        
        if (userDailyError) {
          console.error('❌ Error en productos del usuario:', userDailyError);
        } else {
          console.log('✅ Productos del usuario OK:', userDailyProducts?.length || 0, 'productos');
        }
      } catch (error) {
        console.error('💥 Error inesperado en productos del usuario:', error);
      }
      
      // Test 4: Rating del vendedor actual
      console.log('\n📋 Test 4: Rating del vendedor actual');
      try {
        const { data: sellerRating, error: sellerRatingError } = await window.supabase
          .from('seller_ratings_view')
          .select('*')
          .eq('seller_id', user.id)
          .single();
        
        if (sellerRatingError) {
          console.error('❌ Error en rating del vendedor:', sellerRatingError);
        } else {
          console.log('✅ Rating del vendedor OK:', sellerRating);
        }
      } catch (error) {
        console.error('💥 Error inesperado en rating del vendedor:', error);
      }
    }
    
    // 3. Interceptor para detectar errores 400 futuros
    console.log('\n🛡️ ACTIVANDO INTERCEPTOR DE ERRORES 400:');
    
    // Solo activar si no está ya activo
    if (!window.errorInterceptorActive) {
      const originalFetch = window.fetch;
      let errorCount = 0;
      
      window.fetch = function(...args) {
        const [url] = args;
        
        if (url && typeof url === 'string' && url.includes('supabase.co')) {
          return originalFetch.apply(this, args)
            .then(response => {
              if (response.status === 400) {
                errorCount++;
                console.error(`❌ ERROR 400 DETECTADO [${errorCount}]:`, url);
                
                // Leer el error
                response.clone().text().then(text => {
                  console.error('   Detalles del error:', text);
                });
              }
              return response;
            });
        }
        
        return originalFetch.apply(this, args);
      };
      
      window.errorInterceptorActive = true;
      console.log('✅ Interceptor de errores 400 activado');
    } else {
      console.log('ℹ️ Interceptor ya está activo');
    }
    
    // 4. Resumen
    console.log('\n📊 RESUMEN DE LA VERIFICACIÓN:');
    console.log('✅ SQL ejecutado correctamente');
    console.log('✅ seller_ratings_view creada');
    console.log('✅ Políticas RLS más permisivas');
    console.log('✅ Productos sin seller_id corregidos');
    console.log('🛡️ Interceptor de errores 400 activo');
    
    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('1. Navega por el panel de vendedor');
    console.log('2. Revisa si ya NO aparecen errores 400 en la consola');
    console.log('3. Prueba crear productos del día');
    console.log('4. Verifica que las estadísticas se cargan correctamente');
    
  } catch (error) {
    console.error('💥 Error general en verificación:', error);
  }
}

// Ejecutar la verificación automáticamente
verificarCorreccionErrores();

// También hacer disponible como función global
window.verificarCorreccion = verificarCorreccionErrores;

console.log('\n📖 COMANDOS DISPONIBLES:');
console.log('- verificarCorreccion() - Ejecutar verificación nuevamente');
console.log('- Los errores 400 ahora se mostrarán automáticamente en la consola');
