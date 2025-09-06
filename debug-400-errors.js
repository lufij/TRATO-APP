// Script de interceptor para detectar errores 400 en navegador
console.log('🔍 INTERCEPTOR DE ERRORES 400 ACTIVADO');

// Interceptar fetch para detectar errores 400
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const [url, options] = args;
  
  // Solo interceptar requests de Supabase
  if (url && typeof url === 'string' && url.includes('supabase.co')) {
    console.group(`🌐 SUPABASE REQUEST: ${new Date().toISOString().slice(11, 19)}`);
    console.log('URL:', url);
    console.log('Method:', options?.method || 'GET');
    console.log('Headers:', options?.headers || {});
    
    return originalFetch.apply(this, args)
      .then(response => {
        if (response.status === 400) {
          console.error('❌ 400 BAD REQUEST DETECTADO:');
          console.log('Status:', response.status);
          console.log('StatusText:', response.statusText);
          console.log('Headers:', Object.fromEntries(response.headers.entries()));
          
          // Intentar leer el cuerpo del error
          response.clone().text().then(text => {
            console.log('Response Body:', text);
            try {
              const jsonError = JSON.parse(text);
              console.log('Error JSON:', jsonError);
              
              // Analizar tipos comunes de error
              if (jsonError.message) {
                if (jsonError.message.includes('RLS')) {
                  console.log('🔒 CAUSA PROBABLE: Política RLS demasiado restrictiva');
                } else if (jsonError.message.includes('null value')) {
                  console.log('⚠️ CAUSA PROBABLE: Campo requerido es NULL');
                } else if (jsonError.message.includes('foreign key')) {
                  console.log('🔗 CAUSA PROBABLE: Referencia foránea inválida');
                } else if (jsonError.message.includes('does not exist')) {
                  console.log('❓ CAUSA PROBABLE: Tabla o columna no existe');
                }
              }
            } catch (e) {
              console.log('Error no es JSON válido');
            }
          }).catch(() => {
            console.log('No se pudo leer el cuerpo de la respuesta');
          });
        } else if (response.ok) {
          console.log('✅ Request exitosa:', response.status);
        } else {
          console.warn('⚠️ Request con error:', response.status, response.statusText);
        }
        console.groupEnd();
        return response;
      })
      .catch(error => {
        console.error('💥 Error en fetch:', error);
        console.groupEnd();
        throw error;
      });
  }
  
  return originalFetch.apply(this, args);
};

// Función para revisar estado de autenticación
async function checkAuthStatus() {
  console.log('\n👤 VERIFICANDO AUTENTICACIÓN...');
  
  try {
    if (!window.supabase) {
      console.error('❌ Supabase client no disponible');
      return null;
    }
    
    const { data: { user }, error } = await window.supabase.auth.getUser();
    
    if (error) {
      console.error('❌ Error de auth:', error);
      return null;
    } else if (!user) {
      console.log('⚠️ Usuario no autenticado');
      return null;
    } else {
      console.log('✅ Usuario autenticado:');
      console.log('  ID:', user.id);
      console.log('  Email:', user.email);
      console.log('  Role:', user.user_metadata?.role || 'no definido');
      return user;
    }
  } catch (error) {
    console.error('💥 Error verificando auth:', error);
    return null;
  }
}

// Función para probar queries específicas del SellerDashboard
async function testSellerDashboardQueries() {
  console.log('\n🧪 PROBANDO QUERIES DEL SELLER DASHBOARD...');
  
  const user = await checkAuthStatus();
  if (!user) {
    console.log('❌ No se puede probar sin usuario autenticado');
    return;
  }
  
  try {
    // 1. Test daily_products con seller_id del usuario actual
    console.log('\n1️⃣ Probando daily_products del usuario actual...');
    const { data: dailyProducts, error: dailyError } = await window.supabase
      .from('daily_products')
      .select('*')
      .eq('seller_id', user.id)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    if (dailyError) {
      console.error('❌ Error en daily_products:', dailyError);
    } else {
      console.log('✅ daily_products OK:', dailyProducts?.length || 0, 'productos');
    }
    
    // 2. Test products regulares
    console.log('\n2️⃣ Probando products del usuario actual...');
    const { data: products, error: productsError } = await window.supabase
      .from('products')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });
    
    if (productsError) {
      console.error('❌ Error en products:', productsError);
    } else {
      console.log('✅ products OK:', products?.length || 0, 'productos');
    }
    
    // 3. Test seller_ratings_view
    console.log('\n3️⃣ Probando seller_ratings_view...');
    const { data: ratings, error: ratingsError } = await window.supabase
      .from('seller_ratings_view')
      .select('average_rating, total_reviews')
      .eq('seller_id', user.id)
      .single();
    
    if (ratingsError) {
      console.error('❌ Error en seller_ratings_view:', ratingsError);
    } else {
      console.log('✅ seller_ratings_view OK:', ratings);
    }
    
    // 4. Test orders del seller
    console.log('\n4️⃣ Probando orders del seller...');
    const { data: orders, error: ordersError } = await window.supabase
      .from('orders')
      .select('id, total, status, created_at')
      .eq('seller_id', user.id);
    
    if (ordersError) {
      console.error('❌ Error en orders:', ordersError);
    } else {
      console.log('✅ orders OK:', orders?.length || 0, 'órdenes');
    }
    
  } catch (error) {
    console.error('💥 Error general probando queries:', error);
  }
}

console.log('\n📋 COMANDOS DISPONIBLES:');
console.log('- testSellerDashboardQueries() - Probar todas las queries del dashboard');
console.log('- checkAuthStatus() - Verificar autenticación');
console.log('- El interceptor de fetch está activo para mostrar errores 400');

// Auto-ejecutar verificación de auth al cargar
checkAuthStatus();
