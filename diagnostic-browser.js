// Diagnóstico completo del sistema de notificaciones
// Ejecuta este script en la consola del navegador (F12)

console.log('🔍 DIAGNÓSTICO SISTEMA DE NOTIFICACIONES TRATO APP');
console.log('================================================');

const diagnostics = {
  environment: {},
  notifications: {},
  audio: {},
  realtime: {},
  errors: []
};

// 1. Información del entorno
console.log('\n📱 1. INFORMACIÓN DEL ENTORNO');
console.log('-----------------------------');

try {
  diagnostics.environment = {
    userAgent: navigator.userAgent,
    isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
    isHTTPS: window.location.protocol === 'https:',
    url: window.location.href,
    timestamp: new Date().toISOString()
  };
  
  console.log('✅ Dispositivo:', diagnostics.environment.isMobile ? 'Móvil' : 'Escritorio');
  console.log('✅ Protocolo:', diagnostics.environment.isHTTPS ? 'HTTPS ✓' : 'HTTP ❌');
  console.log('✅ URL:', diagnostics.environment.url);
} catch (error) {
  diagnostics.errors.push(`Error en diagnóstico de entorno: ${error.message}`);
  console.error('❌ Error:', error);
}

// 2. Capacidades de notificaciones
console.log('\n🔔 2. CAPACIDADES DE NOTIFICACIONES');
console.log('----------------------------------');

try {
  diagnostics.notifications = {
    apiSupported: 'Notification' in window,
    permission: Notification.permission,
    serviceWorkerSupported: 'serviceWorker' in navigator,
    pushSupported: 'PushManager' in window,
    vapidSupported: 'showNotification' in ServiceWorkerRegistration.prototype
  };
  
  console.log('✅ API Notifications:', diagnostics.notifications.apiSupported ? 'Soportada ✓' : 'No soportada ❌');
  console.log('✅ Permisos:', diagnostics.notifications.permission);
  console.log('✅ Service Worker:', diagnostics.notifications.serviceWorkerSupported ? 'Soportado ✓' : 'No soportado ❌');
  console.log('✅ Push Manager:', diagnostics.notifications.pushSupported ? 'Soportado ✓' : 'No soportado ❌');
  console.log('✅ VAPID:', diagnostics.notifications.vapidSupported ? 'Soportado ✓' : 'No soportado ❌');
  
  // Test de notificación si tiene permisos
  if (diagnostics.notifications.permission === 'granted') {
    console.log('🧪 Probando notificación...');
    new Notification('🧪 Test TRATO', {
      body: 'Diagnóstico de notificaciones - si ves esto funciona!',
      icon: '/icon-192x192.png',
      tag: 'diagnostic-test'
    });
    console.log('✅ Notificación de prueba enviada');
  }
} catch (error) {
  diagnostics.errors.push(`Error en diagnóstico de notificaciones: ${error.message}`);
  console.error('❌ Error:', error);
}

// 3. Capacidades de audio
console.log('\n🔊 3. CAPACIDADES DE AUDIO');
console.log('-------------------------');

try {
  diagnostics.audio = {
    audioContextSupported: 'AudioContext' in window || 'webkitAudioContext' in window,
    audioSupported: 'Audio' in window,
    canPlayMP3: false,
    canPlayWAV: false,
    audioContextState: null
  };
  
  // Test AudioContext
  if (diagnostics.audio.audioContextSupported) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const testContext = new AudioContextClass();
    diagnostics.audio.audioContextState = testContext.state;
    testContext.close();
  }
  
  // Test Audio formats
  if (diagnostics.audio.audioSupported) {
    const testAudio = new Audio();
    diagnostics.audio.canPlayMP3 = testAudio.canPlayType('audio/mpeg') !== '';
    diagnostics.audio.canPlayWAV = testAudio.canPlayType('audio/wav') !== '';
  }
  
  console.log('✅ AudioContext:', diagnostics.audio.audioContextSupported ? 'Soportado ✓' : 'No soportado ❌');
  console.log('✅ Audio Element:', diagnostics.audio.audioSupported ? 'Soportado ✓' : 'No soportado ❌');
  console.log('✅ MP3:', diagnostics.audio.canPlayMP3 ? 'Soportado ✓' : 'No soportado ❌');
  console.log('✅ WAV:', diagnostics.audio.canPlayWAV ? 'Soportado ✓' : 'No soportado ❌');
  console.log('✅ Estado AudioContext:', diagnostics.audio.audioContextState || 'N/A');
  
  // Test de sonido básico
  if (diagnostics.audio.audioSupported) {
    console.log('🧪 Probando sonido básico...');
    const testAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEYBDyb3/LNeSsFJYHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEYBDyb3/LNeSsFJYHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEYBDyb3/LNeSsFJYHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEYBDyb3/LNeSsFJYHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEYBDyb3/LNeSsFJYHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEYBDyb3/LNeSsFJYHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEYBDyb3/LNeSsFJYHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEYBDyb3/LNeSsFJYHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEYBDyb3/LNeSsFJYHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEYBDyb3/LNeSsFJYHO8tiJNwgZaLvt559NEAxQp+PwtmM');
    testAudio.volume = 0.1;
    testAudio.play().then(() => {
      console.log('✅ Sonido de prueba reproducido correctamente');
    }).catch(error => {
      console.log('❌ Error al reproducir sonido:', error.message);
      diagnostics.errors.push(`Error de audio: ${error.message}`);
    });
  }
} catch (error) {
  diagnostics.errors.push(`Error en diagnóstico de audio: ${error.message}`);
  console.error('❌ Error:', error);
}

// 4. Conexión Supabase Realtime
console.log('\n🔄 4. CONEXIÓN SUPABASE REALTIME');
console.log('-------------------------------');

