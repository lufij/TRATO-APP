# 🚨 SOLUCIÓN INMEDIATA: Error "Could not find table 'public.users'"

## El Error

```json
{
  "code": "PGRST205",
  "details": null,
  "hint": null,
  "message": "Could not find the table 'public.users' in the schema cache"
}
```

## ⚡ Solución Rápida (5 minutos)

### Paso 1: Ejecutar Script de Reparación

1. **Abrir Supabase Dashboard**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto: `olidxbacfxrijmmtpcoy`

2. **Ir al SQL Editor**
   - En el menú lateral, haz clic en **"SQL Editor"**
   - Haz clic en **"New Query"**

3. **Ejecutar Script de Reparación**
   - Copia **TODO** el contenido del archivo `/database/fix_setup.sql`
   - Pégalo en el editor SQL
   - Haz clic en **"RUN"** (botón verde)
   - **Espera** a que termine (puede tomar 1-2 minutos)

4. **Ejecutar Script de Chat y Notificaciones**
   - En una nueva query, copia el contenido de `/database/fix_chat_notifications_schema.sql`
   - Haz clic en **"RUN"** para crear el sistema de chat
   - **Espera** a que termine (1 minuto)

### Paso 2: Configurar Autenticación

1. **Desactivar Verificación de Email**
   - Ve a **"Authentication"** → **"Settings"**
   - Busca **"Enable email confirmations"**
   - **DESACTIVA** esta opción (toggle OFF)
   - Haz clic en **"Save"**

### Paso 3: Verificar la Configuración

1. **Ejecutar Diagnóstico**
   - En SQL Editor, ejecuta el contenido de `/database/diagnose_setup.sql`
   - Debes ver ✅ en todos los elementos
   - Si ves ❌, repite el Paso 1

### Paso 4: Probar la Aplicación

1. **Reiniciar la aplicación**
   ```bash
   npm run dev
   ```

2. **Probar registro**
   - Ve a la página de registro
   - Intenta crear una cuenta nueva
   - **NO** deberías ver más errores de tabla

## 🔍 ¿Qué Hace el Script de Reparación?

El script `fix_setup.sql` realiza una configuración completa:

- ✅ **Crea 8 tablas**: users, sellers, drivers, products, cart_items, orders, order_items, reviews
- ✅ **Crea sistema de chat**: conversations, messages, conversation_participants, notifications
- ✅ **Configura seguridad**: Políticas RLS para proteger datos
- ✅ **Crea storage**: 3 buckets para imágenes (products, avatars, business-logos)
- ✅ **Configura triggers**: Para mantener timestamps actualizados
- ✅ **Habilita realtime**: Para chat en tiempo real
- ✅ **Verifica instalación**: Consultas de diagnóstico incluidas

## ❌ Si Sigues Teniendo Problemas

### Error: "syntax error" en SQL
- **Causa**: No copiaste el script completo
- **Solución**: Asegúrate de copiar desde la primera línea hasta la última

### Error: "permission denied"
- **Causa**: Estás usando el proyecto incorrecto
- **Solución**: Verifica que estés en el proyecto correcto en Supabase

### Error: "relation already exists"
- **Causa**: Las tablas ya existían parcialmente
- **Solución**: Normal, el script maneja esto automáticamente

### Error: "Invalid login credentials" en la app
- **Causa**: La configuración de auth no está completa
- **Solución**: 
  1. Verifica que desactivaste la verificación de email
  2. Reinicia la aplicación

## 📊 Verificación Manual

Para confirmar que todo está funcionando, ejecuta estas consultas en SQL Editor:

```sql
-- Ver todas las tablas creadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Ver buckets de storage
SELECT name FROM storage.buckets;

-- Verificar que RLS esté habilitado
SELECT relname, relrowsecurity FROM pg_class 
WHERE relnamespace = 'public'::regnamespace;
```

Deberías ver:
- **12+ tablas**: users, sellers, drivers, products, cart_items, orders, order_items, reviews, conversations, messages, conversation_participants, notifications
- **3 buckets**: products, avatars, business-logos
- **RLS habilitado**: relrowsecurity = true en todas las tablas

## 🎯 Después de la Reparación

Una vez completada la reparación:

1. ✅ **Sin errores de tabla**: Los usuarios podrán registrarse
2. ✅ **Login automático**: Sin verificación de email
3. ✅ **Dashboards funcionales**: Cada rol verá su interfaz correspondiente
4. ✅ **Carrito persistente**: Los compradores podrán agregar productos
5. ✅ **Chat funcional**: Mensajería en tiempo real entre usuarios
6. ✅ **Notificaciones**: Sistema de alertas completo
7. ✅ **Status de usuarios**: Online/offline en tiempo real

## 🔧 Scripts de Utilidad

- **`/database/fix_setup.sql`**: Reparación completa (ejecutar una vez)
- **`/database/diagnose_setup.sql`**: Verificar estado actual
- **`/database/complete_setup.sql`**: Setup alternativo (más conservador)

## ⏰ Tiempo Estimado

- **Ejecutar script**: 1-2 minutos
- **Configurar auth**: 30 segundos  
- **Verificar funcionamiento**: 1 minuto
- **Total**: ~5 minutos

## 📞 Si Nada Funciona

Como último recurso, puedes:

1. **Crear un nuevo proyecto Supabase**
2. **Actualizar las credenciales** en `/utils/supabase/config.ts`
3. **Ejecutar el script de reparación** en el nuevo proyecto

¡Pero en el 99% de los casos, el script de reparación resolverá el problema inmediatamente!

---

**🚀 Una vez completado, tu aplicación estará 100% funcional**