# 🗺️ Configuración Opcional de Google Maps API

## ℹ️ Información Importante

**La verificación GPS funciona SIN configurar Google Maps.** Esta configuración es **OPCIONAL** y solo mejora la precisión de las direcciones.

## 🎯 ¿Qué Mejora Google Maps API?

**Sin Google Maps (funciona por defecto):**
- ✅ Detección GPS precisa
- ✅ Coordenadas exactas
- ✅ Validación de ubicación en Gualán
- ✅ Información para repartidores
- 📍 Dirección básica: "Gualán, Zacapa, Guatemala (15.123456, -89.456789)"

**Con Google Maps configurado:**
- ✅ Todo lo anterior +
- 🏠 Direcciones más detalladas: "3 Avenida 2-45, Zona 1, Gualán, Zacapa"
- 🏢 Nombres de lugares específicos
- 🛣️ Códigos postales
- 📮 Referencias de calles y colonias

## 🚀 Configuración Rápida (5 minutos)

### Paso 1: Obtener API Key de Google

1. **Ve a [Google Cloud Console](https://console.cloud.google.com/)**

2. **Crea un proyecto nuevo (si no tienes uno):**
   - Clic en "Seleccionar proyecto" → "Nuevo proyecto"
   - Nombre: "TRATO Gualán"
   - Clic en "Crear"

3. **Habilita las APIs necesarias:**
   - Ve a "APIs y servicios" → "Biblioteca"
   - Busca y habilita:
     - ✅ **Geocoding API**
     - ✅ **Maps JavaScript API**
     - ✅ **Places API**

4. **Crear credenciales:**
   - Ve a "APIs y servicios" → "Credenciales"
   - Clic en "Crear credenciales" → "Clave de API"
   - Copia la API Key generada

### Paso 2: Configurar Restricciones (Importante para Seguridad)

1. **En la página de credenciales:**
   - Clic en tu API Key
   - En "Restricciones de la aplicación":
     - Selecciona "Referentes HTTP (sitios web)"
     - Agrega tus dominios:
       ```
       http://localhost:*
       https://localhost:*
       https://tu-dominio.com/*
       https://*.vercel.app/*
       ```

2. **En "Restricciones de API":**
   - Selecciona "Restringir clave"
   - Marca solo:
     - ✅ Geocoding API
     - ✅ Maps JavaScript API
     - ✅ Places API

### Paso 3: Configurar en tu Aplicación

1. **Crea un archivo `.env.local` en la raíz del proyecto:**
   ```env
   VITE_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
   ```

2. **Recarga tu aplicación**
   - La app detectará automáticamente la configuración
   - Verás el mensaje "Google Maps: ✓ Configurado" en el perfil

## 💰 Costos (Tranquilo, es muy barato)

Google Maps API tiene una **capa gratuita generosa**:

- ✅ **Primeras 40,000 solicitudes/mes GRATIS**
- ✅ Para Gualán, esto equivale a **años de uso gratuito**
- ✅ Después: $0.005 USD por solicitud adicional

**Para referencia:** Un negocio activo usaría ~100 solicitudes/mes = **TOTALMENTE GRATIS**

## 🔧 Verificar que Funciona

1. **Ve al Dashboard del vendedor → Perfil**
2. **Busca el mensaje:** "Google Maps: ✓ Configurado"
3. **Prueba verificar ubicación GPS**
4. **Deberías ver direcciones más detalladas**

## ❌ Solución de Problemas

### "Google Maps: ○ Opcional"
- ✅ **Normal:** La app funciona perfectamente sin configurar
- ⚙️ **Para mejorar:** Sigue los pasos de configuración

### Error: "API key not valid"
- 🔑 Verifica que copiaste la API key correctamente
- 🌐 Asegúrate de habilitar las APIs necesarias
- 🔒 Revisa las restricciones de dominio

### Error: "Quota exceeded"
- 💳 Verifica que tienes billing habilitado en Google Cloud
- 📊 Revisa el uso en Google Cloud Console

## 🎯 ¿Necesito Configurar Esto?

**NO es necesario si:**
- ✅ Tu negocio está en una ubicación conocida de Gualán
- ✅ Los repartidores conocen bien el área
- ✅ Las coordenadas GPS básicas son suficientes

**SÍ es recomendable si:**
- 🏠 Tu negocio está en una zona nueva o específica
- 📍 Quieres direcciones súper detalladas
- 🎯 Buscas la experiencia más profesional posible

---

**🚀 Recuerda: La verificación GPS funciona perfectamente sin esta configuración. Google Maps solo mejora los detalles de la dirección.**

**🛟 ¿Necesitas ayuda?** La app incluye todas las instrucciones y funciona sin configuración adicional.