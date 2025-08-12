# 🛠️ ACTUALIZACIÓN REQUERIDA - Dashboard del Vendedor

## ⚠️ ACCIÓN NECESARIA
**SÍ, necesitas actualizar tu base de datos en Supabase** para que el nuevo Dashboard del vendedor funcione correctamente.

## 🎯 ¿Qué se agregó?
El Dashboard del vendedor ahora incluye un **sistema completo de perfil de negocio** con:

- ✅ **Perfil completo del negocio** (categoría, descripción, horarios)
- ✅ **Ubicación GPS con Google Maps** (coordenadas, dirección)
- ✅ **Configuración de delivery** (tiempo, radio, pedido mínimo)
- ✅ **Redes sociales integradas** (Facebook, Instagram, WhatsApp, web)
- ✅ **Subida de logo del negocio** (imagen pública)
- ✅ **Estado de verificación** y activación
- ✅ **Vista previa del cliente** para ver cómo aparecerá el negocio

## 🚀 INSTRUCCIONES DE ACTUALIZACIÓN

### 1. Ve a tu Supabase Dashboard
```
https://supabase.com/dashboard/project/[tu-proyecto-id]
```

### 2. Abre el SQL Editor
- Ve a **SQL Editor** en el menú lateral
- Haz clic en **+ New query**

### 3. Ejecuta el script completo
- Copia **TODO** el contenido del archivo `/database/fix_setup.sql`
- Pégalo en el editor SQL
- Haz clic en **▶ Run**

### 4. Verifica la ejecución
Deberías ver mensajes como:
```
✅ CONFIGURACIÓN COMPLETADA EXITOSAMENTE
Tablas creadas: 6
Políticas RLS: [número]
Storage buckets: 3
Columnas nuevas sellers: 9/9
```

### 5. Desactiva confirmación por email
- Ve a **Authentication** → **Settings**
- Desactiva **"Enable email confirmations"**

### 6. Recarga tu aplicación
- Vuelve a tu aplicación TRATO
- Haz un refresh completo (Ctrl+F5 o Cmd+Shift+R)

## 🔍 ¿Qué campos se agregaron?

### Tabla `sellers` - NUEVOS CAMPOS:
```sql
business_category    TEXT              -- Categoría del negocio
phone               TEXT              -- Teléfono del negocio  
email               TEXT              -- Email del negocio
address             TEXT              -- Dirección completa
latitude            DECIMAL(10,8)     -- Coordenadas GPS
longitude           DECIMAL(11,8)     -- Coordenadas GPS
business_hours      TEXT              -- Horarios de atención
delivery_time       INTEGER           -- Tiempo de preparación (min)
delivery_radius     INTEGER           -- Radio de entrega (km)
minimum_order       DECIMAL(10,2)     -- Pedido mínimo (Q)
social_media        JSONB             -- Redes sociales (JSON)
is_active           BOOLEAN           -- Estado activo/inactivo
```

## ✅ Verificación de éxito

Después de ejecutar el script, deberías ver en tu Dashboard del vendedor:

1. **Sección "Perfil"** funcionando sin errores
2. **Formulario de perfil de negocio** completo
3. **Botón de detección de ubicación GPS** funcional
4. **Campo de subida de logo** operativo
5. **Vista previa del cliente** mostrando correctamente

## 🚨 Si algo sale mal

### Error: "column does not exist"
- El script se ejecutó parcialmente
- Vuelve a ejecutar el script completo `/database/fix_setup.sql`

### Error: "table does not exist"
- Es tu primera instalación
- Ejecuta el script completo y sigue las instrucciones normales

### Error: "storage bucket not found"
- Los buckets de Storage no se crearon
- Ve a **Storage** → **Create bucket** y crea:
  - `products` (público)
  - `avatars` (público)  
  - `business-logos` (público)

## 📱 Funcionalidades nuevas disponibles

Una vez actualizada la base de datos, los vendedores podrán:

### En la sección "Perfil":
- ✅ Completar información completa del negocio
- ✅ Subir logo/imagen del negocio (visible para clientes)
- ✅ Configurar ubicación GPS con detección automática
- ✅ Ver su ubicación en Google Maps
- ✅ Configurar horarios y tiempos de delivery
- ✅ Agregar redes sociales (FB, IG, WhatsApp, web)
- ✅ Activar/desactivar su negocio
- ✅ Ver una vista previa de cómo aparecerán ante los clientes

### Los compradores verán:
- ✅ Directorio de negocios con información completa
- ✅ Logos de los negocios
- ✅ Ubicación en mapa para entregas
- ✅ Tiempos de entrega estimados
- ✅ Información de contacto y redes sociales

## 🎉 ¡Listo!

Después de seguir estos pasos, tu aplicación TRATO tendrá un sistema completo de marketplace local con perfiles profesionales de negocio.

---

**¿Necesitas ayuda?** Revisa los archivos de documentación o ejecuta el diagnóstico automático en la aplicación.