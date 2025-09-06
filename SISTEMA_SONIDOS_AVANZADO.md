# 🔊 SISTEMA AVANZADO DE NOTIFICACIONES SONORAS

## 📋 Descripción General

El sistema avanzado de notificaciones sonoras está diseñado para garantizar que los usuarios de la comunidad nunca pierdan notificaciones importantes, incluso con la pantalla apagada o en dispositivos móviles.

## ✨ Características Principales

### 🎵 Sonidos Optimizados
- **Frecuencias Audibles**: Tonos entre 440Hz y 1200Hz optimizados para máxima audibilidad
- **Patrones Inteligentes**: Single, doble, triple y continuo según la importancia
- **Repeticiones Automáticas**: Notificaciones importantes se repiten automáticamente
- **Volumen Dinámico**: Control de volumen independiente por tipo de notificación

### 📱 Compatibilidad Móvil
- **Vibración Inteligente**: Patrones de vibración específicos por tipo de notificación
- **Funcionamiento en Segundo Plano**: Service Worker para notificaciones con pantalla apagada
- **Push Notifications**: Notificaciones del navegador que aparecen en la pantalla de bloqueo
- **Activación Automática**: Se activa automáticamente con cualquier interacción del usuario

### 🎯 Notificaciones por Rol

#### 👨‍💼 **VENDEDORES**
1. **🛒 Nueva Orden** (Prioridad ALTA)
   - Sonido: 880Hz, patrón triple, 3 repeticiones cada 2 segundos
   - Vibración: [400, 200, 400, 200, 400]
   - Push: Requiere interacción del usuario
   - Mensaje: "Cliente: [Nombre] - Q[Total]"

2. **🚚 Repartidor Asignado** (Prioridad NORMAL)
   - Sonido: 660Hz, patrón doble, 2 repeticiones cada 1.5 segundos  
   - Vibración: [300, 150, 300]
   - Push: Se cierra automáticamente en 10s
   - Mensaje: "Pedido #[ID] en camino"

3. **✅ Entrega Completada** (Prioridad BAJA)
   - Sonido: 440Hz, patrón único, 1 repetición
   - Vibración: [500]
   - Push: Se cierra automáticamente en 10s
   - Mensaje: "Pedido #[ID] completado"

#### 🚚 **REPARTIDORES**
1. **📦 Entrega Disponible** (Prioridad ALTA)
   - Sonido: 1000Hz, patrón triple, 3 repeticiones cada 1.5 segundos
   - Vibración: [250, 100, 250, 100, 250]
   - Push: Requiere interacción del usuario
   - Mensaje: "Entrega para: [Cliente] - [Dirección]"

2. **🎯 Entrega Asignada** (Prioridad NORMAL)
   - Sonido: 660Hz, patrón doble, 2 repeticiones cada 1.5 segundos
   - Vibración: [300, 150, 300]
   - Push: Se cierra automáticamente en 10s
   - Mensaje: "Tienes una nueva entrega asignada"

#### 🛍️ **COMPRADORES**
1. **🚚 Repartidor Asignado** (Prioridad NORMAL)
   - Sonido: 660Hz, patrón doble, 2 repeticiones
   - Vibración: [300, 150, 300]
   - Push: Se cierra automáticamente en 10s
   - Mensaje: "Un repartidor está en camino"

2. **✅ Pedido Entregado** (Prioridad NORMAL)
   - Sonido: 440Hz, patrón único, 1 repetición
   - Vibración: [500]
   - Push: Se cierra automáticamente en 10s
   - Mensaje: "Tu pedido ha sido entregado exitosamente"

3. **🆕 Nuevo Producto** (Prioridad BAJA)
   - Sonido: 784Hz, patrón único, 1 repetición
   - Vibración: [200]
   - Push: Se cierra automáticamente en 5s
   - Mensaje: "Nuevo producto disponible"

## 🔧 Instalación y Configuración

