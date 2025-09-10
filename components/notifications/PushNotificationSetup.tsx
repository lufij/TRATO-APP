import React, { useState, useEffect } from 'react';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export default function PushNotificationSetup() {
  const {
    permission,
    supported,
    pushSubscription,
    serviceWorkerReady,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification,
    canNotify
  } = usePushNotifications();

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // 🔄 Activar Push Notifications
  const handleActivatePush = async () => {
    setIsLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      await subscribeToPush();
      setStatus('success');
      setMessage('¡Push Notifications activadas correctamente! Ahora recibirás notificaciones incluso con la app cerrada.');
      
      // Enviar notificación de confirmación
      setTimeout(() => {
        sendTestNotification();
      }, 1000);

    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Error activando notificaciones Push');
      console.error('Error activando Push:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔄 Desactivar Push Notifications
  const handleDeactivatePush = async () => {
    setIsLoading(true);
    
    try {
      await unsubscribeFromPush();
      setStatus('success');
      setMessage('Push Notifications desactivadas.');
    } catch (error) {
      setStatus('error');
      setMessage('Error desactivando notificaciones Push');
      console.error('Error desactivando Push:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 🧪 Probar notificaciones
  const handleTestNotification = async () => {
    setIsLoading(true);
    
    try {
      await sendTestNotification();
      setStatus('success');
      setMessage('Notificación de prueba enviada. ¡Deberías haberla recibido!');
    } catch (error) {
      setStatus('error');
      setMessage('Error enviando notificación de prueba');
    } finally {
      setIsLoading(false);
    }
  };

  // 🎨 Obtener estilo del estado
  const getStatusStyles = () => {
    if (!supported) return { bg: 'bg-gray-100', text: 'text-gray-600', icon: '⚠️' };
    if (!serviceWorkerReady) return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏳' };
    if (permission === 'denied') return { bg: 'bg-red-100', text: 'text-red-800', icon: '🚫' };
    if (pushSubscription) return { bg: 'bg-green-100', text: 'text-green-800', icon: '✅' };
    return { bg: 'bg-blue-100', text: 'text-blue-800', icon: '🔔' };
  };

  const statusStyles = getStatusStyles();

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-2xl">🔔</div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Push Notifications
          </h3>
          <p className="text-sm text-gray-600">
            Recibe notificaciones incluso con la app cerrada
          </p>
        </div>
      </div>

      {/* Estado actual */}
      <div className={`${statusStyles.bg} ${statusStyles.text} rounded-lg p-4 mb-6`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{statusStyles.icon}</span>
          <div>
            <div className="font-medium">
              {!supported && 'No soportado en este navegador'}
              {supported && !serviceWorkerReady && 'Cargando sistema...'}
              {supported && serviceWorkerReady && permission === 'denied' && 'Permisos denegados'}
              {supported && serviceWorkerReady && permission === 'default' && 'Permisos pendientes'}
              {pushSubscription && 'Notificaciones Push activas'}
            </div>
            <div className="text-sm opacity-90">
              {!supported && 'Usa Chrome, Firefox o Edge para recibir notificaciones Push'}
              {supported && !serviceWorkerReady && 'Inicializando Service Worker...'}
              {supported && serviceWorkerReady && permission === 'denied' && 'Permite las notificaciones en la configuración del navegador'}
              {supported && serviceWorkerReady && permission === 'default' && 'Haz clic en "Activar" para recibir notificaciones'}
              {pushSubscription && 'Recibirás notificaciones incluso con la pantalla apagada o la app cerrada'}
            </div>
          </div>
        </div>
      </div>

      {/* Mensaje de estado */}
      {message && (
        <div className={`rounded-lg p-4 mb-4 ${
          status === 'success' ? 'bg-green-50 text-green-800' :
          status === 'error' ? 'bg-red-50 text-red-800' :
          'bg-blue-50 text-blue-800'
        }`}>
          <div className="flex items-center gap-2">
            <span>{status === 'success' ? '✅' : status === 'error' ? '❌' : 'ℹ️'}</span>
            <span className="text-sm">{message}</span>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex gap-3 flex-wrap">
        {supported && serviceWorkerReady && (
          <>
            {!pushSubscription ? (
              <button
                onClick={handleActivatePush}
                disabled={isLoading || permission === 'denied'}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                {isLoading ? '⏳' : '🚀'}
                {isLoading ? 'Activando...' : 'Activar Push Notifications'}
              </button>
            ) : (
              <button
                onClick={handleDeactivatePush}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                {isLoading ? '⏳' : '🛑'}
                {isLoading ? 'Desactivando...' : 'Desactivar'}
              </button>
            )}

            {canNotify && (
              <button
                onClick={handleTestNotification}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                {isLoading ? '⏳' : '🧪'}
                Probar Notificación
              </button>
            )}
          </>
        )}
      </div>

      {/* Información técnica */}
      {pushSubscription && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Estado técnico:</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Service Worker: {serviceWorkerReady ? '✅ Activo' : '❌ Inactivo'}</div>
            <div>Permisos: {permission === 'granted' ? '✅ Concedidos' : `❌ ${permission}`}</div>
            <div>Push: {pushSubscription ? '✅ Suscrito' : '❌ No suscrito'}</div>
            <div>Navegador: {supported ? '✅ Soportado' : '❌ No soportado'}</div>
          </div>
        </div>
      )}

      {/* Instrucciones */}
      <div className="mt-6 text-sm text-gray-600">
        <h4 className="font-medium mb-2">¿Por qué activar Push Notifications?</h4>
        <ul className="space-y-1 list-disc list-inside">
          <li>Recibe órdenes nuevas incluso con el teléfono bloqueado</li>
          <li>No te pierdas ninguna venta por no estar viendo la app</li>
          <li>Funciona aunque tengas otras apps abiertas</li>
          <li>Sistema de sonido potente + vibración intensa</li>
        </ul>
      </div>
    </div>
  );
}
