// 🔔 CONFIGURACIÓN CRÍTICA PARA NOTIFICACIONES CON PANTALLA APAGADA

class NotificationPowerManager {
  constructor() {
    this.wakeLock = null;
    this.isVendor = false;
    this.soundEnabled = false;
  }

  // 🚀 INICIALIZAR TODO EL SISTEMA
  async initialize(userRole = null) {
    console.log('🔔 Iniciando sistema de notificaciones críticas...');
    
    this.isVendor = userRole === 'vendedor';
    
    try {
      // 1. Registrar Service Worker si no existe
      await this.registerServiceWorker();
      
      // 2. Solicitar permisos críticos
      await this.requestCriticalPermissions();
      
      // 3. Activar Wake Lock para vendedores
      if (this.isVendor) {
        await this.activateWakeLock();
      }
      
      // 4. Configurar optimizaciones móviles
      await this.setupMobileOptimizations();
      
      console.log('✅ Sistema de notificaciones críticas completamente configurado');
      return true;
      
    } catch (error) {
      console.error('❌ Error configurando sistema de notificaciones:', error);
      return false;
    }
  }

  // 📱 REGISTRAR SERVICE WORKER
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none' // Siempre verificar actualizaciones
        });
        
        console.log('✅ Service Worker registrado:', registration.scope);
        
        // Verificar si hay actualizaciones
        if (registration.waiting) {
          registration.waiting.postMessage({ command: 'skipWaiting' });
        }
        
        return registration;
      } catch (error) {
        console.error('❌ Error registrando Service Worker:', error);
        throw error;
      }
    } else {
      throw new Error('Service Workers no soportados');
    }
  }

  // 🔐 SOLICITAR PERMISOS CRÍTICOS
  async requestCriticalPermissions() {
    const permissions = [];
    
    // 1. Permisos de notificación
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        permissions.push(`Notificaciones: ${permission}`);
      } else {
        permissions.push(`Notificaciones: ${Notification.permission}`);
      }
      
      if (Notification.permission === 'granted') {
        this.soundEnabled = true;
      }
    }
    
    // 2. Permisos de audio (para sonidos fuertes)
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await audioContext.resume();
      permissions.push('Audio: granted');
      audioContext.close();
    } catch (error) {
      permissions.push('Audio: denied');
    }
    
    console.log('🔐 Permisos obtenidos:', permissions);
    return permissions;
  }

  // 🔋 ACTIVAR WAKE LOCK (solo vendedores)
  async activateWakeLock() {
    if ('wakeLock' in navigator && this.isVendor) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('🔋 Wake Lock ACTIVADO - Pantalla permanecerá activa');
        
        this.wakeLock.addEventListener('release', () => {
          console.log('⚠️ Wake Lock liberado');
        });
        
        // Reactivar automáticamente si se pierde
        document.addEventListener('visibilitychange', async () => {
          if (!document.hidden && !this.wakeLock) {
            try {
              this.wakeLock = await navigator.wakeLock.request('screen');
              console.log('🔄 Wake Lock reactivado');
            } catch (error) {
              console.error('❌ Error reactivando Wake Lock:', error);
            }
          }
        });
        
        return true;
      } catch (error) {
        console.error('❌ Error activando Wake Lock:', error);
        return false;
      }
    }
    return false;
  }

  // 📱 OPTIMIZACIONES MÓVILES
  async setupMobileOptimizations() {
    // 1. Prevenir modo de ahorro de batería
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        if (battery.charging) {
          console.log('🔋 Dispositivo conectado a cargador - Óptimo para notificaciones');
        } else {
          console.log('⚠️ IMPORTANTE: Conecta el dispositivo al cargador para mejores notificaciones');
        }
      } catch (error) {
        console.log('🔋 Info de batería no disponible');
      }
    }
    
    // 2. Configurar meta tags para PWA
    this.setupPWAMeta();
    
    // 3. Instrucciones específicas por navegador
    this.showBrowserSpecificInstructions();
  }

  // 🌐 CONFIGURAR META TAGS PWA
  setupPWAMeta() {
    const metas = [
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'theme-color', content: '#f97316' }
    ];
    
    metas.forEach(meta => {
      let element = document.querySelector(`meta[name="${meta.name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.name = meta.name;
        document.head.appendChild(element);
      }
      element.content = meta.content;
    });
  }

  // 📖 MOSTRAR INSTRUCCIONES POR NAVEGADOR
  showBrowserSpecificInstructions() {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isChrome = /Chrome/i.test(navigator.userAgent);
    
    if (this.isVendor) {
      let instructions = '📱 CONFIGURACIONES CRÍTICAS PARA VENDEDORES:\n\n';
      
      if (isAndroid && isChrome) {
        instructions += `
🤖 ANDROID + CHROME:
• Configuración > Aplicaciones > Chrome > Batería
• Seleccionar "No optimizar" o "Sin restricciones"
• Configuración > Sonidos > Volumen de notificaciones = MÁXIMO
• Mantener pantalla encendida mientras usas la app
        `;
      } else if (isIOS) {
        instructions += `
🍎 iPhone/iPad:
• Configuración > Notificaciones > Chrome/Safari
• Activar "Permitir notificaciones"
• Configuración > Sonidos > Volumen = MÁXIMO
• Configuración > Pantalla > Bloqueo automático = Nunca (mientras trabajas)
        `;
      }
      
      instructions += `
🔊 SONIDOS MÁS FUERTES:
• Usar auriculares o parlantes externos
• Volumen del dispositivo = MÁXIMO
• No usar modo silencioso
• Probar con: testNotifications.playLoudSound()
      `;
      
      console.log(instructions);
    }
  }

  // 🔊 PROBAR SONIDO FUERTE
  async playLoudSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await audioContext.resume();
      
      const playTone = (frequency, duration, delay = 0) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
          oscillator.type = 'square'; // Sonido más fuerte
          gainNode.gain.setValueAtTime(1.0, audioContext.currentTime); // Volumen máximo
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + duration / 1000);
        }, delay);
      };
      
      // Triple beep FUERTE
      playTone(800, 500, 0);
      playTone(1000, 500, 400);
      playTone(1200, 700, 800);
      
      // Vibración intensa
      if ('vibrate' in navigator) {
        navigator.vibrate([300, 100, 300, 100, 300, 100, 500]);
      }
      
      console.log('🔊 Sonido de prueba reproducido');
    } catch (error) {
      console.error('❌ Error reproduciendo sonido:', error);
    }
  }

  // 📊 DIAGNÓSTICO COMPLETO
  diagnose() {
    const report = {
      serviceWorker: 'serviceWorker' in navigator,
      notifications: 'Notification' in window,
      notificationPermission: Notification?.permission,
      wakeLock: 'wakeLock' in navigator,
      vibration: 'vibrate' in navigator,
      audioContext: !!(window.AudioContext || window.webkitAudioContext),
      isSecureContext: window.isSecureContext,
      wakeLockActive: !!this.wakeLock,
      soundEnabled: this.soundEnabled,
      userAgent: navigator.userAgent
    };
    
    console.table(report);
    return report;
  }
}

// 🚀 CREAR INSTANCIA GLOBAL
window.notificationPowerManager = new NotificationPowerManager();

// 🧪 FUNCIONES DE PRUEBA
window.testNotifications = {
  // Configurar sistema completo
  async setup(userRole = 'vendedor') {
    return await window.notificationPowerManager.initialize(userRole);
  },
  
  // Reproducir sonido fuerte
  async playLoudSound() {
    return await window.notificationPowerManager.playLoudSound();
  },
  
  // Diagnóstico completo
  diagnose() {
    return window.notificationPowerManager.diagnose();
  },
  
  // Instrucciones de uso
  help() {
    console.log(`
🔔 COMANDOS DISPONIBLES:

• testNotifications.setup('vendedor') - Configurar sistema completo
• testNotifications.playLoudSound() - Probar sonido fuerte
• testNotifications.diagnose() - Ver estado del sistema
• testNotifications.help() - Ver esta ayuda

📱 PARA VENDEDORES:
1. Ejecutar: testNotifications.setup('vendedor')
2. Permitir TODOS los permisos que se soliciten
3. Configurar dispositivo según las instrucciones mostradas
4. Probar con: testNotifications.playLoudSound()
    `);
  }
};

// 🎯 AUTO-INICIALIZACIÓN para vendedores
document.addEventListener('DOMContentLoaded', () => {
  // Detectar si es vendedor (puedes personalizar esta lógica)
  const isSellerPage = window.location.pathname.includes('/seller') || 
                       window.location.hash.includes('seller');
  
  if (isSellerPage) {
    console.log('🛒 Página de vendedor detectada - Inicializando sistema crítico...');
    setTimeout(() => {
      window.testNotifications.setup('vendedor');
    }, 2000);
  }
});

console.log('🔔 Sistema de notificaciones críticas cargado - Ejecuta testNotifications.help() para instrucciones');
