import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Bell, BellOff, Smartphone, AlertTriangle, CheckCircle } from 'lucide-react';

interface IOSNotificationSetupProps {
  onPermissionChange?: (granted: boolean) => void;
}

const IOSNotificationSetup: React.FC<IOSNotificationSetupProps> = ({ onPermissionChange }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Detectar si está instalada como PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone;

    setIsIOS(iOS);
    setIsStandalone(standalone);

    // Obtener permiso actual
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Las notificaciones no están soportadas en este navegador');
      return;
    }

    try {
      // En iOS, solo funciona si está instalada como PWA
      if (isIOS && !isStandalone) {
        setShowInstructions(true);
        return;
      }

      const result = await Notification.requestPermission();
      setPermission(result);
      onPermissionChange?.(result === 'granted');

      // Mostrar notificación de prueba si se concede
      if (result === 'granted') {
        try {
          const notification = new Notification('🎉 ¡Notificaciones activadas!', {
            body: 'Ahora recibirás alertas de nuevos pedidos',
            icon: '/icon-192.png',
            badge: '/icon-96.png',
            tag: 'test-notification',
            requireInteraction: false
          } as NotificationOptions);
          
          // Vibrar por separado si está soportado
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }

          // Auto-cerrar después de 4 segundos
          setTimeout(() => notification.close(), 4000);
        } catch (notifError) {
          console.log('Error mostrando notificación de prueba:', notifError);
        }
      }

    } catch (error) {
      console.error('Error solicitando permisos de notificación:', error);
    }
  };

  const getStatusColor = () => {
    switch (permission) {
      case 'granted': return 'text-green-600';
      case 'denied': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getStatusText = () => {
    switch (permission) {
      case 'granted': return '✅ Notificaciones activas';
      case 'denied': return '❌ Notificaciones bloqueadas';
      default: return '⚠️ Notificaciones pendientes';
    }
  };

  if (showInstructions && isIOS && !isStandalone) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <Smartphone className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-2">
              🚨 Instrucciones para iPhone
            </h3>
            
            <div className="space-y-3 text-sm text-blue-800">
              <div className="bg-white rounded-md p-3 border border-blue-100">
                <p className="font-medium mb-2">Para recibir notificaciones en iPhone:</p>
                
                <ol className="space-y-2 text-xs">
                  <li className="flex items-start gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                    <span>Toca el botón <strong>Compartir</strong> (□↑) en la parte inferior de Safari</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                    <span>Selecciona <strong>"Añadir a pantalla de inicio"</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                    <span>Toca <strong>"Añadir"</strong> para confirmar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                    <span>Abre la app desde tu <strong>pantalla de inicio</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">5</span>
                    <span>Vuelve a hacer clic en <strong>"Activar Notificaciones"</strong></span>
                  </li>
                </ol>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
                <p className="text-xs text-yellow-800">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  <strong>Importante:</strong> En iPhone, las notificaciones solo funcionan cuando la app está instalada en la pantalla de inicio.
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 mt-3">
              <Button
                onClick={() => setShowInstructions(false)}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-300"
              >
                Entendido
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${
          permission === 'granted' ? 'bg-green-100' : 
          permission === 'denied' ? 'bg-red-100' : 'bg-yellow-100'
        }`}>
          {permission === 'granted' ? 
            <CheckCircle className="h-5 w-5 text-green-600" /> : 
            permission === 'denied' ?
            <BellOff className="h-5 w-5 text-red-600" /> :
            <Bell className="h-5 w-5 text-yellow-600" />
          }
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            Notificaciones de Pedidos
          </h3>
          <p className={`text-sm ${getStatusColor()}`}>
            {getStatusText()}
          </p>
          
          {isIOS && !isStandalone && permission !== 'granted' && (
            <p className="text-xs text-gray-600 mt-1">
              En iPhone: Requiere instalación como app
            </p>
          )}
        </div>

        {permission !== 'granted' && (
          <Button
            onClick={requestPermission}
            className="bg-orange-500 hover:bg-orange-600 text-white"
            size="sm"
          >
            <Bell className="h-4 w-4 mr-1" />
            Activar
          </Button>
        )}
        
        {permission === 'granted' && (
          <Button
            onClick={() => {
              // Notificación de prueba
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('🧪 Prueba de TRATO', {
                  body: 'Las notificaciones están funcionando correctamente',
                  icon: '/icon-192.png'
                } as NotificationOptions);
                
                // Vibrar por separado
                if ('vibrate' in navigator) {
                  navigator.vibrate([200, 100, 200]);
                }
              }
            }}
            variant="outline"
            size="sm"
            className="text-green-600 border-green-300"
          >
            Probar
          </Button>
        )}
      </div>
      
      {permission === 'denied' && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            <strong>Notificaciones bloqueadas.</strong> Para activarlas:
          </p>
          <ul className="text-xs text-red-700 mt-1 space-y-1">
            <li>• Haz clic en el icono de candado en la barra de direcciones</li>
            <li>• Cambia "Notificaciones" a "Permitir"</li>
            <li>• Recarga la página</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default IOSNotificationSetup;
