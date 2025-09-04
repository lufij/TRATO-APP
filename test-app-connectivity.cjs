// 🧪 TEST DE CONECTIVIDAD DE LA APLICACIÓN
console.log('🔗 Verificando conectividad de la aplicación...\n');

// Test simple de fetch a la aplicación
async function testApp() {
  try {
    console.log('1️⃣ Probando conexión a http://localhost:5173/');
    const response = await fetch('http://localhost:5173/');
    
    if (response.ok) {
      console.log('✅ Aplicación responde correctamente');
      console.log('   Status:', response.status);
      console.log('   Content-Type:', response.headers.get('content-type'));
      
      // Verificar si es HTML válido
      const html = await response.text();
      if (html.includes('<title>') && html.includes('</title>')) {
        console.log('✅ HTML válido recibido');
        
        // Buscar elementos específicos
        if (html.includes('root')) {
          console.log('✅ Elemento root encontrado');
        }
        if (html.includes('vite')) {
          console.log('✅ Vite configurado correctamente');
        }
      } else {
        console.log('❌ HTML inválido o incompleto');
      }
    } else {
      console.log('❌ Error en respuesta:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
    console.log('   Verifica que el servidor esté corriendo en http://localhost:5173/');
  }
}

testApp();
