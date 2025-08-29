// =====================================================
// 🔧 FIX CRÍTICO: CACHE BUSTING PARA STOCK NO ACTUALIZADO
// =====================================================

// Este archivo contiene las funciones para limpiar cache y forzar actualización
// de datos cuando el stock no se refleja correctamente en la vista del comprador

export const forceClearSupabaseCache = () => {
  console.log('🧹 LIMPIANDO CACHE DE SUPABASE...');
  
  // Limpiar localStorage si hay cache ahí
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('supabase') || key.includes('products') || key.includes('stock')) {
        localStorage.removeItem(key);
        console.log('🗑️ Eliminado cache:', key);
      }
    });
  } catch (error) {
    console.error('Error limpiando localStorage:', error);
  }

  // Limpiar sessionStorage
  try {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.includes('supabase') || key.includes('products') || key.includes('stock')) {
        sessionStorage.removeItem(key);
        console.log('🗑️ Eliminado sessionStorage:', key);
      }
    });
  } catch (error) {
    console.error('Error limpiando sessionStorage:', error);
  }
};

export const forceRefreshWithTimestamp = () => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  
  console.log('⏰ Forzando refresh con timestamp:', timestamp, 'id:', randomId);
  
  return {
    timestamp,
    randomId,
    cacheBuster: `${timestamp}_${randomId}`
  };
};

// Función para agregar parámetros anti-cache a queries de Supabase
export const addCacheBuster = (supabaseQuery: any) => {
  const { cacheBuster } = forceRefreshWithTimestamp();
  
  // Nota: Supabase no soporta parámetros URL personalizados en queries,
  // pero podemos usar esto para forzar re-render en el frontend
  return {
    query: supabaseQuery,
    cacheBuster,
    forceRefresh: true
  };
};
