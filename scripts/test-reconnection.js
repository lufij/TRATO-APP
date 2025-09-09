/**
 * 🔧 SCRIPT PARA FORZAR Y PROBAR RECONEXIÓN DE REALTIME
 * 
 * Este script simula problemas de conexión para probar
 * el sistema de reconexión automática
 */

function forzarDesconexion() {
  console.log('🔌 Forzando desconexión de Realtime...');
  
  // Buscar y cerrar canales existentes
  if (window.supabase) {
    try {
      // Obtener referencia al cliente de Supabase
      const supabase = window.supabase;
      
      // Simular desconexión cerrando el WebSocket
      if (supabase.realtime) {
        console.log('🔌 Cerrando conexión WebSocket...');
        
        // Forzar desconexión del realtime
        supabase.realtime.disconnect();
        
        setTimeout(() => {
          console.log('🔄 Intentando reconectar...');
          supabase.realtime.connect();
        }, 3000);
        
        console.log('✅ Desconexión forzada - sistema debería reconectar automáticamente');
      } else {
        console.warn('⚠️ No se encontró realtime en Supabase');
      }
    } catch (error) {
      console.error('❌ Error forzando desconexión:', error);
    }
  } else {
    console.error('❌ Supabase no disponible globalmente');
  }
}

function simularErrorDeCanal() {
  console.log('⚡ Simulando error de canal...');
  
  // Disparar evento personalizado de error
  const errorEvent = new CustomEvent('supabase-channel-error', {
    detail: {
      status: 'CHANNEL_ERROR',
      error: 'Conexión interrumpida simulada'
    }
  });
  
  window.dispatchEvent(errorEvent);
  console.log('✅ Evento de error disparado');
}

function probarReconexionCompleta() {
  console.log('🧪 === PROBANDO SISTEMA DE RECONEXIÓN ===');
  
  // 1. Forzar desconexión
  console.log('1️⃣ Forzando desconexión...');
  forzarDesconexion();
  
  // 2. Simular error de canal después de 2 segundos
  setTimeout(() => {
    console.log('2️⃣ Simulando error de canal...');
    simularErrorDeCanal();
  }, 2000);
  
  // 3. Verificar estado después de 10 segundos
  setTimeout(() => {
    console.log('3️⃣ Verificando estado del sistema...');
    verificarEstadoSistema();
  }, 10000);
  
  console.log('⏱️ Prueba iniciada - observa la consola durante los próximos 10 segundos');
}

function verificarEstadoSistema() {
  console.log('📊 === ESTADO ACTUAL DEL SISTEMA ===');
  
  // Verificar permisos de notificación
  if ('Notification' in window) {
    console.log('🔔 Permisos de notificación:', Notification.permission);
  }
  
  // Verificar contexto de audio
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      console.log('🔊 AudioContext disponible: ✅');
    }
  } catch (error) {
    console.log('🔊 AudioContext disponible: ❌', error);
  }
  
  // Verificar Supabase
  if (window.supabase) {
    console.log('📡 Supabase disponible: ✅');
    
    if (window.supabase.realtime) {
      const state = window.supabase.realtime.connectionState;
      console.log('🌐 Estado de conexión Realtime:', state);
    }
  } else {
    console.log('📡 Supabase disponible: ❌');
  }
  
  console.log('✅ Verificación completada');
}

function resetearSistema() {
  console.log('🔄 Reseteando sistema de notificaciones...');
  
  // Recargar página para reiniciar completamente
  if (confirm('¿Recargar página para resetear el sistema?')) {
    window.location.reload();
  }
}

// Exponer funciones globalmente
window.forzarDesconexion = forzarDesconexion;
window.simularErrorDeCanal = simularErrorDeCanal;
window.probarReconexionCompleta = probarReconexionCompleta;
window.verificarEstadoSistema = verificarEstadoSistema;
window.resetearSistema = resetearSistema;

console.log('🔧 FUNCIONES DE RECONEXIÓN CARGADAS:');
console.log('- forzarDesconexion()');
console.log('- simularErrorDeCanal()');
console.log('- probarReconexionCompleta()');
console.log('- verificarEstadoSistema()');
console.log('- resetearSistema()');
console.log('');
console.log('💡 Ejecuta: probarReconexionCompleta() para probar el sistema completo');