### 1. Activación Automática
El sistema se activa automáticamente cuando el usuario visita la aplicación. Para activación manual:

```javascript
// Ejecutar en la consola del navegador
window.activateAdvancedNotifications();
```

### 2. Funciones Disponibles

#### Sonidos Básicos
```javascript
// Reproducir sonido específico
window.playAdvancedNotificationSound({
  frequency: 880,      // Frecuencia en Hz
  duration: 400,       // Duración en ms
  pattern: 'triple',   // 'single', 'double', 'triple', 'critical'
  volume: 0.8,         // 0.0 a 1.0
  repeatCount: 3,      // Número de repeticiones
  repeatInterval: 2000 // Intervalo entre repeticiones (ms)
});
```

#### Notificaciones Completas
```javascript
// Nueva orden (vendedores)
window.notifyNewOrder({
  id: "order123",
  customer_name: "Juan Pérez",
  total: 25.50,
  delivery_type: "delivery"
});

// Repartidor asignado
window.notifyDriverAssigned({
  id: "order123",
  customer_name: "Juan Pérez"
});

// Entrega disponible (repartidores)
window.notifyDeliveryAvailable({
  id: "order123",
  customer_name: "Juan Pérez",
  delivery_address: "Zone 10, Guatemala",
  total: 25.50
});

// Pedido entregado
window.notifyOrderDelivered({
  id: "order123"
});

// Alerta crítica
window.notifyCritical("Sistema sobrecargado", {
  priority: "critical"
});
```

#### Pruebas del Sistema
```javascript
// Prueba completa del sistema
window.testAdvancedNotifications();

// Activar/desactivar sonidos en segundo plano
window.enableBackgroundNotifications();
window.disableBackgroundNotifications();
```

## 🎛️ Panel de Control

### Acceso al Panel
1. Ir a cualquier dashboard de la aplicación
2. Clic en el ícono de campana (🔔) en la esquina superior derecha
3. Clic en el botón "🔊 Sonidos"

### Funciones del Panel
- **Estado del Sistema**: Verificar compatibilidad de audio, vibración y push notifications
- **Configuración General**: Activar/desactivar sonidos, ajustar volumen, habilitar vibración
- **Pruebas Individuales**: Probar cada tipo de sonido por separado
- **Notificaciones Completas**: Probar el sistema completo con sonido + vibración + push
- **Información Técnica**: Diagnosticos de compatibilidad y configuración actual

## 🔧 Resolución de Problemas

### No se escuchan los sonidos

#### En Computadora:
1. **Verificar permisos**:
   - Clic en el candado (🔒) en la barra de URL
   - Cambiar "Notificaciones" a "Permitir"
   - Recargar la página

2. **Verificar audio del sistema**:
   - Aumentar volumen del sistema
   - Verificar que no esté silenciado
   - Probar con otros sonidos del navegador

3. **AudioContext suspendido**:
   - Hacer clic en cualquier parte de la página
   - El AudioContext se activa automáticamente

#### En Móvil:
1. **Permisos de notificación**:
   - Ir a Configuración > Sitios web > Notificaciones
   - Permitir notificaciones para el sitio
   - Activar sonidos de notificación

2. **Vibración no funciona**:
   - Verificar que no esté en modo silencioso
   - Activar vibración en configuraciones de accesibilidad

3. **Pantalla apagada**:
   - Asegurarse de que las notificaciones push estén permitidas
   - Verificar que la app no esté en lista de sitios bloqueados

### Los sonidos se cortan o no se repiten

1. **Limpiar caché del navegador**
2. **Recargar la página completamente** (Ctrl+F5)
3. **Verificar que no hay otros tabs con audio activo**
4. **En móvil**: Cerrar otras aplicaciones que usen audio

### Notificaciones no aparecen en segundo plano

1. **Verificar Service Worker**:
   ```javascript
   // Ejecutar en consola
   navigator.serviceWorker.getRegistrations().then(registrations => {
     console.log('Service Workers:', registrations.length);
   });
   ```

