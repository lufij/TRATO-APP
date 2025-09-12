// FORZAR RECARGA DE CONFIGURACIONES DE SONIDO DE EMERGENCIA
console.log('🚨 RECARGANDO SISTEMA DE SONIDOS DE EMERGENCIA...');

// Eliminar configuraciones anteriores
if (window.playAdvancedNotificationSound) {
  delete window.playAdvancedNotificationSound;
}
if (window.testAdvancedNotifications) {
  delete window.testAdvancedNotifications;
}

// Recargar el script de activación con las nuevas configuraciones de emergencia
const script = document.createElement('script');
script.src = '/activate-advanced-notifications.js?' + Date.now(); // Cache bust
script.onload = function() {
  console.log('✅ SISTEMA DE EMERGENCIA RECARGADO');
  console.log('🔊 Probando sonido de emergencia...');
  
  // Probar inmediatamente el nuevo sonido de emergencia
  setTimeout(() => {
    if (window.testAdvancedNotifications) {
      window.testAdvancedNotifications();
    }
  }, 500);
};

script.onerror = function() {
  console.error('❌ Error recargando sistema de emergencia');
};

document.head.appendChild(script);

console.log('🔄 Script de emergencia enviado para recarga...');