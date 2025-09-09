// TRATO Service Worker - Notificaciones Push Mejoradas v1.4.1
const CACHE_NAME = 'trato-app-v1.4.1';

// Instalar Service Worker con cache mínimo
self.addEventListener('install', (event) => {
  console.log('🚀 TRATO SW: Instalando Service Worker v1.4.1');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ TRATO SW: Cache inicializado');
        // Cache mínimo para offline
        return cache.addAll([
          '/',
          '/manifest.json',
          '/offline.html'
        ].filter(Boolean));
      })
      .catch((error) => {
        console.error('❌ TRATO SW: Error al cachear:', error);
      })
  );
  self.skipWaiting(); // Activar inmediatamente
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
  console.log('🔄 TRATO SW: Activando Service Worker');
  event.waitUntil((async () => {
    // Limpiar caches antiguos
    const keys = await caches.keys();
    await Promise.all(
      keys.map((k) => k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())
    );
    await self.clients.claim();
    console.log('✅ TRATO SW: Service Worker activado y reclamado');
  })());
});

// ===== NOTIFICACIONES PUSH AVANZADAS =====

// Escuchar mensajes push del servidor
self.addEventListener('push', (event) => {
  console.log('📨 TRATO SW: Push recibido:', event);
  
  let notificationOptions = {
    title: 'TRATO - Nueva Orden 🛒',
    body: 'Tienes un nuevo pedido que requiere tu atención inmediata',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    image: '/notification-banner.png',
    data: {
      url: '/',
      timestamp: Date.now(),
      type: 'new_order',
      sound: 'critical'
    },
    actions: [
      {
        action: 'view_order',
        title: '👀 Ver Pedido',
        icon: '/icon-view.png'
      },
      {
        action: 'dismiss',
        title: '❌ Cerrar',
        icon: '/icon-close.png'
      }
    ],
    tag: 'trato-critical-order',
    renotify: true,
    requireInteraction: true, // CRÍTICO: No se cierra automáticamente
    silent: false, // IMPORTANTE: Con sonido del sistema
    vibrate: [500, 200, 500, 200, 500, 300, 200, 300, 500], // Patrón FUERTE
    dir: 'ltr',
    lang: 'es',
    timestamp: Date.now(),
    // Configuraciones adicionales para mejor funcionamiento con pantalla apagada
    persistent: true,
    sticky: true
  };

  // Procesar datos del push si existen
  if (event.data) {
    try {
      const pushData = event.data.json();
      console.log('📦 TRATO SW: Datos del push:', pushData);
      
      // Personalizar notificación según tipo
      if (pushData.type === 'new_order') {
        notificationOptions.title = `🆕 Nuevo Pedido - ${pushData.order_type || 'Delivery'}`;
        notificationOptions.body = `Pedido #${pushData.order_id || 'XXX'} por $${pushData.total || '0.00'}`;
        notificationOptions.data.orderId = pushData.order_id;
        notificationOptions.tag = `order-${pushData.order_id}`;
      } else if (pushData.type === 'order_ready') {
        notificationOptions.title = '✅ Pedido Listo para Recoger';
        notificationOptions.body = `Tu pedido #${pushData.order_id} está listo`;
        notificationOptions.icon = '/icon-ready.png';
      } else if (pushData.type === 'order_delivered') {
        notificationOptions.title = '🎉 Pedido Entregado';
        notificationOptions.body = `Tu pedido #${pushData.order_id} ha sido entregado`;
        notificationOptions.icon = '/icon-delivered.png';
      }
      
      // Merge con datos adicionales
      notificationOptions = { ...notificationOptions, ...pushData.notification };
      
    } catch (error) {
      console.error('❌ TRATO SW: Error parseando push data:', error);
    }
  }

  // Mostrar notificación
  event.waitUntil(
    self.registration.showNotification(notificationOptions.title, notificationOptions)
      .then(() => {
        console.log('✅ TRATO SW: Notificación mostrada');
        
        // Reproducir sonido personalizado si es posible
        if ('serviceWorker' in navigator && 'Notification' in window) {
          playNotificationSound(notificationOptions.data.type);
        }
      })
      .catch((error) => {
        console.error('❌ TRATO SW: Error mostrando notificación:', error);
      })
  );
});

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('👆 TRATO SW: Click en notificación:', event);
  
  event.notification.close();

  // Si es acción de cerrar, no hacer nada más
  if (event.action === 'dismiss') {
    console.log('❌ Notificación cerrada por el usuario');
    return;
  }

  // Determinar URL a abrir
  let urlToOpen = '/';
  const notificationData = event.notification.data || {};
  
  if (event.action === 'view_order' && notificationData.orderId) {
    urlToOpen = `/?order=${notificationData.orderId}`;
  } else if (notificationData.url) {
    urlToOpen = notificationData.url;
  }

  // Abrir/enfocar ventana
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        console.log('🔍 TRATO SW: Buscando ventanas abiertas:', clientList.length);
        
        // Buscar ventana existente de TRATO
        for (let client of clientList) {
          if (client.url.includes('localhost:5173') || client.url.includes('trato')) {
            console.log('🎯 TRATO SW: Enfocando ventana existente');
            client.focus();
            
            // Navegar a la URL específica si es posible
            if ('navigate' in client) {
              client.navigate(urlToOpen);
            } else {
              // Enviar mensaje a la aplicación para que navegue
              client.postMessage({
                type: 'NOTIFICATION_CLICK',
                url: urlToOpen,
                data: notificationData
              });
            }
            return;
          }
        }
        
        // No hay ventana abierta, abrir nueva
        if (clients.openWindow) {
          console.log('🆕 TRATO SW: Abriendo nueva ventana');
          return clients.openWindow(urlToOpen);
        }
      })
      .catch((error) => {
        console.error('❌ TRATO SW: Error manejando click:', error);
      })
  );
});

