import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { NotificationPermissionManager } from './NotificationPermissionManager';
import { FloatingNotifications, useFloatingNotifications } from './FloatingNotifications';

interface NotificationItem {
  id: number;
  message: string;
  timestamp: string;
  orderData: any;
}

export function SimpleNotificationTest() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isListening, setIsListening] = useState(false);
  const { 
    notifications: floatingNotifications, 
    addNotification, 
    removeNotification 
  } = useFloatingNotifications();

  // Función mejorada para reproducir sonido
  const playNotificationSound = useCallback(async () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Verificar si el contexto está suspendido (política de navegador)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Crear un sonido más agradable y llamativo
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configurar sonido de campana
      oscillator1.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator1.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.3);
      oscillator1.type = 'sine';
      
      oscillator2.frequency.setValueAtTime(1200, audioContext.currentTime);
      oscillator2.frequency.exponentialRampToValueAtTime(900, audioContext.currentTime + 0.3);
      oscillator2.type = 'triangle';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.2);
      
      oscillator1.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 1.2);
      oscillator2.start(audioContext.currentTime + 0.1);
      oscillator2.stop(audioContext.currentTime + 1.0);
      
      console.log('🔊 Sonido mejorado reproducido');
      
    } catch (error) {
      console.log('⚠️ Error con sonido:', error);
      // Fallback a beep básico
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhDSmG0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+ltryxnkpBSuBzvLZiTYIG2m98+OdTgwOUarm9LRjHgU4kNbyz3wtBSN2yO/eizELElyx6+SjUhQKQ5zd8sFuIAwnhM/z2YYzBiJwwO/kmEoODlOq5O+zYBoGPJPY88p9KwUme8rx4I4yDBhivO3lm0sMDUqt6O2tVxkLPpnb88F9Lgopen+1+LdaFwoCUKjx7rhiHgU3kNbyzHspBCp+zOzelC0KEFRS8lPzUoGkzY4PBNd8t5iNgRUEfKXGqKNbDgEfMgvzVzPH1fhUtaBOK53G33mOH4vMvdnG7Pj8P/+XjC9LLsrjNhwT+LGPRlNLvOOgV5kXLZsL5wLvOLKfWyfrTr0+sWpwjJfUnI6Z9W5p5+aqUJgEa3Nxdm7eCFy3Oo/oPjzPqGEfgRZzDZJnUKfEhF4YP2p8FKXY');
        audio.play();
      } catch (fallbackError) {
        console.log('⚠️ También falló el sonido de respaldo');
      }
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    console.log('🔄 Iniciando sistema mejorado de notificaciones...');
    setIsListening(true);

    const channel = supabase
      .channel('enhanced-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `seller_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🎯 Nueva orden mejorada:', payload.new);
          
          const newOrder = payload.new;
          const total = parseFloat(newOrder.total || '0').toFixed(2);
          
          const notification = {
            id: Date.now(),
            message: `Nueva orden: Q${total}`,
            timestamp: new Date().toISOString(),
            orderData: newOrder
          };
          
          // Agregar a la lista histórica
          setNotifications(prev => [notification, ...prev.slice(0, 9)]);
          
          // Agregar notificación flotante
          addNotification({
            title: '🛒 Nuevo Pedido TRATO',
            message: `Orden por Q${total} - ${newOrder.notes || 'Sin notas'}`,
            orderData: newOrder,
            duration: 6000
          });
          
          // Reproducir sonido mejorado
          playNotificationSound();
          
          // Notificación del navegador (solo si está permitido)
          if (Notification.permission === 'granted') {
            const browserNotification = new Notification('🛒 Nuevo Pedido TRATO', {
              body: `Orden por Q${total}${newOrder.notes ? ` - ${newOrder.notes}` : ''}`,
              icon: '/favicon.ico',
              tag: 'trato-order-' + newOrder.id,
              requireInteraction: true,
              actions: [
                { action: 'view', title: 'Ver Pedido' },
                { action: 'dismiss', title: 'Cerrar' }
              ]
            });

            // Auto-cerrar después de 8 segundos
            setTimeout(() => {
              browserNotification.close();
            }, 8000);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Status mejorado:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Sistema de notificaciones activo');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('❌ Error de conexión:', status);
          setIsListening(false);
        }
      });

    return () => {
      console.log('🔄 Limpiando suscripción mejorada');
      supabase.removeChannel(channel);
      setIsListening(false);
    };
  }, [user?.id, addNotification, playNotificationSound]);

  // Solicitar permisos al montar - Mejorado
  useEffect(() => {
    // Solo solicitar si no hay permisos guardados
    const savedPermissions = localStorage.getItem('trato_permissions');
    
    if (Notification.permission === 'default' && !savedPermissions) {
      console.log('📱 Solicitando permisos automáticamente...');
      Notification.requestPermission().then(permission => {
        console.log('📱 Permiso de notificaciones:', permission);
        if (permission === 'granted') {
          localStorage.setItem('trato_permissions', 'granted');
          localStorage.setItem('trato_permissions_date', new Date().toISOString());
        }
      });
    } else if (savedPermissions === 'granted' && Notification.permission !== 'granted') {
      // Los permisos fueron revocados, limpiar storage
      localStorage.removeItem('trato_permissions');
      localStorage.removeItem('trato_permissions_date');
    }
  }, []);

  const createTestOrder = async () => {
    if (!user?.id) return;

    console.log('🧪 Creando orden de prueba mejorada...');
    
    try {
      const testOrder = {
        buyer_id: '11111111-1111-1111-1111-111111111111',
        seller_id: user.id,
        total: (Math.floor(Math.random() * 100) + 25).toFixed(2),
        status: 'pending',
        notes: `Orden de prueba - ${new Date().toLocaleTimeString()} - Cliente: Juan Pérez`
      };

      const { data, error } = await supabase
        .from('orders')
        .insert(testOrder)
        .select();

      if (error) {
        console.error('❌ Error:', error);
        alert('Error: ' + error.message);
      } else {
        console.log('✅ Orden de prueba creada:', data[0]);
        addNotification({
          title: '🧪 Orden de Prueba Creada',
          message: `Orden por Q${testOrder.total} generada exitosamente`,
          orderData: data[0],
          duration: 4000
        });
      }
    } catch (err: any) {
      console.error('❌ Excepción:', err);
      alert('Error: ' + err.message);
    }
  };

  const testNotificationAndSound = () => {
    // Probar notificación flotante
    addNotification({
      title: '🔔 Prueba de Sistema',
      message: 'Esta es una notificación flotante de prueba con sonido',
      duration: 5000
    });
    
    // Probar sonido
    playNotificationSound();
    
    // Probar notificación del navegador
    if (Notification.permission === 'granted') {
      new Notification('🔔 Prueba TRATO', {
        body: 'Sistema de notificaciones funcionando correctamente',
        icon: '/favicon.ico',
        tag: 'test-notification'
      });
    }
  };

  return (
    <>
      {/* Gestión de permisos - aparece solo cuando se necesita */}
      <NotificationPermissionManager />
      
      {/* Notificaciones flotantes */}
      <FloatingNotifications 
        notifications={floatingNotifications}
        onRemove={removeNotification}
      />
      
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h2>🧪 Test Mejorado de Notificaciones</h2>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: isListening ? '#d4edda' : '#f8d7da', 
          border: `1px solid ${isListening ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <strong>Estado:</strong> {isListening ? '✅ Sistema Activo' : '❌ Desconectado'}
          <br />
          <strong>Usuario:</strong> {user?.email || 'No autenticado'}
          <br />
          <strong>Permisos Navegador:</strong> {Notification.permission}
          <br />
          <strong>Permisos Guardados:</strong> {localStorage.getItem('trato_permissions') || 'No guardados'}
          <br />
          <strong>Notificaciones Flotantes:</strong> {floatingNotifications.length} activas
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button 
            onClick={createTestOrder}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🧪 Crear Orden de Prueba
          </button>
          
          <button 
            onClick={testNotificationAndSound}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🔔 Probar Notificación + Sonido
          </button>
        </div>

        <h3>📋 Historial de Notificaciones ({notifications.length})</h3>
        
        {notifications.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            No hay notificaciones aún. Crea una orden de prueba para verificar.
          </p>
        ) : (
          <div>
            {notifications.map((notif, index) => (
              <div 
                key={notif.id}
                style={{
                  padding: '10px',
                  backgroundColor: index === 0 ? '#fff3cd' : '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '5px',
                  marginBottom: '10px'
                }}
              >
                <strong>{notif.message}</strong>
                <br />
                <small style={{ color: '#666' }}>
                  {new Date(notif.timestamp).toLocaleTimeString()}
                </small>
                {notif.orderData?.notes && (
                  <>
                    <br />
                    <small>{notif.orderData.notes}</small>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
          <h4>🔧 Debug Info</h4>
          <p><strong>Realtime conectado:</strong> {isListening ? 'Sí' : 'No'}</p>
          <p><strong>Audio Context:</strong> {typeof AudioContext !== 'undefined' ? 'Disponible' : 'No disponible'}</p>
          <p><strong>Notificaciones Flotantes:</strong> {floatingNotifications.length} activas</p>
          <p><strong>Permisos Persistentes:</strong> {localStorage.getItem('trato_permissions') || 'No configurados'}</p>
        </div>
      </div>
    </>
  );
}