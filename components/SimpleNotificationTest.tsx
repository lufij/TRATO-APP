import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';

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

  useEffect(() => {
    if (!user?.id) return;

    console.log('🔄 Iniciando sistema simple de notificaciones...');
    setIsListening(true);

    // Configuración simple de realtime
    const channel = supabase
      .channel('simple-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `seller_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🎯 Nueva orden simple:', payload.new);
          
          const newOrder = payload.new;
          const notification = {
            id: Date.now(),
            message: `Nueva orden: Q${newOrder.total || '0.00'}`,
            timestamp: new Date().toISOString(),
            orderData: newOrder
          };
          
          // Agregar a la lista
          setNotifications(prev => [notification, ...prev.slice(0, 9)]);
          
          // Notificación del navegador
          if (Notification.permission === 'granted') {
            new Notification('🛒 Nueva Orden TRATO', {
              body: `Pedido por Q${newOrder.total || '0.00'}`,
              icon: '/favicon.ico',
              tag: 'simple-order'
            });
          }
          
          // Sonido simple
          try {
            const audio = new Audio();
            audio.volume = 0.5;
            // Crear tono con Web Audio API
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.3;
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 1);
            
            console.log('🔊 Sonido simple reproducido');
          } catch (error) {
            console.log('⚠️ Error con sonido:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Status simple:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Escuchando órdenes (modo simple)');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('❌ Error de conexión:', status);
          setIsListening(false);
        }
      });

    // Cleanup
    return () => {
      console.log('🔄 Limpiando suscripción simple');
      supabase.removeChannel(channel);
      setIsListening(false);
    };
  }, [user?.id]);

  // Solicitar permisos al montar
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('📱 Permiso notificaciones:', permission);
      });
    }
  }, []);

  const createTestOrder = async () => {
    if (!user?.id) return;

    console.log('🧪 Creando orden de prueba...');
    
    try {
      const testOrder = {
        buyer_id: '11111111-1111-1111-1111-111111111111',
        seller_id: user.id,
        total: Math.floor(Math.random() * 100) + 10,
        status: 'pending',
        notes: `Orden de prueba - ${new Date().toLocaleTimeString()}`
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
        alert('✅ Orden de prueba creada');
      }
    } catch (err: any) {
      console.error('❌ Excepción:', err);
      alert('Error: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🧪 Test Simple de Notificaciones</h2>
      
      <div style={{ 
        padding: '15px', 
        backgroundColor: isListening ? '#d4edda' : '#f8d7da', 
        border: `1px solid ${isListening ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '5px',
        marginBottom: '20px'
      }}>
        <strong>Estado:</strong> {isListening ? '✅ Escuchando' : '❌ Desconectado'}
        <br />
        <strong>Usuario:</strong> {user?.email || 'No autenticado'}
        <br />
        <strong>Permisos:</strong> {Notification.permission}
      </div>

      <button 
        onClick={createTestOrder}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        🧪 Crear Orden de Prueba
      </button>

      <h3>📋 Notificaciones Recibidas ({notifications.length})</h3>
      
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
      </div>
    </div>
  );
}
