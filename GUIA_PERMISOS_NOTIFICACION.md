# 🔔 GUÍA DE PERMISOS DE NOTIFICACIÓN - VENDEDORES

## ⚠️ **IMPORTANTE: PERMISOS REQUERIDOS**

Para que los vendedores reciban notificaciones de nuevos pedidos, **DEBEN conceder permisos específicos** al navegador.

## 🎯 **¿QUÉ PERMISOS NECESITA LA APP?**

### 1. **🔔 Notificaciones del Navegador**
- **Qué hace**: Muestra alertas emergentes del sistema
- **Por qué**: Para notificar pedidos aunque la app esté en segundo plano
- **Estado requerido**: `"granted"` (Concedido)

### 2. **🔊 Reproducción de Audio**
- **Qué hace**: Reproduce sonidos de alerta
- **Por qué**: Para llamar la atención inmediatamente
- **Activación**: Automática tras interacción del usuario

### 3. **📳 Vibración (Solo Móviles)**
- **Qué hace**: Vibra el dispositivo
- **Por qué**: Alerta táctil en móviles
- **Disponibilidad**: Depende del dispositivo

## 🔄 **ESTADOS DE PERMISOS**

### ✅ **"granted" (Concedido)**
```
✅ Notificaciones: ACTIVAS
✅ Sonidos: ACTIVOS  
✅ Vibración: ACTIVA (móviles)
✅ Estado: FUNCIONANDO COMPLETAMENTE
```

### ⚠️ **"default" (Pendiente)**
```
⚠️ Notificaciones: PENDIENTES
✅ Sonidos: ACTIVOS
✅ Vibración: ACTIVA (móviles)
⚠️ Estado: FUNCIONAL PERO INCOMPLETO
```

### ❌ **"denied" (Bloqueado)**
```
❌ Notificaciones: BLOQUEADAS
✅ Sonidos: ACTIVOS
✅ Vibración: ACTIVA (móviles)
❌ Estado: LIMITADO - NO RECOMENDADO
```

## 📱 **CÓMO ACTIVAR PERMISOS**

### **MÉTODO 1: Botón en la App** (Recomendado)
1. Al abrir el dashboard de vendedor
2. Aparece banner: **"Configuración de Notificaciones"**
3. Clic en **"Activar Notificaciones"**
4. El navegador pregunta: **"¿Permitir notificaciones?"**
5. Clic en **"Permitir"** o **"Allow"**

### **MÉTODO 2: Configuración Manual del Navegador**

#### **Google Chrome:**
1. Clic en **candado** en la barra de direcciones
2. Buscar **"Notificaciones"**
3. Seleccionar **"Permitir"**
4. **Recargar la página** (F5)

#### **Firefox:**
1. Clic en **escudo/candado** en la barra de direcciones
2. Clic en **"Permisos"**
3. Cambiar notificaciones a **"Permitir"**
4. **Recargar la página** (F5)

#### **Safari:**
1. Menú **Safari** → **Preferencias**
2. Pestaña **"Sitios web"**
3. **"Notificaciones"** → Buscar el sitio → **"Permitir"**
4. **Recargar la página** (F5)

#### **Edge:**
1. Clic en **candado** en la barra de direcciones
2. **"Permisos para este sitio"**
3. Notificaciones → **"Permitir"**
4. **Recargar la página** (F5)

### **MÓVILES:**

#### **Android Chrome:**
1. Clic en **menú** (⋮) → **"Información del sitio"**
2. **"Permisos"** → **"Notificaciones"** → **"Permitir"**
3. **Recargar la página**

#### **iOS Safari:**
1. **Configuración** → **Safari** → **"Notificaciones"**
2. Buscar el sitio → **"Permitir"**
3. **Recargar la página**

## 🧪 **VERIFICAR QUE FUNCIONA**

### **Test Automático en la App:**
1. En el dashboard de vendedor
2. Busca el banner de **"Configuración de Notificaciones"**
3. Clic en **"Probar Sonido"**
4. **Deberías escuchar**: 3 tonos ascendentes
5. **En móviles**: También vibración

### **Test Manual en Consola:**
1. Presiona **F12** (DevTools)
2. Ve a **"Console"**
3. Pega y ejecuta:
```javascript
// Cargar script de diagnóstico
const script = document.createElement('script');
script.src = './diagnostic-notifications.js';
document.head.appendChild(script);
```

### **Signos de que Funciona:**
- ✅ **Banner verde**: "Notificaciones activas"
- ✅ **Sonido al probar**: Tonos claros y audibles
- ✅ **Sin errores en consola**
- ✅ **Vibración en móviles** (si es compatible)

## 🚨 **SOLUCIÓN DE PROBLEMAS**

### **"No escucho sonido"**
1. **Volumen del dispositivo** subido
2. **Interactúa con la página** primero (clic en cualquier lugar)
3. **Prueba manual**: Clic en "Probar Sonido"
4. **Verifica consola**: ¿Hay errores de Web Audio API?

### **"No veo notificaciones del navegador"**
1. **Verifica permisos**: Candado URL → Notificaciones → Permitir
2. **Modo No Molestar**: Desactivar en sistema operativo
3. **Navegador en primer plano**: Algunas notificaciones solo aparecen en segundo plano
4. **Recargar página** tras cambiar permisos

### **"Banner siempre visible"**
- **Permisos no concedidos correctamente**
- **Recargar página** tras activar permisos
- **Limpiar caché del navegador**

### **"Nada funciona"**
1. **Navegador compatible**: Chrome, Firefox, Safari, Edge modernos
2. **HTTPS requerido**: Las notificaciones no funcionan en HTTP
3. **Javascript habilitado**
4. **Probar en ventana incógnito** (para descartar extensiones)

## 📊 **REPORTE DE ESTADO**

La app muestra en tiempo real:

```
🔔 Notificaciones del navegador: ✅ Activas / ⚠️ Pendientes / ❌ Bloqueadas
🔊 Sonidos de alerta: ✅ Disponibles / ❌ No disponibles  
📳 Vibración (móvil): ✅ Disponible / ❌ No disponible
```

## 🎯 **MEJORES PRÁCTICAS**

### **Para Vendedores:**
1. **Activar permisos INMEDIATAMENTE** al registrarse
2. **Probar sonido** para verificar que funciona
3. **Mantener volumen audible** durante horarios de trabajo
4. **No cerrar el navegador** - mantener pestaña abierta
5. **Verificar permisos** si cambia de dispositivo

### **Para Administradores:**
1. **Capacitar vendedores** sobre importancia de permisos
2. **Verificar configuración** en cada dispositivo nuevo
3. **Documentar problemas** comunes del equipo
4. **Tener plan B**: Notificaciones por WhatsApp/SMS si fallan

## 🔔 **RESUMEN EJECUTIVO**

**✅ CON PERMISOS COMPLETOS:**
Los vendedores reciben **notificación instantánea y obvia** de cada nuevo pedido:
- Sonido distintivo que llama la atención
- Notificación del sistema operativo
- Vibración en móviles
- Alerta visual en pantalla

**❌ SIN PERMISOS:**
Solo alertas visuales en pantalla - **ALTO RIESGO** de perderse pedidos.

**🎯 OBJETIVO:** 
**100% de vendedores con permisos "granted"** para garantizar que ningún pedido se pierda.
