// 📱 DIAGNÓSTICO MÓVIL VENDEDOR - Detectar bucles infinitos
// Este script detecta problemas comunes en móvil que causan bucles infinitos

console.log('🔍 INICIANDO DIAGNÓSTICO MÓVIL PARA VENDEDOR...');

// 1. Verificar si estamos en un dispositivo móvil
function detectMobile() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isTouchDevice = 'ontouchstart' in window;
  const isSmallScreen = window.innerWidth <= 768;
  
  console.log('📱 Detección de dispositivo:');
  console.log('  - Es móvil por User Agent:', isMobile);
  console.log('  - Soporta touch:', isTouchDevice);
  console.log('  - Pantalla pequeña:', isSmallScreen);
  console.log('  - Ancho actual:', window.innerWidth, 'px');
  
  return isMobile || isTouchDevice || isSmallScreen;
}

// 2. Monitorear re-renders excesivos
let renderCount = 0;
let lastRenderTime = Date.now();

function monitorRenders() {
  renderCount++;
  const now = Date.now();
  const timeSinceLastRender = now - lastRenderTime;
  
  if (timeSinceLastRender < 100) { // Si hay renders muy frecuentes
    console.warn('⚠️ RENDER EXCESIVO DETECTADO:');
    console.warn('  - Render #' + renderCount);
    console.warn('  - Tiempo desde último render:', timeSinceLastRender + 'ms');
    
    // Mostrar stack trace para identificar el componente
    console.trace('🔍 Stack trace del render:');
  }
  
  lastRenderTime = now;
  
  // Resetear contador cada 5 segundos
  setTimeout(() => {
    if (renderCount > 50) {
      console.error('❌ BUCLE INFINITO DETECTADO: ' + renderCount + ' renders en 5 segundos');
    }
    renderCount = 0;
  }, 5000);
}

// 3. Verificar problemas específicos del vendedor
function checkSellerSpecificIssues() {
  console.log('🏪 Verificando problemas específicos del vendedor...');
  
  // Verificar si hay contextos problemáticos
  const problemContexts = [
    'AuthContext',
    'OrderContext', 
    'CartContext',
    'NotificationContext'
  ];
  
  problemContexts.forEach(contextName => {
    try {
      const context = window[contextName];
      if (context && typeof context === 'object') {
        console.log('✅ ' + contextName + ' está disponible');
      }
    } catch (error) {
      console.warn('⚠️ Error en ' + contextName + ':', error.message);
    }
  });
  
  // Verificar notificaciones
  if ('Notification' in window) {
    console.log('🔔 Permisos de notificación:', Notification.permission);
  }
  
  // Verificar Web Audio API (puede causar problemas en móvil)
  try {
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      console.log('🔊 Web Audio API disponible');
    } else {
      console.warn('⚠️ Web Audio API no disponible (normal en algunos móviles)');
    }
  } catch (error) {
    console.warn('⚠️ Error con Web Audio:', error.message);
  }
}

// 4. Monitorear errores de JavaScript
function setupErrorMonitoring() {
  let errorCount = 0;
  
  window.addEventListener('error', (event) => {
    errorCount++;
    console.error('❌ ERROR JS #' + errorCount + ':', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    });
    
    // Si hay muchos errores, podría ser un bucle
    if (errorCount > 10) {
      console.error('🚨 DEMASIADOS ERRORES DETECTADOS - Posible bucle infinito');
    }
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ PROMISE RECHAZADA:', event.reason);
  });
}

// 5. Verificar memoria y rendimiento
function checkPerformance() {
  if (performance.memory) {
    console.log('💾 Uso de memoria:');
    console.log('  - Usado:', Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB');
    console.log('  - Total:', Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB');
    console.log('  - Límite:', Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB');
  }
  
  // Monitorear si la memoria crece constantemente
  setTimeout(() => {
    if (performance.memory) {
      const newUsed = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      console.log('💾 Memoria después de 10s:', newUsed + 'MB');
    }
  }, 10000);
}

// EJECUTAR DIAGNÓSTICO
detectMobile();
checkSellerSpecificIssues();
setupErrorMonitoring();
checkPerformance();

// Monitorear renders (se ejecutará cuando React renderice)
if (window.React && window.React.version) {
  console.log('⚛️ React versión:', window.React.version);
  
  // Override console.log para detectar renders excesivos
  const originalLog = console.log;
  console.log = function(...args) {
    if (args.some(arg => typeof arg === 'string' && arg.includes('render'))) {
      monitorRenders();
    }
    originalLog.apply(console, args);
  };
}

// Crear botón de diagnóstico móvil
if (detectMobile()) {
  const diagButton = document.createElement('button');
  diagButton.innerHTML = '🔍 Diagnóstico';
  diagButton.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 9999;
    background: #f97316;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  `;
  
  diagButton.onclick = () => {
    console.log('🔍 DIAGNÓSTICO MANUAL EJECUTADO:');
    detectMobile();
    checkSellerSpecificIssues();
    checkPerformance();
    
    // Mostrar información en pantalla también
    alert(`📱 Diagnóstico Móvil:\n- Ancho: ${window.innerWidth}px\n- Renders: ${renderCount}\n- Memoria: ${performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB' : 'N/A'}`);
  };
  
  // Agregar botón cuando el DOM esté listo
  if (document.body) {
    document.body.appendChild(diagButton);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(diagButton);
    });
  }
}

console.log('✅ DIAGNÓSTICO MÓVIL CONFIGURADO - Revisa la consola para detectar problemas');
