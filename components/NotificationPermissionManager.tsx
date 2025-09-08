import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2, VolumeX, Smartphone, AlertTriangle } from 'lucide-react';

interface PermissionState {
  notifications: NotificationPermission;
  audio: boolean;
  persistent: boolean;
}

export function NotificationPermissionManager() {
  const [permissions, setPermissions] = useState<PermissionState>({
    notifications: 'default',
    audio: false,
    persistent: false
  });
  
  const [showInstructions, setShowInstructions] = useState(false);
  const [testSound, setTestSound] = useState(false);

  // Verificar permisos al cargar
  useEffect(() => {
    checkPermissions();
    
    // Verificar si los permisos están guardados persistentemente
    const savedPermissions = localStorage.getItem('trato_permissions');
    if (savedPermissions) {
      setPermissions(prev => ({ ...prev, persistent: true }));
    }
  }, []);

  const checkPermissions = () => {
    const newState: PermissionState = {
      notifications: Notification.permission,
      audio: true, // Asumimos que está disponible hasta que se pruebe
      persistent: localStorage.getItem('trato_permissions') === 'granted'
    };
    
    setPermissions(newState);
  };

  const requestNotificationPermission = async () => {
    try {
      console.log('📱 Solicitando permisos de notificación...');
      
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        // Guardar permiso persistentemente
        localStorage.setItem('trato_permissions', 'granted');
        localStorage.setItem('trato_permissions_date', new Date().toISOString());
        
        // Mostrar notificación de prueba
        const testNotification = new Notification('🎉 ¡Permisos Activados!', {
          body: 'Las notificaciones de TRATO están activas',
          icon: '/favicon.ico',
          tag: 'permission-granted',
          requireInteraction: true
        });

        // Auto-cerrar después de 3 segundos
        setTimeout(() => testNotification.close(), 3000);
        
        console.log('✅ Permisos concedidos y guardados');
      }
      
      checkPermissions();
    } catch (error) {
      console.error('❌ Error al solicitar permisos:', error);
      setShowInstructions(true);
    }
  };

  const testAudio = async () => {
    setTestSound(true);
    
    try {
      // Crear un contexto de audio (requiere interacción del usuario)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Crear tono de prueba
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configurar sonido agradable
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.3);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.8);
      
      console.log('🔊 Sonido de prueba reproducido');
      
      // Actualizar estado después del sonido
      setTimeout(() => {
        setTestSound(false);
        setPermissions(prev => ({ ...prev, audio: true }));
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error con audio:', error);
      setTestSound(false);
      setPermissions(prev => ({ ...prev, audio: false }));
    }
  };

  const resetPermissions = () => {
    localStorage.removeItem('trato_permissions');
    localStorage.removeItem('trato_permissions_date');
    checkPermissions();
    console.log('🔄 Permisos restablecidos');
  };

  // COMPONENTE DESHABILITADO - No mostrar nada nunca
  // Los permisos se manejan automáticamente cuando se necesiten
  return null;
}
