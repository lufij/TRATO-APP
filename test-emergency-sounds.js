// Prueba de sonidos de emergencia mejorados para vendedores
// Este archivo prueba las nuevas configuraciones de sonido con frecuencias altas y volumen máximo

window.testEmergencySounds = function() {
  console.log('🚨 INICIANDO PRUEBA DE SONIDOS DE EMERGENCIA PARA VENDEDORES');
  console.log('📊 Configuraciones aplicadas:');
  console.log('- Volumen: 1.0 (máximo)');
  console.log('- Frecuencias: 1200-1600Hz (muy audibles)');
  console.log('- Patrón: double con 30ms entre tonos (urgente)');
  console.log('- Duración: 450-650ms (larga para atención)');
  
  // Crear AudioContext para prueba
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    console.error('❌ AudioContext no disponible en este navegador');
    return;
  }
  
  const audioContext = new AudioContext();
  
  // Función para reproducir tono de emergencia
  const playEmergencyTone = (frequency, duration, delay = 0) => {
    setTimeout(() => {
      try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        // Volumen máximo (1.0)
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(1.0, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration / 1000);
        
        console.log(`🔊 Reproduciendo: ${frequency}Hz por ${duration}ms`);
      } catch (error) {
        console.warn('Error reproduciendo tono:', error);
      }
    }, delay);
  };
  
  // Función para reproducir patrón double de emergencia
  const playEmergencyDouble = (frequency, duration) => {
    playEmergencyTone(frequency, duration, 0);           // Primer tono inmediato
    playEmergencyTone(frequency, duration, duration + 30); // Segundo tono con 30ms de espacio
  };
  
  console.log('\n🔴 PRUEBA 1: NEW_ORDER (Más crítico para ventas)');
  playEmergencyDouble(1400, 600);
  
  setTimeout(() => {
    console.log('\n🟠 PRUEBA 2: ORDER_ASSIGNED');
    playEmergencyDouble(1300, 500);
  }, 2000);
  
  setTimeout(() => {
    console.log('\n🟡 PRUEBA 3: ORDER_READY');
    playEmergencyDouble(1500, 550);
  }, 4000);
  
  setTimeout(() => {
    console.log('\n🟢 PRUEBA 4: ORDER_DELIVERED');
    playEmergencyDouble(1200, 650);
  }, 6000);
  
  setTimeout(() => {
    console.log('\n🔵 PRUEBA 5: NEW_PRODUCT');
    playEmergencyDouble(1250, 450);
  }, 8000);
  
  setTimeout(() => {
    console.log('\n🟣 PRUEBA 6: GENERAL');
    playEmergencyDouble(1350, 500);
  }, 10000);
  
  setTimeout(() => {
    console.log('\n🆘 PRUEBA 7: CRITICAL (Máxima emergencia)');
    // Patrón continuous para crítico
    for (let i = 0; i < 3; i++) {
      playEmergencyTone(1600, 800, i * 900);
    }
  }, 12000);
  
  setTimeout(() => {
    console.log('\n✅ PRUEBAS COMPLETADAS');
    console.log('🎯 ¿Los sonidos son lo suficientemente audibles para que los vendedores no pierdan ventas?');
    console.log('📈 Recomendación: Si aún son suaves, podemos aumentar más las frecuencias o cambiar el tipo de onda.');
    
    // Cerrar AudioContext para liberar recursos
    audioContext.close();
  }, 16000);
};

console.log('🔊 Script de prueba de sonidos de emergencia cargado');
console.log('📱 Para probar los sonidos, ejecuta: testEmergencySounds()');
console.log('⚠️  Asegúrate de tener el volumen del sistema alto');