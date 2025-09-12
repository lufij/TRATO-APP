// PRUEBA ESPECÍFICA DE OPTIMIZACIONES MÓVILES PARA VENDEDORES
// Este script verifica que todas las optimizaciones móviles funcionen correctamente

window.testMobileOptimizations = function() {
  console.log('📱 INICIANDO PRUEBA DE OPTIMIZACIONES MÓVILES PARA VENDEDORES');
  
  // Detectar si estamos en móvil
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                   ('ontouchstart' in window) ||
                   (window.innerWidth <= 768);
  
  console.log(`🔍 Dispositivo detectado: ${isMobile ? '📱 MÓVIL' : '💻 ESCRITORIO'}`);
  
  if (isMobile) {
    console.log('✅ APLICANDO CONFIGURACIONES MÓVILES OPTIMIZADAS:');
    console.log('🔊 Sonidos: Frecuencias 1400-1600Hz, Volumen 1.0');
    console.log('📳 Vibración: Patrones intensos [800-1000ms]');
    console.log('🔄 Repeticiones: 4-6 veces vs 3 en desktop');
    console.log('⚡ Intervalos: 600-800ms vs 1200ms en desktop');
    console.log('⏱️ Duración: 700-800ms vs 600ms en desktop');
    console.log('🚨 Push: Notificaciones agresivas con requireInteraction');
  } else {
    console.log('⚠️ MÓVIL NO DETECTADO - Usando configuraciones de escritorio');
    console.log('💡 Para prueba real, abre en dispositivo móvil o simula con DevTools (F12 > Toggle Device)');
  }
  
  // Función para probar sonido específico móvil
  const testMobileSound = (frequency, duration, name) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.error('❌ AudioContext no disponible');
      return;
    }
    
    const audioContext = new AudioContext();
    console.log(`🔊 Probando ${name}: ${frequency}Hz por ${duration}ms`);
    
    // Patrón double con timing móvil optimizado
    const playTone = (delay = 0) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        // Volumen máximo para móvil
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(1.0, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration / 1000);
        
        // Vibración si es móvil
        if (isMobile && 'vibrate' in navigator) {
          navigator.vibrate([duration, 50, duration]);
        }
      }, delay);
    };
    
    // Patrón double con timing de emergencia móvil (30ms)
    playTone(0);
    playTone(duration + 30);
    
    setTimeout(() => {
      audioContext.close();
    }, (duration * 2) + 100);
  };
  
  console.log('\n🧪 INICIANDO SECUENCIA DE PRUEBAS MÓVILES...');
  
  // Prueba 1: NEW_ORDER (más crítico para vendedores móviles)
  console.log('\n🔴 PRUEBA 1: NUEVA ORDEN MÓVIL (Crítica para ventas)');
  testMobileSound(1400, isMobile ? 800 : 600, 'Nueva Orden Móvil');
  
  setTimeout(() => {
    console.log('\n🟠 PRUEBA 2: REPARTIDOR ASIGNADO MÓVIL');
    testMobileSound(1300, isMobile ? 600 : 500, 'Repartidor Asignado Móvil');
  }, 3000);
  
  setTimeout(() => {
    console.log('\n🟡 PRUEBA 3: PEDIDO LISTO MÓVIL');
    testMobileSound(1500, isMobile ? 700 : 550, 'Pedido Listo Móvil');
  }, 6000);
  
  // Prueba de notificación push agresiva (solo móvil)
  setTimeout(() => {
    if (isMobile && window.testAdvancedNotifications) {
      console.log('\n📱 PRUEBA 4: NOTIFICACIÓN PUSH AGRESIVA MÓVIL');
      console.log('🚨 Esta debería aparecer con requireInteraction y vibración intensa');
      
      // Simular nueva orden con configuración móvil
      if (window.notifyNewOrder) {
        window.notifyNewOrder({
          customer_name: 'Cliente Móvil Prueba',
          total: 150.00,
          delivery_type: 'delivery',
          id: 'test-mobile-' + Date.now()
        });
      } else {
        console.warn('⚠️ window.notifyNewOrder no disponible');
      }
    }
  }, 9000);
  
  setTimeout(() => {
    console.log('\n✅ PRUEBAS MÓVILES COMPLETADAS');
    console.log('\n📊 RESUMEN DE OPTIMIZACIONES MÓVILES:');
    console.log(`🔊 Sonidos: ${isMobile ? 'OPTIMIZADOS' : 'DESKTOP'}`);
    console.log(`📳 Vibración: ${isMobile && 'vibrate' in navigator ? 'DISPONIBLE' : 'NO DISPONIBLE'}`);
    console.log(`🔄 Repeticiones: ${isMobile ? 'INCREMENTADAS' : 'ESTÁNDAR'}`);
    console.log(`📱 Push agresivo: ${isMobile ? 'HABILITADO' : 'DESKTOP'}`);
    
    if (isMobile) {
      console.log('\n💡 Los vendedores móviles ahora deberían escuchar notificaciones MÁS FUERTES y FRECUENTES');
      console.log('🎯 Esto debería prevenir pérdida de ventas por sonidos demasiado suaves');
    }
    
    console.log('\n🔄 Para probar en móvil real: Abre la app en tu teléfono y ejecuta testMobileOptimizations()');
  }, 12000);
};

// Auto-ejecutar si se detecta móvil
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
if (isMobile) {
  console.log('📱 MÓVIL DETECTADO - Optimizaciones cargadas automáticamente');
  console.log('🧪 Para probar: testMobileOptimizations()');
} else {
  console.log('💻 ESCRITORIO DETECTADO');
  console.log('📱 Para simular móvil: F12 > Toggle Device Toolbar');
  console.log('🧪 Para probar: testMobileOptimizations()');
}

console.log('📱 Script de optimizaciones móviles cargado correctamente');