// Función para reproducir sonido de notificación
function playNotificationSound(type = 'default') {
  // Enviar mensaje a todos los clientes para reproducir sonido
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'PLAY_NOTIFICATION_SOUND',
        soundType: type
      });
    });
  });
}

// Manejar mensajes de la aplicación
self.addEventListener('message', (event) => {
  console.log('💬 TRATO SW: Mensaje recibido:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'REQUEST_PERMISSION') {
    // Solicitar permisos de notificación
    requestNotificationPermission();
  }
});

// Función para solicitar permisos
async function requestNotificationPermission() {
  try {
    if ('Notification' in self && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      console.log('🔔 TRATO SW: Permiso de notificación:', permission);
      
      // Enviar resultado a la aplicación
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({
          type: 'NOTIFICATION_PERMISSION_RESULT',
          permission: permission
        });
      });
    }
  } catch (error) {
    console.error('❌ TRATO SW: Error solicitando permisos:', error);
  }
}

// Network-only para APIs, cache solo para recursos estáticos críticos
self.addEventListener('fetch', (event) => {
  // Solo interceptar GET requests
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // APIs y Supabase siempre van a la red
  if (url.pathname.includes('/api/') || url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Si falla, devolver respuesta offline solo para navegación
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html') || new Response('Sin conexión');
        }
        throw new Error('Sin conexión a la API');
      })
    );
    return;
  }
  
  // Para el resto, estrategia Network First
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si es exitoso y es un recurso cacheable, guardarlo
        if (response.ok && (url.pathname === '/' || url.pathname.includes('.json'))) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback al cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Si es navegación y no hay cache, mostrar offline
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html') || new Response(`
              <!DOCTYPE html>
              <html><head><title>TRATO - Sin Conexión</title></head>
              <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>🚫 Sin Conexión</h1>
                <p>No tienes conexión a internet. Por favor verifica tu conexión e intenta de nuevo.</p>
                <button onclick="window.location.reload()">🔄 Reintentar</button>
              </body></html>
            `, { headers: { 'Content-Type': 'text/html' } });
          }
          throw new Error('Recurso no disponible offline');
        });
      })
  );
});

console.log('🎉 TRATO Service Worker v1.4.1 cargado completamente');
self.addEventListener('fetch', () => {});