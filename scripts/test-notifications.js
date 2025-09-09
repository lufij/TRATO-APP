/**
 * 🧪 SCRIPT DE PRUEBA RÁPIDA PARA NOTIFICACIONES
 * 
 * Este script se puede ejecutar en la consola del navegador
 * para simular una nueva orden y probar el sistema completo
 */

// Función para simular una nueva orden de Supabase
function simularOrdenSupabase() {
  console.log('🧪 === INICIANDO PRUEBA DE ORDEN ===');
  
  // Datos de orden realista
  const nuevaOrden = {
    id: `test-${Date.now()}`,
    customer_name: 'Ana María López',
    buyer_name: 'Ana María López',
    total: 156.75,
    total_amount: 156.75,
    status: 'pending',
    notes: 'Sin chile, extra queso, entregar en el primer piso',
    seller_id: 'current-vendor-id',
    created_at: new Date().toISOString(),
    delivery_type: 'pickup',
    items: [
      { name: 'Hamburguesa Especial', quantity: 2, price: 65.00 },
      { name: 'Papas Grandes', quantity: 1, price: 25.00 },
      { name: 'Refresco 500ml', quantity: 2, price: 15.75 }
    ],
    customer_address: 'Zona 10, Guatemala',
    customer_phone: '+502 5555-1234'
  };

  console.log('📦 Datos de la orden:', nuevaOrden);

  // Simular payload de Supabase Realtime
  const payloadSupabase = {
    schema: 'public',
    table: 'orders',
    commit_timestamp: new Date().toISOString(),
    eventType: 'INSERT',
    new: nuevaOrden,
    old: null
  };

  console.log('📡 Payload de Supabase:', payloadSupabase);

  // Disparar evento personalizado para el sistema de notificaciones
  const evento = new CustomEvent('supabase-order-insert', {
    detail: payloadSupabase,
    bubbles: true
  });

  console.log('🎯 Disparando evento...');
  window.dispatchEvent(evento);

  // También simular directamente llamada a función de manejo
  if (window.handleVendorOrder) {
    console.log('📞 Llamando función directa...');
    window.handleVendorOrder(payloadSupabase);
  }

  console.log('✅ Prueba completada');
  return payloadSupabase;
}

// Función para probar permisos
function probarPermisos() {
  console.log('🔔 === PROBANDO PERMISOS ===');
  
  if (!('Notification' in window)) {
    console.error('❌ Notificaciones no soportadas');
    return false;
  }

  console.log('📱 Estado actual:', Notification.permission);

  if (Notification.permission === 'granted') {
    console.log('✅ Permisos ya concedidos');
    
    // Mostrar notificación de prueba
    const notificacion = new Notification('🧪 Prueba de Notificación', {
      body: 'Si ves esto, las notificaciones funcionan',
      icon: '/icon-192x192.png',
      tag: 'test-notification'
    });

    setTimeout(() => notificacion.close(), 5000);
    return true;
  }

  // Solicitar permisos
  Notification.requestPermission().then(permission => {
    console.log('📝 Resultado:', permission);
    if (permission === 'granted') {
      console.log('✅ Permisos concedidos');
    } else {
      console.error('❌ Permisos denegados');
    }
  });
}

// Función para probar audio
function probarAudio() {
  console.log('🔊 === PROBANDO AUDIO ===');
  
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const reproducirTono = (freq, duracion) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duracion);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duracion);
    };

    // Secuencia de tonos como en el sistema real
    audioContext.resume().then(() => {
      console.log('🎵 Reproduciendo secuencia de tonos...');
      reproducirTono(800, 0.4);
      setTimeout(() => reproducirTono(1000, 0.4), 300);
      setTimeout(() => reproducirTono(1200, 0.6), 600);
      
      console.log('✅ Audio funcionando');
    });
    
  } catch (error) {
    console.error('❌ Error de audio:', error);
  }
}

// Función completa de prueba
function pruebaCompleta() {
  console.log('🚀 === INICIANDO PRUEBA COMPLETA ===');
  
  // 1. Probar permisos
  probarPermisos();
  
  // 2. Probar audio después de 1 segundo
  setTimeout(probarAudio, 1000);
  
  // 3. Simular orden después de 2 segundos
  setTimeout(simularOrdenSupabase, 2000);
  
  console.log('⏱️ Prueba programada - espera 3 segundos para ver resultados');
}

// Exponer funciones globalmente para fácil acceso en consola
window.simularOrdenSupabase = simularOrdenSupabase;
window.probarPermisos = probarPermisos;
window.probarAudio = probarAudio;
window.pruebaCompleta = pruebaCompleta;

console.log('🧪 FUNCIONES DE PRUEBA CARGADAS:');
console.log('- simularOrdenSupabase()');
console.log('- probarPermisos()');  
console.log('- probarAudio()');
console.log('- pruebaCompleta()');
console.log('');
console.log('💡 Ejecuta: pruebaCompleta() para probar todo');