try {
  // Verificar si Supabase está disponible
  if (typeof window.supabase !== 'undefined' || typeof supabase !== 'undefined') {
    console.log('✅ Cliente Supabase encontrado');
    
    // Test de conexión realtime (si supabase está disponible)
    const testRealtime = async () => {
      try {
        const client = window.supabase || supabase;
        console.log('🧪 Probando conexión realtime...');
        
        const channel = client
          .channel('diagnostic-test')
          .on('broadcast', { event: 'test' }, (payload) => {
            console.log('✅ Mensaje realtime recibido:', payload);
            diagnostics.realtime.connected = true;
          })
          .subscribe((status) => {
            console.log('🔄 Estado del canal:', status);
            diagnostics.realtime.status = status;
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ Canal suscrito, enviando mensaje de prueba...');
              channel.send({
                type: 'broadcast',
                event: 'test',
                payload: { message: 'test diagnostic', timestamp: Date.now() }
              });
            }
          });
        
        // Cleanup después de 5 segundos
        setTimeout(() => {
          client.removeChannel(channel);
          console.log('🧹 Canal de prueba limpiado');
        }, 5000);
        
      } catch (error) {
        console.error('❌ Error en test realtime:', error);
        diagnostics.errors.push(`Error realtime: ${error.message}`);
      }
    };
    
    testRealtime();
  } else {
    console.log('❌ Cliente Supabase no encontrado');
    diagnostics.errors.push('Cliente Supabase no disponible');
  }
} catch (error) {
  diagnostics.errors.push(`Error en diagnóstico realtime: ${error.message}`);
  console.error('❌ Error:', error);
}

// 5. Verificar localStorage y configuración
console.log('\n💾 5. ALMACENAMIENTO LOCAL');
console.log('-------------------------');

try {
  const soundSettings = localStorage.getItem('trato-sound-notifications');
  const authUser = localStorage.getItem('supabase.auth.token');
  
  console.log('✅ Configuración de sonido:', soundSettings || 'No configurado');
  console.log('✅ Usuario autenticado:', authUser ? 'Sí' : 'No');
  
  diagnostics.storage = {
    soundSettings: soundSettings,
    hasAuth: !!authUser,
    localStorageAvailable: typeof Storage !== 'undefined'
  };
} catch (error) {
  diagnostics.errors.push(`Error en almacenamiento: ${error.message}`);
  console.error('❌ Error:', error);
}

// 6. Resumen y recomendaciones
console.log('\n📋 6. RESUMEN Y RECOMENDACIONES');
console.log('==============================');

const issues = [];
const recommendations = [];

// Verificar problemas críticos
if (!diagnostics.environment.isHTTPS) {
  issues.push('❌ CRÍTICO: Se requiere HTTPS para notificaciones');
  recommendations.push('🔧 Usar https://localhost:5173 en desarrollo');
}

if (diagnostics.notifications.permission !== 'granted') {
  issues.push('⚠️ Permisos de notificación no otorgados');
  recommendations.push('🔧 Solicitar permisos de notificación al usuario');
}

if (!diagnostics.notifications.apiSupported) {
  issues.push('❌ CRÍTICO: API de notificaciones no soportada');
  recommendations.push('🔧 Usar navegador compatible (Chrome, Firefox, Safari)');
}

if (!diagnostics.audio.audioContextSupported) {
  issues.push('⚠️ AudioContext no soportado');
  recommendations.push('🔧 Fallback a elemento Audio HTML5');
}

// Mostrar resumen
if (issues.length === 0) {
  console.log('🎉 ¡SISTEMA DE NOTIFICACIONES LISTO!');
  console.log('✅ Todos los componentes funcionan correctamente');
} else {
  console.log('⚠️ PROBLEMAS ENCONTRADOS:');
  issues.forEach(issue => console.log(issue));
  
  console.log('\n🔧 RECOMENDACIONES:');
  recommendations.forEach(rec => console.log(rec));
}

// Mostrar errores si los hay
if (diagnostics.errors.length > 0) {
  console.log('\n❌ ERRORES DETECTADOS:');
  diagnostics.errors.forEach(error => console.log('   ', error));
}

// Exportar diagnóstico completo
console.log('\n📤 DIAGNÓSTICO COMPLETO:');
console.log('========================');
console.log(JSON.stringify(diagnostics, null, 2));

// Función helper para copiar diagnóstico
window.copyDiagnostics = () => {
  const report = `
DIAGNÓSTICO SISTEMA NOTIFICACIONES TRATO APP
Fecha: ${new Date().toLocaleString()}

ENTORNO:
- Dispositivo: ${diagnostics.environment.isMobile ? 'Móvil' : 'Escritorio'}
- HTTPS: ${diagnostics.environment.isHTTPS ? 'Sí' : 'No'}
- URL: ${diagnostics.environment.url}

NOTIFICACIONES:
- API: ${diagnostics.notifications.apiSupported ? 'Soportada' : 'No soportada'}
- Permisos: ${diagnostics.notifications.permission}
- Service Worker: ${diagnostics.notifications.serviceWorkerSupported ? 'Sí' : 'No'}

AUDIO:
- AudioContext: ${diagnostics.audio.audioContextSupported ? 'Sí' : 'No'}
- Estado: ${diagnostics.audio.audioContextState || 'N/A'}

PROBLEMAS: ${issues.length}
${issues.join('\n')}

RECOMENDACIONES: ${recommendations.length}
${recommendations.join('\n')}

ERRORES: ${diagnostics.errors.length}
${diagnostics.errors.join('\n')}
`;
  
  navigator.clipboard.writeText(report).then(() => {
    console.log('📋 Diagnóstico copiado al portapapeles');
  });
};

console.log('\n💡 Para copiar el diagnóstico completo ejecuta: copyDiagnostics()');
