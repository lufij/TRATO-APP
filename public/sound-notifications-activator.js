// 🔊 ACTIVADOR AUTOMÁTICO DE NOTIFICACIONES SONORAS
// Este script se ejecuta automáticamente para configurar el sistema de sonido

console.log('🚀 Iniciando sistema de notificaciones sonoras avanzadas...');

// Función para activar el contexto de audio
function activateAudioContext() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.warn('⚠️ AudioContext no soportado en este navegador');
      return false;
    }

    const audioContext = new AudioContext();
    
    // Si el contexto está suspendido, intentar resumirlo
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        console.log('🔊 AudioContext activado correctamente');
        audioContext.close();
      }).catch(err => {
        console.warn('⚠️ No se pudo reanudar AudioContext:', err);
      });
    } else {
      console.log('🔊 AudioContext ya está activo');
      audioContext.close();
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error activando AudioContext:', error);
    return false;
  }
}

// Función para solicitar permisos de notificación
async function requestNotificationPermissions() {
  if (!('Notification' in window)) {
    console.warn('⚠️ Notificaciones no soportadas en este navegador');
    return false;
  }

  try {
    let permission = Notification.permission;
    
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    
    if (permission === 'granted') {
      console.log('✅ Permisos de notificación concedidos');
      return true;
    } else {
      console.warn('⚠️ Permisos de notificación denegados');
      return false;
    }
  } catch (error) {
    console.error('❌ Error solicitando permisos:', error);
    return false;
  }
}

// Función para mostrar una notificación de prueba
function showTestNotification() {
  if (Notification.permission === 'granted') {
    const notification = new Notification('🔊 Sistema de Sonido Activado', {
      body: 'Las notificaciones sonoras están funcionando correctamente',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'sound-test',
      silent: false
    });

    // Auto-cerrar después de 3 segundos
    setTimeout(() => notification.close(), 3000);
  }
}

// Función para reproducir un sonido de confirmación
function playConfirmationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    // Crear un sonido de confirmación simple
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 880; // Nota A5
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
    
    // Limpiar después de usar
    setTimeout(() => audioContext.close(), 300);
    
    console.log('🎵 Sonido de confirmación reproducido');
  } catch (error) {
    console.warn('⚠️ No se pudo reproducir sonido de confirmación:', error);
  }
}

// Función principal de activación
async function activateSoundNotifications() {
  console.log('🔧 Configurando sistema de notificaciones...');
  
  // Paso 1: Activar contexto de audio
  const audioActivated = activateAudioContext();
  
  // Paso 2: Solicitar permisos
  const permissionsGranted = await requestNotificationPermissions();
  
  // Paso 3: Si todo está bien, mostrar confirmación
  if (audioActivated && permissionsGranted) {
    // Pequeño delay para asegurar que todo esté listo
    setTimeout(() => {
      playConfirmationSound();
      showTestNotification();
    }, 500);
    
    console.log('✅ Sistema de notificaciones sonoras completamente activado');
    return true;
  } else {
    console.warn('⚠️ Sistema de notificaciones activado parcialmente');
    return false;
  }
}

// Función para verificar si el sistema ya está activo
function checkSystemStatus() {
  const audioSupported = !!(window.AudioContext || window.webkitAudioContext);
  const notificationsSupported = 'Notification' in window;
  const notificationsGranted = notificationsSupported && Notification.permission === 'granted';
  
  console.log('📊 Estado del sistema:');
  console.log('  Audio:', audioSupported ? '✅ Soportado' : '❌ No soportado');
  console.log('  Notificaciones:', notificationsSupported ? '✅ Soportado' : '❌ No soportado');
  console.log('  Permisos:', notificationsGranted ? '✅ Concedidos' : '⚠️ No concedidos');
  
  return {
    audioSupported,
    notificationsSupported,
    notificationsGranted,
    fullyActivated: audioSupported && notificationsGranted
  };
}

// Activar automáticamente cuando se carga el script
(async function autoActivate() {
  const status = checkSystemStatus();
  
  if (!status.fullyActivated) {
    // Esperar a que la página esté completamente cargada
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', activateSoundNotifications);
    } else {
      // La página ya está cargada
      await activateSoundNotifications();
    }
  } else {
    console.log('✅ Sistema ya activado completamente');
  }
})();

// Hacer funciones disponibles globalmente para uso manual
window.soundNotificationSystem = {
  activate: activateSoundNotifications,
  checkStatus: checkSystemStatus,
  playTest: playConfirmationSound,
  showTestNotification: showTestNotification
};

console.log('🎯 Sistema de notificaciones sonoras cargado. Usa window.soundNotificationSystem para controles manuales.');
