import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';

interface CriticalNotificationSystemProps {
  userRole?: string;
}

export const CriticalNotificationSystem: React.FC<CriticalNotificationSystemProps> = ({ userRole }) => {
  const { user } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [isListening, setIsListening] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Crear sonido crítico más fuerte y persistente
  const createCriticalSound = async () => {
    try {
      // Método 1: Web Audio API para sonidos fuertes
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      await audioContext.resume();

      // Crear multiple tonos superpuestos para mayor volumen
      const frequencies = [800, 1000, 1200, 1400]; // Múltiples frecuencias
      const duration = 2000; // 2 segundos de duración

      frequencies.forEach((freq, index) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
          oscillator.type = 'sine';
          
          // Volumen máximo
          gainNode.gain.setValueAtTime(1.0, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
        }, index * 200);
      });

      // Método 2: Audio HTML5 como respaldo
      if (notificationSoundRef.current) {
        notificationSoundRef.current.volume = 1.0;
        notificationSoundRef.current.play().catch(console.warn);
      }

      // Método 3: Vibración prolongada
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200, 100, 400]);
      }

    } catch (error) {
      console.warn('Error creating critical sound:', error);
      // Fallback: intentar sonido simple
      if (notificationSoundRef.current) {
        notificationSoundRef.current.play().catch(() => {});
      }
    }
  };

  // Crear archivo de audio embebido
  const createAudioElement = () => {
    if (!notificationSoundRef.current) {
      const audio = new Audio();
      // Crear un tono usando Data URL
      const beepSound = generateBeepDataURL();
      audio.src = beepSound;
      audio.preload = 'auto';
      audio.volume = 1.0;
      audio.loop = false;
      notificationSoundRef.current = audio;
    }
  };

  // Generar beep como Data URL
  const generateBeepDataURL = (): string => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioCtx.sampleRate;
    const duration = 0.5; // 500ms
    const frequency = 1000; // 1kHz
    
    const samples = sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < samples; i++) {
      data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.8;
    }
    
    // Convertir a WAV data URL (simplificado)
    return 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjuR1++tZSsFJHfH8N2QQAcZY73o5KZMFA5VoOTxvHQpBSh+1++0bC8FLnbJ8N6CMAcSWb/u551KEAtNn+PosnknBTqDzuvdUysEKXLI79l9NwgSUL/q5qZrGQFKgsfr2nD';
  };

  // Solicitar permisos de manera agresiva
  const requestAllPermissions = async () => {
    try {
      console.log('🔔 Solicitando permisos críticos...');

      // 1. Permisos de notificación
      const notificationPermission = await Notification.requestPermission();
      setPermissionStatus(notificationPermission);

      // 2. Wake Lock para mantener pantalla activa
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.log('Wake lock activado');
        } catch (err) {
          console.warn('Wake lock no disponible:', err);
        }
      }

      // 3. Inicializar audio
      createAudioElement();
      
      // 4. Activar AudioContext con interacción del usuario
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // 5. Test de sonido para verificar
      await createCriticalSound();

      console.log('✅ Permisos configurados correctamente');
      return notificationPermission === 'granted';

    } catch (error) {
      console.error('Error solicitando permisos:', error);
      return false;
    }
  };

  // Enviar notificación crítica con sonido
  const sendCriticalNotification = async (title: string, body: string, data?: any) => {
    console.log('🚨 Enviando notificación crítica:', title);

    // Reproducir sonido ANTES de la notificación
    await createCriticalSound();

    // Enviar notificación del sistema
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/icon.png',
        badge: '/icon.png',
        tag: 'critical-order',
        requireInteraction: true,
        silent: false, // IMPORTANTE: no silenciar
        data: data || {}
      } as NotificationOptions & { vibrate?: number[] });

      // Reproducir sonido también cuando se muestre la notificación
      notification.onshow = () => {
        console.log('Notificación mostrada, reproduciendo sonido...');
        createCriticalSound();
      };

      // Auto-cerrar después de 10 segundos
      setTimeout(() => {
        notification.close();
      }, 10000);
    }
  };

  // Escuchar nuevas órdenes
  useEffect(() => {
    if (!user || userRole !== 'vendedor' || isListening) return;

    console.log('🎧 Iniciando escucha de nuevas órdenes...');
    setIsListening(true);

    const channel = supabase
      .channel('new-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `seller_id=eq.${user.id}`
        },
        (payload: any) => {
          console.log('🆕 Nueva orden detectada:', payload);
          const order = payload.new as any;
          
          sendCriticalNotification(
            '🛒 ¡NUEVA ORDEN RECIBIDA!',
            `Pedido por $${order.total || order.total_amount || '0'} - ${order.customer_name || 'Cliente'}`,
            {
              orderId: order.id,
              total: order.total || order.total_amount,
              customer: order.customer_name,
              type: 'new_order'
            }
          );
        }
      )
      .subscribe();

    return () => {
      console.log('🔇 Deteniendo escucha de órdenes');
      supabase.removeChannel(channel);
      setIsListening(false);
    };
  }, [user, userRole, isListening]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // UI para activar notificaciones
  if (permissionStatus !== 'granted') {
    return (
      <div 
        className="fixed top-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 z-50 shadow-lg"
        style={{ zIndex: 9999 }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="animate-pulse">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2c1.1 0 2 .9 2 2v3h4c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h4V4c0-1.1.9-2 2-2zm0 7c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1s1-.45 1-1v-4c0-.55-.45-1-1-1z"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-sm">🔔 NOTIFICACIONES CRÍTICAS</p>
              <p className="text-xs opacity-90">
                ¡Activa sonidos para no perder pedidos!
              </p>
            </div>
          </div>
          <button
            onClick={requestAllPermissions}
            className="bg-white text-orange-600 px-6 py-2 rounded-full font-bold text-sm hover:bg-orange-50 transition-colors shadow-lg"
          >
            ACTIVAR AHORA
          </button>
        </div>
      </div>
    );
  }

  // Mostrar estado activo
  if (isListening) {
    return (
      <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span>🔔 Notificaciones Activas</span>
        </div>
      </div>
    );
  }

  return null;
};

export default CriticalNotificationSystem;
