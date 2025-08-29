// 🔊 SCRIPT DE DIAGNÓSTICO PARA NOTIFICACIONES SONORAS
// Pega este código en la consola del navegador (F12) para probar

console.log('🎵 INICIANDO DIAGNÓSTICO DE NOTIFICACIONES SONORAS...');

// 1. Verificar si Web Audio API está disponible
const audioApiSupported = !!(window.AudioContext || window.webkitAudioContext);
console.log('✅ Web Audio API:', audioApiSupported ? 'Disponible' : '❌ No disponible');

// 2. Función de prueba de sonido
window.testSound = async function(frequency = 800, duration = 300, pattern = 'single') {
  try {
    console.log(`🔊 Probando sonido: ${frequency}Hz, ${duration}ms, patrón: ${pattern}`);
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
      console.log('🔓 AudioContext activado');
    }

    const playTone = (delay = 0) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration / 1000);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration / 1000);
        
        console.log(`🎵 Tono reproducido: ${frequency}Hz`);
      }, delay);
    };

    // Reproducir según el patrón
    switch (pattern) {
      case 'single':
        playTone();
        break;
      case 'double':
        playTone();
        playTone(duration + 100);
        break;
      case 'triple':
        playTone();
        playTone(duration + 100);
        playTone((duration + 100) * 2);
        break;
    }
    
    console.log('✅ Sonido ejecutado correctamente');
    return true;
    
  } catch (error) {
    console.error('❌ Error reproduciendo sonido:', error);
    return false;
  }
};

// 3. Función para probar todos los sonidos del sistema
window.testAllSounds = async function() {
  console.log('🎼 Probando todos los sonidos del sistema...');
  
  const sounds = [
    { name: 'Nueva Orden (Vendedor)', freq: 800, dur: 300, pattern: 'triple' },
    { name: 'Repartidor Asignado', freq: 600, dur: 200, pattern: 'double' },
    { name: 'Pedido Listo', freq: 1000, dur: 250, pattern: 'double' },
    { name: 'Entrega Completada', freq: 500, dur: 400, pattern: 'single' },
    { name: 'Nuevo Producto', freq: 700, dur: 200, pattern: 'single' },
    { name: 'Notificación General', freq: 650, dur: 200, pattern: 'single' }
  ];
  
  for (let i = 0; i < sounds.length; i++) {
    const sound = sounds[i];
    console.log(`🎵 ${i+1}/${sounds.length} - ${sound.name}`);
    await testSound(sound.freq, sound.dur, sound.pattern);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Pausa entre sonidos
  }
  
  console.log('🎉 Prueba completada!');
};

// 4. Verificar estado del usuario y rol
if (window.localStorage) {
  const authData = localStorage.getItem('supabase.auth.token');
  console.log('👤 Estado de autenticación:', authData ? 'Conectado' : 'No conectado');
}

// 5. Instrucciones
console.log(`
🎯 INSTRUCCIONES PARA PROBAR:

1. Ejecuta: testSound()
   → Prueba un sonido básico

2. Ejecuta: testSound(800, 300, 'triple')
   → Prueba sonido de nueva orden (triple beep)

3. Ejecuta: testAllSounds()
   → Prueba todos los sonidos del sistema (¡puede ser ruidoso!)

4. Si no escuchas nada:
   - Verifica que el volumen esté activado
   - Asegúrate de hacer clic en la página primero (requerido por navegador)
   - Prueba en modo incógnito
   - Verifica permisos de audio del navegador

📱 Nota: En móviles, puede requerir interacción del usuario primero.
`);

console.log('✅ Diagnóstico cargado. Ejecuta las funciones para probar.');
