# 📱 CONFIGURACIÓN SUPABASE PARA NOTIFICACIONES MÓVILES

## 🔧 Pasos de Configuración Críticos

### 1. REALTIME CONFIGURATION (Dashboard)
**Ve a:** `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api`

**En la sección "Realtime":**
```
Tables to broadcast:
☑️ orders
☑️ users  
☑️ products
☑️ daily_products

Events to broadcast:
☑️ INSERT
☑️ UPDATE
☑️ DELETE
```

### 2. AUTHENTICATION SETTINGS
**Ve a:** `Authentication > Settings`

**Site URL:** 
```
https://tu-app.vercel.app
```

**Additional URLs:**
```
https://tu-app.vercel.app/*
https://localhost:3000
https://127.0.0.1:3000
```

### 3. DATABASE POLICIES (Ya creadas en SQL)
✅ RLS habilitado en `orders` y `users`
✅ Políticas de acceso para vendedores
✅ REPLICA IDENTITY FULL configurado

### 4. EDGE FUNCTIONS (Opcional pero recomendado)
**Crear función para push notifications:**

```sql
-- En Dashboard > Edge Functions > New Function
-- Nombre: mobile-notifications

create or replace function public.send_mobile_notification(
  user_id uuid,
  title text,
  body text,
  data jsonb default '{}'
)
returns void
language plpgsql
security definer
as $$
begin
  -- Lógica para enviar notificación push
  perform net.http_post(
    url := 'https://your-push-service.com/send',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := json_build_object(
      'to', user_id,
      'title', title,
      'body', body,
      'data', data
    )::text
  );
end;
$$;
```

## 🚨 CONFIGURACIÓN CRÍTICA PARA MÓVILES

### PWA MANIFEST (Ya configurado)
✅ Service Worker registrado
✅ Manifest.json con configuración PWA
✅ Icons para diferentes tamaños

### AUDIO PERMISSIONS
```javascript
// Ya implementado en CriticalNotificationSystem
await navigator.mediaDevices.getUserMedia({ audio: true });
```

### WAKE LOCK
```javascript
// Ya implementado para mantener pantalla activa
await navigator.wakeLock.request('screen');
```

## 🔍 VERIFICACIÓN

### Test de Realtime:
1. Abre la app en móvil
2. Crea una orden desde otro dispositivo
3. Verifica que llegue notificación con sonido

### Test de Audio:
1. Activa banner naranja en dashboard
2. Verifica sonido con pantalla bloqueada
3. Confirma vibración en dispositivos compatibles

## ⚠️ IMPORTANTE PARA MÓVILES

**Chrome/Safari Mobile requiere:**
- Interacción del usuario antes del primer sonido
- HTTPS (ya tienes con Vercel)
- Service Worker registrado (ya configurado)
- Permisos de notificación explícitos

**El banner naranja es CRÍTICO:** Permite la primera interacción para habilitar audio.

## 🎯 PRÓXIMOS PASOS

1. **Ejecutar:** `CONFIGURACION_COMPLETA_SUPABASE_MOVILES.sql`
2. **Configurar Dashboard** según los pasos de arriba
3. **Probar** en dispositivo móvil real
4. **Ajustar** frecuencias de audio si es necesario

¿Necesitas que ejecute alguno de estos archivos SQL o tienes acceso al dashboard de Supabase?
