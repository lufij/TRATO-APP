// 🔊 PROBAR SONIDO SÚPER FUERTE - Solo para desarrollo
// NO visible en producción

// Solo ejecutar en desarrollo o localhost
const isDevelopment = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') ||
                     (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));

if (!isDevelopment) {
  // En producción, salir silenciosamente
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {};
  }
  return;
}

console.log('🔊 INICIANDO PRUEBA DE SONIDO SÚPER FUERTE (DESARROLLO)...');

async function testSuperLoudSound() {
  try {
    // Crear contexto de audio
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    await audioContext.resume();

    // 🚨 FUNCIÓN SÚPER POTENTE - 3 osciladores simultáneos
    const createPowerfulTone = (frequency, duration, delay = 0) => {
      setTimeout(() => {
        for (let i = 0; i < 3; i++) {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          // 3 frecuencias ligeramente diferentes para sonido más rico
          oscillator.frequency.setValueAtTime(frequency + (i * 5), audioContext.currentTime);
          oscillator.type = 'square'; // Onda cuadrada = más fuerte
          gainNode.gain.setValueAtTime(1.0, audioContext.currentTime); // VOLUMEN MÁXIMO
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + duration / 1000);
        }
      }, delay);
    };

    // 🎵 SECUENCIA SÚPER FUERTE
    const playSequence = (sequenceDelay = 0) => {
      createPowerfulTone(900, 600, sequenceDelay + 0);     // Grave FUERTE
      createPowerfulTone(1100, 600, sequenceDelay + 500);  // Medio FUERTE  
      createPowerfulTone(1300, 600, sequenceDelay + 1000); // Agudo FUERTE
      createPowerfulTone(1500, 800, sequenceDelay + 1500); // SÚPER AGUDO
    };

    console.log('🔊 Reproduciendo secuencia 1/2...');
    playSequence(0);        // Primera vez
    
    console.log('🔊 Reproduciendo secuencia 2/2 en 3 segundos...');
    playSequence(3000);     // Segunda vez

    // 📳 VIBRACIÓN SÚPER INTENSA (2 veces)
    if ('vibrate' in navigator) {
      navigator.vibrate([400, 150, 400, 150, 400, 150, 600]);
      setTimeout(() => {
        navigator.vibrate([400, 150, 400, 150, 400, 150, 600]);
      }, 3000);
      console.log('📳 Vibración intensa activada 2x');
    }

    console.log('✅ SONIDO SÚPER FUERTE ACTIVADO - 2 repeticiones completas');
    console.log('🔊 Volumen: MÁXIMO (1.0)');
    console.log('🎵 Osciladores: 3 simultáneos por tono');
    console.log('🔄 Repeticiones: 2 (0s y 3s)');
    
  } catch (error) {
    console.error('❌ Error reproduciendo sonido:', error);
  }
}

// 🚀 FUNCIÓN GLOBAL PARA USO INMEDIATO
window.testSuperLoudSound = testSuperLoudSound;

// 🧪 EJECUTAR INMEDIATAMENTE
testSuperLoudSound();

console.log('');
console.log('💡 PARA VOLVER A PROBAR:');
console.log('   testSuperLoudSound()');
console.log('');
console.log('🔊 AJUSTES RECOMENDADOS:');
console.log('   • Volumen dispositivo: MÁXIMO');
console.log('   • Usar auriculares o parlantes externos');
console.log('   • Desactivar modo silencioso');
console.log('   • Cerrar otras apps que usen audio');