2. **Re-registrar Service Worker**:
   ```javascript
   window.activateAdvancedNotifications();
   ```

3. **Verificar permisos del navegador**:
   - Chrome: Configuración > Privacidad y seguridad > Configuración de sitio > Notificaciones
   - Firefox: about:preferences#privacy > Permisos > Notificaciones

## 📊 Monitoreo y Logs

### Logs de Consola
El sistema genera logs detallados para facilitar el diagnóstico:

```
🚀 Iniciando sistema avanzado de notificaciones...
✅ PERMISOS CONCEDIDOS - Notificaciones habilitadas
🔊 AudioContext creado: running
✅ Service Worker registrado
✅ SISTEMA AVANZADO DE NOTIFICACIONES ACTIVADO
```

### Verificación del Estado
```javascript
// Verificar estado actual
console.log('Audio Context:', window.AudioContext ? 'Soportado' : 'No soportado');
console.log('Notificaciones:', Notification.permission);
console.log('Vibración:', 'vibrate' in navigator ? 'Soportado' : 'No soportado');
```

## 🎯 Mejores Prácticas

### Para Usuarios
1. **Permitir notificaciones** al visitar la aplicación por primera vez
2. **Mantener volumen alto** para escuchar notificaciones importantes
3. **Activar vibración** en dispositivos móviles para mejor experiencia
4. **Probar sonidos regularmente** usando el panel de configuración

### Para Desarrolladores
1. **Siempre verificar compatibilidad** antes de usar funciones de audio
2. **Manejar errores graciosamente** cuando AudioContext no está disponible
3. **Usar repeticiones** solo para notificaciones críticas
4. **Respetar configuración del usuario** (volumen, vibración habilitada)

### Para la Comunidad
1. **Educar usuarios** sobre permisos de notificación
2. **Promover uso responsable** de notificaciones críticas
3. **Reportar problemas** específicos del dispositivo/navegador usado
4. **Mantener actualizados** los navegadores para mejor compatibilidad

## 📱 Compatibilidad

### Navegadores Soportados
- ✅ **Chrome** 66+ (Completo)
- ✅ **Firefox** 60+ (Completo)
- ✅ **Safari** 14+ (Sin vibración)
- ✅ **Edge** 79+ (Completo)
- ⚠️ **Internet Explorer** (No soportado)

### Dispositivos
- ✅ **Android** 5.0+ (Completo)
- ✅ **iOS** 14+ (Sin vibración personalizada)
- ✅ **Windows** 10+ (Completo)
- ✅ **macOS** (Completo)
- ✅ **Linux** (Completo)

### Limitaciones Conocidas
- **iOS Safari**: Vibración limitada a patrones predefinidos
- **Modo Incógnito**: Service Workers pueden estar deshabilitados
- **Navegadores antiguos**: Fallback a alertas del sistema

## 🔄 Actualizaciones Futuras

### Versión 1.1 (Planeada)
- [ ] Sonidos personalizados por usuario
- [ ] Integración con notificaciones push del servidor
- [ ] Configuración de horarios de silencio
- [ ] Sonidos especiales para eventos de temporada

### Versión 1.2 (Planeada)  
- [ ] Soporte para Web Push API
- [ ] Notificaciones geográficas para repartidores
- [ ] Analíticas de efectividad de notificaciones
- [ ] Configuración de prioridades por usuario

---

## 📞 Soporte

Para problemas técnicos o sugerencias:

1. **Revisar logs en consola** del navegador (F12)
2. **Probar en navegador diferente** para descartar problemas de compatibilidad
3. **Verificar permisos** de notificaciones y audio
4. **Reportar dispositivo/navegador específico** si el problema persiste

**Recuerda**: Este sistema está diseñado para mantener a la comunidad conectada y informada. ¡El sonido de una notificación puede significar una nueva oportunidad de negocio! 🚀
