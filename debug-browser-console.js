// Script para depurar órdenes en la consola del navegador
// Ejecutar este código en DevTools Console

console.log('🔍 Iniciando diagnóstico de órdenes en navegador...');

// 1. Verificar usuario actual
const checkUser = () => {
  const authContext = window.React && window.React.useContext ? 'available' : 'no disponible';
  console.log('React context:', authContext);
  
  // Verificar si hay datos en localStorage
  const session = localStorage.getItem('sb-dzqmorkoxzaubkfulfd-auth-token');
  if (session) {
    try {
      const parsed = JSON.parse(session);
      console.log('Usuario en sesión:', parsed.user?.id, parsed.user?.email);
      return parsed.user?.id;
    } catch (e) {
      console.error('Error parsing session:', e);
    }
  }
  return null;
};

// 2. Verificar conexión a Supabase
const testSupabaseConnection = async () => {
  try {
    // Esta función se debe ejecutar desde la consola del navegador
    // donde ya está importado supabase
    if (window.supabase) {
      console.log('✅ Supabase client disponible');
      
      // Test simple
      const { data, error } = await window.supabase
        .from('users')
        .select('id')
        .limit(1);
        
      if (error) {
        console.error('❌ Error conectando a Supabase:', error);
      } else {
        console.log('✅ Conexión a Supabase exitosa');
      }
    } else {
      console.error('❌ Supabase client no disponible en window');
    }
  } catch (error) {
    console.error('❌ Error en test de conexión:', error);
  }
};

// 3. Verificar órdenes específicas
const checkOrders = async (userId) => {
  if (!userId) {
    console.log('❌ No hay userId para verificar órdenes');
    return;
  }
  
  try {
    console.log('🔍 Verificando órdenes para usuario:', userId);
    
    // Consulta simple primero
    const { data: simpleOrders, error: simpleError } = await window.supabase
      .from('orders')
      .select('*')
      .eq('seller_id', userId)
      .limit(5);
      
    if (simpleError) {
      console.error('❌ Error en consulta simple de órdenes:', simpleError);
    } else {
      console.log('✅ Órdenes encontradas:', simpleOrders?.length || 0);
      if (simpleOrders && simpleOrders.length > 0) {
        console.log('   Primera orden:', simpleOrders[0]);
      }
    }
    
    // Consulta con join
    const { data: complexOrders, error: complexError } = await window.supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('seller_id', userId)
      .limit(2);
      
    if (complexError) {
      console.error('❌ Error en consulta con join:', complexError);
    } else {
      console.log('✅ Consulta con join exitosa:', complexOrders?.length || 0);
    }
    
  } catch (error) {
    console.error('❌ Error general verificando órdenes:', error);
  }
};

// 4. Ejecutar diagnóstico completo
const runDiagnostic = async () => {
  console.log('\n=== DIAGNÓSTICO COMPLETO ===');
  
  const userId = checkUser();
  await testSupabaseConnection();
  await checkOrders(userId);
  
  console.log('\n=== FIN DIAGNÓSTICO ===');
};

// Instrucciones para el usuario
console.log(`
🚀 INSTRUCCIONES:
1. Abre las Developer Tools (F12)
2. Ve a la tab Console
3. Ejecuta: runDiagnostic()
4. Revisa los resultados

También puedes ejecutar funciones individuales:
- checkUser()
- testSupabaseConnection() 
- checkOrders('tu-user-id')
`);

// Hacer funciones disponibles globalmente
window.debugOrders = {
  checkUser,
  testSupabaseConnection,
  checkOrders,
  runDiagnostic
};
