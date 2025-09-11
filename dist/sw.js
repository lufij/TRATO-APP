// TRATO Service Worker - Push Notifications REALES v2.0
const CACHE_NAME = 'trato-app-v2.0';

// 🔊 CONFIGURACIÓN DE SONIDOS CRÍTICOS
const CRITICAL_SOUND_CONFIG = {
  new_order: {
    frequencies: [900, 1100, 1300, 1500],
    durations: [600, 600, 600, 800],
    delays: [0, 500, 1000, 1500],
    vibrate: [400, 150, 400, 150, 400, 150, 600],
    repeat: 2,
    repeatDelay: 3000
  },
  order_assigned: {
    frequencies: [1000, 1200, 1000],
    durations: [500, 500, 700],
    delays: [0, 400, 800],
    vibrate: [300, 120, 300, 120, 500],
    repeat: 2,
    repeatDelay: 3000
  }
};

// Instalar Service Worker con cache mínimo
self.addEventListener('install', (event) => {
  console.log('🚀 TRATO SW v2.0: Instalando Service Worker para Push REALES');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ TRATO SW: Cache inicializado');
        return cache.addAll([
          '/',
          '/manifest.json',
          '/offline.html',
          '/icon-192.png',
          '/icon-96.png'
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

// ===== PUSH NOTIFICATIONS REALES (FUNCIONAN CON APP CERRADA) =====

// 📨 MANEJAR PUSH MESSAGES DEL SERVIDOR
self.addEventListener('push', (event) => {
  console.log('📨 TRATO SW: Push recibido (APP PUEDE ESTAR CERRADA):', event);
  
  let notificationData = {
    title: 'TRATO - Nueva Orden 🛒',
    body: 'Tienes un nuevo pedido que requiere tu atención inmediata',
    type: 'new_order',
    orderId: null,
    urgent: true
  };

  // Procesar datos del push si existen
  if (event.data) {
    try {
      const pushPayload = event.data.json();
      console.log('📦 TRATO SW: Datos del push:', pushPayload);
      
      notificationData = { ...notificationData, ...pushPayload };
      
    } catch (error) {
      console.error('❌ TRATO SW: Error parseando push data:', error);
    }
  }

  // Configurar notificación según el tipo
  const notificationOptions = buildNotificationOptions(notificationData);

  // 🚨 MOSTRAR NOTIFICACIÓN (CRÍTICO: Funciona con app cerrada)
  event.waitUntil(
    Promise.all([
      // Mostrar notificación
      self.registration.showNotification(notificationOptions.title, notificationOptions),
      
      // Intentar reproducir sonido si es posible (limitado en SW)
      handlePushSound(notificationData.type),
      
      // Enviar mensaje a la app SI está abierta para sonido potente
      notifyOpenClientsWithSound(notificationData),
      
      // Registrar para estadísticas
      logNotificationReceived(notificationData)
    ])
  );
});

// 🔧 CONSTRUIR OPCIONES DE NOTIFICACIÓN
function buildNotificationOptions(data) {
  const baseOptions = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    tag: `trato-${data.type}-${data.orderId || Date.now()}`,
    requireInteraction: true, // CRÍTICO: No se cierra automáticamente
    silent: false, // IMPORTANTE: Usar sonido del sistema
    vibrate: CRITICAL_SOUND_CONFIG[data.type]?.vibrate || [200, 100, 200],
    data: {
      type: data.type,
      orderId: data.orderId,
      url: data.orderId ? `/?order=${data.orderId}` : '/',
      timestamp: Date.now(),
      urgent: data.urgent
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
    dir: 'ltr',
    lang: 'es'
  };

  // Personalizar según tipo
  if (data.type === 'new_order') {
    baseOptions.title = `🆕 Nuevo Pedido ${data.orderId ? `#${data.orderId}` : ''}`;
    baseOptions.body = `Pedido por $${data.total || '0.00'} - Responde rápidamente`;
    baseOptions.image = '/notification-new-order.png';
  } else if (data.type === 'order_assigned') {
    baseOptions.title = '🚚 Pedido Asignado';
    baseOptions.body = `Te asignaron la entrega del pedido #${data.orderId}`;
    baseOptions.icon = '/icon-delivery.png';
  }

  return baseOptions;
}

// 🔊 INTENTAR REPRODUCIR SONIDO EN SERVICE WORKER (limitado)
async function handlePushSound(notificationType) {
  try {
    // En Service Worker el audio es muy limitado
    // El sonido principal se maneja en la app cuando está abierta
    console.log(`🔊 TRATO SW: Sonido solicitado para ${notificationType}`);
    
    // TODO: Investigar Audio Worklets para sonido en SW
    
  } catch (error) {
    console.error('❌ TRATO SW: Error con sonido:', error);
  }
}

// 📢 NOTIFICAR CLIENTES ABIERTOS CON SONIDO POTENTE
async function notifyOpenClientsWithSound(data) {
  try {
    const clients = await self.clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    });
    
    console.log(`🔊 TRATO SW: Notificando ${clients.length} clientes con sonido potente`);
    
    clients.forEach(client => {
      client.postMessage({
        type: 'PLAY_POWERFUL_NOTIFICATION',
        payload: data,
        soundType: data.type || 'new_order',
        timestamp: Date.now(),
        repeat: true // Activar repetición de sonido
      });
    });
    
  } catch (error) {
    console.error('❌ TRATO SW: Error notificando clientes con sonido:', error);
  }
}

// 📊 REGISTRAR NOTIFICACIÓN RECIBIDA
async function logNotificationReceived(data) {
  try {
    console.log('📊 TRATO SW: Registrando notificación:', {
      type: data.type,
      timestamp: new Date().toISOString(),
      orderId: data.orderId
    });
    
    // En el futuro podríamos guardar estadísticas en IndexedDB
    
  } catch (error) {
    console.error('❌ TRATO SW: Error registrando notificación:', error);
  }
}

// 📢 NOTIFICAR CLIENTES ABIERTOS (función original mantenida para compatibilidad)
async function notifyOpenClients(data) {
  try {
    const clients = await self.clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    });
    
    console.log(`📢 TRATO SW: Notificando ${clients.length} clientes abiertos`);
    
    clients.forEach(client => {
      client.postMessage({
        type: 'PUSH_RECEIVED',
        payload: data,
        timestamp: Date.now()
      });
    });
    
  } catch (error) {
    console.error('❌ TRATO SW: Error notificando clientes:', error);
  }
}

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