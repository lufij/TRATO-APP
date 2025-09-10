import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Volume2, VolumeX, Bell, BellOff, Smartphone } from 'lucide-react';

interface VendorNotificationSystemProps {
  onNewOrder?: (orderData: any) => void;
  testMode?: boolean;
}

interface NotificationState {
  permissions: NotificationPermission;
  soundEnabled: boolean;
  realtimeConnected: boolean;
  isListening: boolean;
  orderCount: number;
  reconnectAttempts: number;
  lastError: string | null;
  lastSuccessfulConnection: number | null;
  isReconnecting: boolean;
}

export function VendorNotificationSystem({ onNewOrder, testMode = false }: VendorNotificationSystemProps) {
  const { user } = useAuth();
  const [state, setState] = useState<NotificationState>({
    permissions: 'default',
    soundEnabled: false,
    realtimeConnected: false,
    isListening: false,
    orderCount: 0,
    reconnectAttempts: 0,
    lastError: null,
    lastSuccessfulConnection: null,
    isReconnecting: false
  });
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const channelRef = useRef<any>(null);
  const wakeLockRef = useRef<any>(null);
  const soundTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🔊 SONIDO CRÍTICO PARA VENDEDORES
  const playOrderSound = useCallback(async () => {
    if (!state.soundEnabled) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      await audioContext.resume();

      const playTone = (frequency: number, duration: number, delay: number = 0) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.8, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + duration / 1000);
        }, delay);
      };

      playTone(800, 400, 0);
      playTone(1000, 400, 300);
      playTone(1200, 600, 600);

      if ('vibrate' in navigator) {
        navigator.vibrate([300, 100, 300, 100, 500]);
      }

      console.log('🔊 Sonido de nueva orden reproducido');
    } catch (error) {
      console.warn('Error reproduciendo sonido:', error);
    }
  }, [state.soundEnabled]);

  // 🔔 MOSTRAR NOTIFICACIÓN FLOTANTE
  const showOrderNotification = useCallback(async (orderData: any) => {
    if (state.permissions !== 'granted') return;

    try {
      if (!orderData || typeof orderData !== 'object') {
        console.warn('⚠️ Datos de orden inválidos:', orderData);
        return;
      }

      const customerName = orderData.customer_name || orderData.buyer_name || 'Cliente Anónimo';
      const rawTotal = orderData.total || orderData.total_amount || 0;
      const total = typeof rawTotal === 'number' ? rawTotal : parseFloat(rawTotal) || 0;
      const notes = orderData.notes && typeof orderData.notes === 'string' 
        ? ` - ${orderData.notes.substring(0, 50)}`
        : '';
      const orderId = orderData.id || `temp-${Date.now()}`;

      const notification = new Notification('🛒 ¡NUEVA ORDEN RECIBIDA!', {
        body: `${customerName} - Q${total.toFixed(2)}${notes}`,
        icon: '/icon-192x192.png',
        tag: `order-${orderId}`,
        requireInteraction: true,
        silent: false
      } as NotificationOptions);

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (onNewOrder) onNewOrder(orderData);
      };

      setTimeout(() => notification.close(), 15000);

      console.log('🔔 Notificación flotante mostrada correctamente');
    } catch (error) {
      console.error('❌ Error mostrando notificación:', error);
    }
  }, [state.permissions, onNewOrder]);

  // 🎯 MANEJAR NUEVA ORDEN
  const handleNewOrder = useCallback(async (payload: any) => {
    try {
      const orderData = payload.new || payload.data || payload;
      if (!orderData) return;

      if (orderData.status && orderData.status !== 'pending' && orderData.status !== 'new') {
        console.log('📝 Orden no es nueva, es actualización:', orderData.status);
        return;
      }

      setState(prev => ({ ...prev, orderCount: prev.orderCount + 1 }));

      await playOrderSound();
      await showOrderNotification(orderData);

      const customerName = orderData.customer_name || orderData.buyer_name || 'Cliente';
      const total = orderData.total || orderData.total_amount || 0;
      
      toast.success('🛒 ¡Nueva Orden!', {
        description: `${customerName} - Q${parseFloat(total).toFixed(2)}`,
        duration: 8000
      });

      if (onNewOrder) onNewOrder(orderData);

      console.log('✅ Procesamiento de nueva orden completado');
    } catch (error) {
      console.error('❌ Error procesando nueva orden:', error);
    }
  }, [playOrderSound, showOrderNotification, onNewOrder]);

  // 🔄 RECONEXIÓN INTELIGENTE CON BACKOFF EXPONENCIAL
  const reconnectRealtime = useCallback(async () => {
    if (!user || user.role !== 'vendedor' || state.isReconnecting) return;
    
    // Anti-loop: verificar tiempo desde última conexión exitosa
    const timeSinceLastSuccess = state.lastSuccessfulConnection 
      ? Date.now() - state.lastSuccessfulConnection 
      : Infinity;
    
    if (timeSinceLastSuccess < 30000) { // Menos de 30 segundos
      console.log('⏱️ Conexión muy reciente, evitando reconexión innecesaria');
      return;
    }
    
    // Límite estricto: máximo 3 intentos
    if (state.reconnectAttempts >= 3) {
      console.error('❌ Límite de reconexión alcanzado');
      setState(prev => ({ 
        ...prev, 
        lastError: 'Conexión inestable - pausa de 5 min',
        isReconnecting: false
      }));
      
      toast.error('❌ Conexión inestable', {
        description: 'Sistema pausado por 5 minutos. Revisa tu internet.',
        duration: 15000
      });
      
      // Pausa de 5 minutos antes de permitir más intentos
      setTimeout(() => {
        setState(prev => ({ 
          ...prev, 
          reconnectAttempts: 0, 
          lastError: 'Sistema reiniciado - listo para conectar'
        }));
      }, 300000);
      
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isReconnecting: true,
      lastError: `Reconectando... (${prev.reconnectAttempts + 1}/3)`
    }));

    console.log(`🔄 Reconexión inteligente ${state.reconnectAttempts + 1}/3`);

    try {
      // Limpiar canal anterior completamente
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
          await supabase.removeChannel(channelRef.current);
        } catch (e) { /* ignorar errores de limpieza */ }
        channelRef.current = null;
      }

      // Backoff exponencial: 5s, 20s, 80s
      const delay = Math.min(5000 * Math.pow(4, state.reconnectAttempts), 80000);
      console.log(`⏱️ Esperando ${delay/1000}s antes de reconectar...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));

      // Crear canal con configuración optimizada
      const channelName = `vendor-orders-${user.id}-${Date.now()}`;
      const newChannel = supabase
        .channel(channelName, {
          config: {
            presence: { key: user.id },
            broadcast: { self: false },
            private: true
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `seller_id=eq.${user.id}`
          },
          handleNewOrder
        )
        .subscribe((status) => {
          console.log('📡 Estado reconexión:', status);
          
          if (status === 'SUBSCRIBED') {
            setState(prev => ({
              ...prev,
              realtimeConnected: true,
              isListening: true,
              reconnectAttempts: 0, // RESET total
              lastError: null,
              isReconnecting: false,
              lastSuccessfulConnection: Date.now()
            }));
            
            toast.success('✅ Reconectado', {
              description: 'Sistema de notificaciones restaurado'
            });
            
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            setState(prev => ({ 
              ...prev, 
              realtimeConnected: false,
              isListening: false,
              reconnectAttempts: prev.reconnectAttempts + 1,
              lastError: `Error: ${status}`,
              isReconnecting: false
            }));
            
            // Programar siguiente intento si no hemos excedido límite
            if (state.reconnectAttempts + 1 < 3) {
              if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
              }
              
              reconnectTimeoutRef.current = setTimeout(() => {
                reconnectRealtime();
              }, 15000); // 15 segundos entre fallos
            }
          }
        });

      channelRef.current = newChannel;
      
    } catch (error) {
      console.error('❌ Error crítico en reconexión:', error);
      setState(prev => ({ 
        ...prev, 
        reconnectAttempts: prev.reconnectAttempts + 1,
        lastError: 'Error crítico de conexión',
        isReconnecting: false
      }));
    }
  }, [user, state.reconnectAttempts, state.isReconnecting, state.lastSuccessfulConnection, handleNewOrder]);

  // 🚀 INICIALIZAR SISTEMA
  const initializeSystem = useCallback(async () => {
    if (!user || user.role !== 'vendedor') return;

    try {
      console.log('🚀 Inicializando sistema de notificaciones...');

      // Permisos
      if (state.permissions !== 'granted') {
        const permission = await Notification.requestPermission();
        setState(prev => ({ ...prev, permissions: permission }));
      }

      // Activar sonidos
      if (!state.soundEnabled) {
        setState(prev => ({ ...prev, soundEnabled: true }));
      }

      // Wake Lock
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (e) { /* Wake lock opcional */ }
      }

      // Configurar Realtime - Solo si no está ya conectado
      if (!channelRef.current && !state.isListening) {
        const channel = supabase
          .channel(`vendor-orders-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'orders',
              filter: `seller_id=eq.${user.id}`
            },
            handleNewOrder
          )
          .subscribe((status) => {
            console.log('📡 Estado inicial:', status);
            
            if (status === 'SUBSCRIBED') {
              setState(prev => ({
                ...prev,
                realtimeConnected: true,
                isListening: true,
                lastSuccessfulConnection: Date.now(),
                lastError: null
              }));
              
              toast.success('📡 Sistema conectado');
              
            } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
              console.warn('⚠️ Error inicial, iniciando reconexión...');
              setState(prev => ({ 
                ...prev, 
                realtimeConnected: false,
                isListening: false 
              }));
              
              // Iniciar reconexión con delay
              setTimeout(() => {
                reconnectRealtime();
              }, 3000);
            }
          });

        channelRef.current = channel;
      }

    } catch (error) {
      console.error('Error inicializando:', error);
      toast.error('Error de inicialización');
    }
  }, [user, state.permissions, state.soundEnabled, state.isListening, handleNewOrder, reconnectRealtime]);

  // 🧹 LIMPIEZA
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (soundTimeoutRef.current) {
        clearTimeout(soundTimeoutRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // 🎬 INICIALIZAR
  useEffect(() => {
    if (user?.role === 'vendedor') {
      const timer = setTimeout(initializeSystem, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, initializeSystem]);

  // 🧪 FUNCIÓN DE PRUEBA
  const testNotification = useCallback(async () => {
    const mockOrder = {
      id: 'test-' + Date.now(),
      customer_name: 'Cliente de Prueba',
      total: 75.50,
      notes: 'Orden de prueba',
      created_at: new Date().toISOString()
    };

    await handleNewOrder({ new: mockOrder });
  }, [handleNewOrder]);

  // 🔄 TOGGLE DE SONIDO
  const toggleSound = () => {
    setState(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
    toast.success(state.soundEnabled ? '🔇 Sonidos OFF' : '🔊 Sonidos ON');
  };

  if (!user || user.role !== 'vendedor') {
    return null;
  }

  return (
    <Card className="fixed top-4 right-4 w-80 z-50 shadow-lg border-orange-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-600" />
            <span className="font-semibold text-sm">Notificaciones</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant={state.isListening ? "default" : "destructive"} className="text-xs">
              {state.isListening ? 'Activo' : 'Inactivo'}
            </Badge>
            {state.isReconnecting && (
              <Badge variant="secondary" className="text-xs animate-pulse">
                Conectando...
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span>Permisos:</span>
            <Badge variant={state.permissions === 'granted' ? 'default' : 'destructive'}>
              {state.permissions === 'granted' ? '✅' : '❌'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Realtime:</span>
            <div className="flex items-center gap-1">
              <Badge variant={state.realtimeConnected ? 'default' : 'destructive'}>
                {state.realtimeConnected ? '🟢' : '🔴'}
              </Badge>
              {state.reconnectAttempts > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {state.reconnectAttempts}/3
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span>Órdenes:</span>
            <Badge>{state.orderCount}</Badge>
          </div>

          {state.lastError && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
              <span className="text-amber-700 font-medium">Estado:</span>
              <p className="text-amber-600">{state.lastError}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={toggleSound} className="flex-1">
            {state.soundEnabled ? (
              <><Volume2 className="w-3 h-3 mr-1" />ON</>
            ) : (
              <><VolumeX className="w-3 h-3 mr-1" />OFF</>
            )}
          </Button>
          
          {testMode && (
            <Button size="sm" onClick={testNotification} className="flex-1">
              <Smartphone className="w-3 h-3 mr-1" />Test
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
