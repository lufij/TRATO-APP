# 🔊 GUÍA PASO A PASO: ACTIVAR NOTIFICACIONES CON SONIDO EN MÓVIL

## 🎯 OBJETIVO: 
**Que tu celular suene cuando llegue una nueva orden, incluso con pantalla apagada**

---

## 📋 PASO 1: PREPARAR LA BASE DE DATOS

### **Ejecutar en Supabase**
1. Ve a: https://supabase.com/dashboard/project/deaddzyloiqdckublfed/sql
2. Copia y pega TODO el contenido de: `CONFIGURAR_NOTIFICACIONES_PUSH_SUPABASE.sql`
3. Haz clic en **RUN** 
4. Verifica que aparezca: ✅ Success. No rows returned

---

## 📱 PASO 2: CONFIGURAR TU MÓVIL (MUY IMPORTANTE)

### **En Android:**
1. **Configuración → Apps → Chrome/Samsung Internet**
2. **Permisos → Activar "Mostrar sobre otras apps"**
3. **Permisos → Activar "Modificar configuración del sistema"**
4. **Notificaciones → Permitir todas las notificaciones**
5. **Sonido → Activar "Sonidos de notificación"**

### **En iPhone:**
1. **Configuración → Safari → Sitios web → Notificaciones**
2. **Buscar tu sitio y cambiar a "Permitir"**
3. **Configuración → Sonidos y vibración → Activar todo**
4. **Agregar sitio a pantalla de inicio** (Botón compartir → "Agregar a inicio")

---

## 🚀 PASO 3: ACTIVAR EN LA APP

### **Como Vendedor:**
1. **Abre la app TRATO en tu móvil**
2. **Inicia sesión como vendedor**  
3. **Aparecerá un banner NARANJA** que dice "Activar Notificaciones"
4. **Haz clic en "Activar Notificaciones"**
5. **Tu navegador preguntará permisos → ACEPTA TODO**
6. **Verifica que diga "✅ Notificaciones activas"**

---

## 🧪 PASO 4: PROBAR QUE FUNCIONA

### **Test 1 - Prueba Interna:**
1. En tu móvil, abre **Herramientas de desarrollador** (Chrome → Menú → Herramientas → Inspector)
2. Ve a la pestaña **Console**
3. Escribe: `window.testTratoNotifications()`
4. Presiona ENTER
5. **DEBE SONAR** triple beep y vibrar

### **Test 2 - Prueba Real:**
1. **Deja tu móvil con pantalla apagada**
2. **Desde otro dispositivo** (computadora/otro móvil):
   - Abre la app TRATO
   - Inicia sesión como comprador  
   - Haz un pedido a tu tienda
3. **Tu móvil DEBE:**
   - 🔊 Sonar (triple beep fuerte)
   - 📳 Vibrar
   - 📱 Mostrar notificación en pantalla

---

## ⚡ SOLUCIÓN A PROBLEMAS COMUNES

### **🚫 "No suena con pantalla apagada"**
**Solución:**
- Instalar como PWA: Chrome → Menú → "Agregar a pantalla de inicio"
- Configurar como app confiable: Configuración → Apps → TRATO → "Ejecutar en segundo plano"

### **🔇 "No hay sonido"**
**Solución:**
- Verificar volumen del móvil (NO en silencioso)
- Configuración → Sonidos → "Tonos de notificación" activado
- Verificar que el navegador tenga permisos de audio

### **📵 "Solo llega cuando abro la app"**
**Solución:**
- El navegador debe seguir ejecutándose en segundo plano
- Android: Configuración → Batería → TRATO/Chrome → "No optimizar batería"
- iPhone: Configuración → Safari → "Actualización en segundo plano" activada

### **🔔 "No aparece el banner naranja"**
**Solución:**
- Refrescar la página (F5)
- Borrar caché del navegador
- Iniciar sesión de nuevo

---

## 🎉 CONFIGURACIÓN FINAL EXITOSA

**Si todo funciona correctamente, verás:**

✅ Banner naranja desaparece (se activó)  
✅ Test de sonido funciona: `window.testTratoNotifications()`  
✅ Notificación aparece con pantalla apagada  
✅ Sonido audible (triple beep ascendente)  
✅ Vibración (patrón largo-corto-largo)  

---

## 🆘 SI NADA FUNCIONA

### **Verificar en consola del navegador:**
```javascript
// 1. Verificar permisos
navigator.permissions.query({name: 'notifications'})

// 2. Verificar Service Worker  
navigator.serviceWorker.ready

// 3. Crear notificación manual
new Notification('Test', {body: 'Funcionando!', requireInteraction: true})
```

### **Contacto de emergencia:**
- Mensaje detallado con capturas de pantalla
- Incluir modelo de móvil y navegador usado
- Mencionar en qué paso exacto falla

---

## 🚀 CONFIGURACIÓN COMPLETADA

**Una vez configurado correctamente:**
- ✅ Cada nueva orden sonará INMEDIATAMENTE  
- ✅ Funciona con pantalla apagada
- ✅ Sonido distintivo (no se confunde con WhatsApp/SMS)
- ✅ Vibración especial para llamar tu atención
- ✅ Notificación persiste hasta que la toques

**¡Tu negocio ya no perderá pedidos por no escuchar notificaciones!** 🎯
