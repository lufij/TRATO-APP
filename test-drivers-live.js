// 🧪 SCRIPT DE PRUEBA EN VIVO - Verificar repartidores
console.log('🧪 INICIANDO PRUEBA EN VIVO - Repartidores');

// Este script se puede ejecutar en la consola del navegador para monitorear en tiempo real

window.testDriversConsistency = function() {
  console.log('\n🔍 PRUEBA DE CONSISTENCIA - REPARTIDORES');
  console.log('==========================================');
  
  // Verificar si hay componentes montados
  const onlineIndicator = document.querySelector('[data-component="online-drivers"]') || 
                         document.querySelector('.fixed.top-16.right-4');
  const criticalNotifications = document.querySelector('[data-component="critical-notifications"]');
  
  console.log('📊 Estado de componentes:');
  console.log('- OnlineDriversIndicator:', onlineIndicator ? '✅ Montado' : '❌ No encontrado');
  console.log('- CriticalNotifications:', criticalNotifications ? '✅ Montado' : '❌ No encontrado');
  
  // Verificar el contenido actual del indicador
  if (onlineIndicator) {
    const badgeText = onlineIndicator.textContent || '';
    console.log('- Texto del badge:', badgeText);
    
    // Extraer número
    const match = badgeText.match(/(\d+)/);
    const count = match ? parseInt(match[1]) : 0;
    console.log('- Conteo extraído:', count);
  }
  
  // Verificar si hay alertas de "Sin repartidores"
  const alerts = Array.from(document.querySelectorAll('[class*="alert"], [class*="notification"]'))
    .filter(el => el.textContent?.includes('Sin repartidores') || el.textContent?.includes('repartidor'));
  
  console.log('🚨 Alertas de repartidores encontradas:', alerts.length);
  alerts.forEach((alert, index) => {
    console.log(`- Alerta ${index + 1}:`, alert.textContent?.trim());
  });
  
  // Simular click en el indicador para refrescar
  if (onlineIndicator) {
    console.log('🔄 Simulando click para refrescar...');
    onlineIndicator.click();
  }
  
  return {
    indicatorFound: !!onlineIndicator,
    alertsFound: alerts.length,
    badgeText: onlineIndicator?.textContent || 'No encontrado'
  };
};

// Función para monitorear cambios
window.monitorDriversChanges = function(duration = 30000) {
  console.log(`🔍 MONITOREANDO CAMBIOS POR ${duration/1000} SEGUNDOS...`);
  
  let previousState = '';
  const interval = setInterval(() => {
    const result = window.testDriversConsistency();
    const currentState = JSON.stringify(result);
    
    if (currentState !== previousState) {
      console.log('🔄 CAMBIO DETECTADO:', result);
      previousState = currentState;
    }
  }, 2000);
  
  setTimeout(() => {
    clearInterval(interval);
    console.log('⏹️ Monitoreo finalizado');
  }, duration);
};

// Función para forzar una verificación de sistema
window.forceSystemCheck = function() {
  console.log('🔧 FORZANDO VERIFICACIÓN DE SISTEMA...');
  
  // Disparar evento personalizado para forzar check
  const event = new CustomEvent('forceSystemCheck', {
    detail: { source: 'manual_test' }
  });
  window.dispatchEvent(event);
  
  // También forzar una actualización de drivers
  setTimeout(() => {
    window.testDriversConsistency();
  }, 1000);
};

console.log('✅ Funciones de prueba cargadas:');
console.log('- testDriversConsistency() - Verifica estado actual');
console.log('- monitorDriversChanges(30000) - Monitorea cambios por 30 segundos');
console.log('- forceSystemCheck() - Fuerza verificación del sistema');
console.log('\n💡 Ejecuta cualquiera de estas funciones en la consola del navegador');

// Auto-ejecutar la primera verificación
setTimeout(() => {
  if (typeof window !== 'undefined' && window.testDriversConsistency) {
    window.testDriversConsistency();
  }
}, 2000);
