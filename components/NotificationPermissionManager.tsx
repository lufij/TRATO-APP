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

  // Determinar si necesita mostrar el botón
  const needsActivation = permissions.notifications !== 'granted' || !permissions.persistent;

  if (!needsActivation) {
    return null; // No mostrar nada si los permisos están OK
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 1000,
      backgroundColor: '#ff6b35',
      color: 'white',
      padding: '15px',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      maxWidth: '300px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <Bell size={24} />
        <strong>Activar Notificaciones</strong>
      </div>
      
      <p style={{ margin: '0 0 15px 0', fontSize: '14px', lineHeight: '1.4' }}>
        Para recibir alertas de nuevos pedidos con sonido
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {permissions.notifications !== 'granted' && (
          <button
            onClick={requestNotificationPermission}
            style={{
              backgroundColor: 'white',
              color: '#ff6b35',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Bell size={16} />
            Permitir Notificaciones
          </button>
        )}

        <button
          onClick={testAudio}
          disabled={testSound}
          style={{
            backgroundColor: permissions.audio ? '#28a745' : 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '8px 12px',
            borderRadius: '5px',
            cursor: testSound ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          {testSound ? <VolumeX size={14} /> : <Volume2 size={14} />}
          {testSound ? 'Probando...' : 'Probar Sonido'}
        </button>
      </div>

      {showInstructions && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: '5px',
          fontSize: '12px',
          lineHeight: '1.3'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
            <Smartphone size={14} />
            <strong>Instrucciones Mobile:</strong>
          </div>
          <ul style={{ margin: '0', paddingLeft: '15px' }}>
            <li>Android: Configuración → Apps → Chrome → Notificaciones</li>
            <li>iPhone: Configuración → Safari → Notificaciones</li>
            <li>Permitir sonidos y ventanas emergentes</li>
          </ul>
          
          <button
            onClick={() => setShowInstructions(false)}
            style={{
              marginTop: '8px',
              backgroundColor: 'transparent',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '5px 10px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            Cerrar
          </button>
        </div>
      )}

      <div style={{
        marginTop: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '11px', opacity: 0.8 }}>
          Estado: {permissions.notifications} | Audio: {permissions.audio ? '✓' : '✗'}
        </div>
        
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          style={{
            backgroundColor: 'transparent',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            padding: '5px'
          }}
        >
          <AlertTriangle size={14} />
        </button>
      </div>
    </div>
  );
}
