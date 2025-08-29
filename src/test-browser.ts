// Verificar si las variables de entorno se cargan correctamente en el navegador

console.log('🔍 Verificando variables de entorno...');
console.log('URL de Supabase:', import.meta.env.VITE_SUPABASE_URL);
console.log('Anon Key de Supabase:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Definida' : '❌ No definida');

// Test de conexión simple
async function testBrowserConnection() {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      console.error('❌ Variables de entorno no definidas');
      return;
    }
    
    console.log('🔄 Probando conexión desde el navegador...');
    
    const response = await fetch(`${url}/rest/v1/orders?select=id&limit=1`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    
    if (response.ok) {
      console.log('✅ Conexión exitosa desde el navegador');
    } else {
      console.error('❌ Error de conexión:', response.status, response.statusText);
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

// Ejecutar cuando se carga la página
document.addEventListener('DOMContentLoaded', testBrowserConnection);

export default testBrowserConnection;
