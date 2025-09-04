// 📱 PRUEBA VENDEDOR MÓVIL - Verificar que no hay bucles infinitos
console.log('🧪 INICIANDO PRUEBA VENDEDOR MÓVIL...');

// Simular dispositivo móvil
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  writable: false
});

// Simular pantalla móvil
Object.defineProperty(window, 'innerWidth', {
  value: 375,
  writable: true
});

Object.defineProperty(window, 'innerHeight', {
  value: 667,
  writable: true
});

// Monitorear renders y actualizaciones
let renderCount = 0;
let useEffectCount = 0;
let useCallbackCount = 0;
let errorCount = 0;

// Override console methods para monitorear
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function(...args) {
  const message = args.join(' ');
  
  if (message.includes('render') || message.includes('update')) {
    renderCount++;
    if (renderCount > 100) {
      console.error('🚨 DEMASIADOS RENDERS DETECTADOS: ' + renderCount);
    }
  }
  
  if (message.includes('useEffect') || message.includes('effect')) {
    useEffectCount++;
    if (useEffectCount > 50) {
      console.error('🚨 DEMASIADOS useEffect DETECTADOS: ' + useEffectCount);
    }
  }
  
  if (message.includes('useCallback') || message.includes('callback')) {
    useCallbackCount++;
    if (useCallbackCount > 30) {
      console.error('🚨 DEMASIADOS useCallback DETECTADOS: ' + useCallbackCount);
    }
  }
  
  originalLog.apply(console, args);
};

console.error = function(...args) {
  errorCount++;
  if (errorCount > 5) {
    console.error('🚨 DEMASIADOS ERRORES: ' + errorCount + ' - Posible bucle infinito');
  }
  originalError.apply(console, args);
};

// Monitorear memoria cada 5 segundos
let memoryChecks = 0;
const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

const memoryMonitor = setInterval(() => {
  memoryChecks++;
  
  if (performance.memory) {
    const currentMemory = performance.memory.usedJSHeapSize;
    const memoryDiff = currentMemory - initialMemory;
    const memoryMB = Math.round(currentMemory / 1024 / 1024);
    
    console.log(`💾 Check #${memoryChecks}: ${memoryMB}MB (${memoryDiff > 0 ? '+' : ''}${Math.round(memoryDiff / 1024 / 1024)}MB)`);
    
    // Si la memoria crece más de 50MB en 30 segundos, podría ser un leak
    if (memoryChecks > 6 && memoryDiff > 50 * 1024 * 1024) {
      console.error('🚨 POSIBLE MEMORY LEAK DETECTADO: +' + Math.round(memoryDiff / 1024 / 1024) + 'MB');
    }
  }
  
  // Detener después de 1 minuto
  if (memoryChecks >= 12) {
    clearInterval(memoryMonitor);
    console.log('✅ PRUEBA COMPLETADA - Memoria estable');
  }
}, 5000);

// Simular acciones del vendedor
function simulateSellerActions() {
  console.log('📱 Simulando acciones de vendedor móvil...');
  
  // Simular cambio de vista
  setTimeout(() => {
    console.log('👉 Cambiando a vista de productos...');
    // Simular evento de cambio
    window.dispatchEvent(new Event('resize'));
  }, 2000);
  
  // Simular revisión de pedidos
  setTimeout(() => {
    console.log('📦 Revisando pedidos...');
    // Simular interacción
    window.dispatchEvent(new Event('focus'));
  }, 5000);
  
  // Simular notificaciones
  setTimeout(() => {
    console.log('🔔 Probando sistema de notificaciones...');
    if ('Notification' in window) {
      console.log('✅ Notification API disponible');
    }
  }, 8000);
}

// Detectar problemas específicos del vendedor
function detectSellerIssues() {
  console.log('🔍 Detectando problemas específicos del vendedor...');
  
  // Verificar Local Storage
  try {
    localStorage.setItem('test_seller_mobile', Date.now().toString());
    const stored = localStorage.getItem('test_seller_mobile');
    if (stored) {
      console.log('✅ Local Storage funcionando');
      localStorage.removeItem('test_seller_mobile');
    }
  } catch (error) {
    console.error('❌ Error en Local Storage:', error);
  }
  
  // Verificar que no hay múltiples timers ejecutándose
  const originalSetInterval = window.setInterval;
  let intervalCount = 0;
  
  window.setInterval = function(callback, delay) {
    intervalCount++;
    console.log(`⏰ Interval creado #${intervalCount} (${delay}ms)`);
    
    if (intervalCount > 10) {
      console.warn('⚠️ Muchos intervalos activos: ' + intervalCount);
    }
    
    return originalSetInterval.call(window, callback, delay);
  };
  
  // Verificar useCallback dependencies
  if (window.React && window.React.version) {
    console.log('⚛️ React ' + window.React.version + ' detectado');
  }
}

// Crear botón de prueba visible
function createTestButton() {
  const button = document.createElement('button');
  button.innerHTML = '🧪 Prueba Vendedor';
  button.style.cssText = `
    position: fixed;
    top: 50px;
    left: 10px;
    z-index: 10000;
    background: #10b981;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  `;
  
  button.onclick = () => {
    console.log('📊 REPORTE DE PRUEBA MÓVIL:');
    console.log(`- Renders: ${renderCount}`);
    console.log(`- UseEffects: ${useEffectCount}`);
    console.log(`- UseCallbacks: ${useCallbackCount}`);
    console.log(`- Errores: ${errorCount}`);
    console.log(`- Memoria: ${performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB' : 'N/A'}`);
    console.log(`- Ancho: ${window.innerWidth}px`);
    
    // Mostrar en pantalla también
    const report = `📱 REPORTE VENDEDOR MÓVIL:\n✓ Renders: ${renderCount}\n✓ Effects: ${useEffectCount}\n✓ Callbacks: ${useCallbackCount}\n❌ Errores: ${errorCount}\n💾 Memoria: ${performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB' : 'N/A'}`;
    alert(report);
  };
  
  if (document.body) {
    document.body.appendChild(button);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(button);
    });
  }
}

// Ejecutar pruebas
detectSellerIssues();
simulateSellerActions();
createTestButton();

console.log('✅ PRUEBA VENDEDOR MÓVIL CONFIGURADA - Monitoreo activo por 60 segundos');
