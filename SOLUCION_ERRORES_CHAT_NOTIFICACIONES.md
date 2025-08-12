# SOLUCIÓN: Errores de Chat, Notificaciones y Status de Usuarios

## ❌ Errores Detectados

### Error 1: Conversaciones
```json
{
  "code": "PGRST200",
  "details": "Searched for a foreign key relationship between 'conversations' and 'users' using the hint 'conversations_participant1_id_fkey' in the schema 'public', but no matches were found.",
  "message": "Could not find a relationship between 'conversations' and 'users' in the schema cache"
}
```

### Error 2: Notificaciones
```json
{
  "code": "42703",
  "details": null,
  "hint": null,
  "message": "column notifications.user_id does not exist"
}
```

### Error 3: Status de Usuarios
```json
{
  "code": "42703",
  "details": null,
  "hint": null,
  "message": "column users.status does not exist"
}
```

## 🔍 Análisis del Problema

### **Causa Principal:**
- **Sistema de chat incompleto**: Faltan tablas `conversations`, `messages`, `conversation_participants`
- **Tabla de notificaciones incompleta**: Falta columna `user_id` y estructura básica
- **Status de usuarios**: Falta columna `status` para indicar online/offline/away

### **Impacto:**
- ❌ **Chat no funciona**: No se pueden crear conversaciones
- ❌ **Notificaciones fallan**: No se pueden asignar a usuarios específicos
- ❌ **Status offline**: No se puede mostrar quién está online
- ❌ **Realtime roto**: Sin tablas, no hay sincronización en tiempo real

## ✅ Solución Completa

### **Script de Reparación:**
- **Archivo**: `/database/fix_chat_notifications_schema.sql`
- **Tiempo**: ~2 minutos de ejecución
- **Resultado**: Sistema completo de chat y notificaciones

## 📋 Instrucciones de Reparación

### **Paso 1: Ejecutar Script de Reparación**

1. **Supabase Dashboard** → **SQL Editor**
2. **Nueva Query** → Copia el contenido completo de:
   ```
   /database/fix_chat_notifications_schema.sql
   ```
3. **RUN** → Espera a que termine
4. ✅ **Verificar** que no hay errores en la consola

### **Paso 2: Verificar Reparación**

Ejecuta esta consulta para verificar:
```sql
-- Verificar tablas de chat
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('conversations', 'messages', 'conversation_participants', 'notifications');

-- Verificar columnas críticas
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'notifications' 
AND column_name = 'user_id';

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users' 
AND column_name = 'status';
```

**Resultado esperado:**
```
conversations
messages  
conversation_participants
notifications
user_id
status
```

### **Paso 3: Habilitar Realtime (Opcional)**

Si quieres chat en tiempo real:
1. **Supabase Dashboard** → **Database** → **Replication**
2. **Enable** las siguientes tablas:
   - `conversations`
   - `messages` 
   - `notifications`
   - `users`

## 🎯 Funcionalidades Creadas

### **🗣️ Sistema de Chat Completo**

#### **Tabla `conversations`**
```sql
- id (UUID)
- participant1_id (UUID → users.id)
- participant2_id (UUID → users.id) 
- type ('private', 'group', 'support')
- title (VARCHAR)
- last_message_at (TIMESTAMPTZ)
- created_at, updated_at
```

#### **Tabla `messages`**
```sql
- id (UUID)
- conversation_id (UUID → conversations.id)
- sender_id (UUID → users.id)
- content (TEXT)
- message_type ('text', 'image', 'file', 'location', 'system')
- read_by_recipient (BOOLEAN)
- read_at (TIMESTAMPTZ)
- metadata (JSONB)
- created_at, updated_at
```

#### **Tabla `conversation_participants`**
```sql
- id (UUID)
- conversation_id (UUID → conversations.id)
- user_id (UUID → users.id)
- role ('admin', 'member', 'moderator')
- joined_at (TIMESTAMPTZ)
- last_read_at (TIMESTAMPTZ)
```

### **🔔 Sistema de Notificaciones**

#### **Tabla `notifications` (Reparada)**
```sql
- id (UUID)
- user_id (UUID → users.id) ✅ AGREGADO
- type (VARCHAR) - 'general', 'order', 'chat', 'system'
- title (VARCHAR) ✅ AGREGADO
- message (TEXT) ✅ AGREGADO
- is_read (BOOLEAN) ✅ AGREGADO
- data (JSONB) ✅ AGREGADO
- created_at, updated_at ✅ AGREGADO
```

### **👤 Status de Usuarios**

#### **Tabla `users` (Ampliada)**
```sql
- status (VARCHAR) ✅ AGREGADO
  - 'online' - Usuario activo
  - 'offline' - Usuario desconectado  
  - 'away' - Usuario ausente
```

## 🔧 Funciones Auxiliares Creadas

### **Función: `get_or_create_conversation()`**
```sql
-- Crear o obtener conversación entre dos usuarios
SELECT get_or_create_conversation('user1-uuid', 'user2-uuid');
```

### **Función: `mark_messages_as_read()`**
```sql
-- Marcar mensajes como leídos
SELECT mark_messages_as_read('conversation-uuid', 'user-uuid');
```

## 📊 Vistas Creadas

### **Vista: `conversation_details_view`**
- Conversaciones con información de participantes
- Contador de mensajes no leídos
- Último mensaje de cada conversación
- Status online/offline de participantes

### **Vista: `unread_notifications_view`**
- Notificaciones no leídas por usuario
- Información completa del destinatario
- Ordenadas por fecha de creación

## 🛡️ Seguridad RLS

### **Políticas Creadas:**

#### **Conversaciones:**
- ✅ Usuarios solo ven sus propias conversaciones
- ✅ Solo participantes pueden crear/actualizar conversaciones
- ✅ Admin ve todas las conversaciones

#### **Mensajes:**
- ✅ Solo participantes de la conversación ven mensajes
- ✅ Solo el remitente puede actualizar sus mensajes
- ✅ Validación de permisos antes de envío

#### **Notificaciones:**
- ✅ Usuarios solo ven sus propias notificaciones
- ✅ Solo el propietario puede marcar como leída
- ✅ Sistema puede crear notificaciones

## ⚡ Realtime Habilitado

### **Tablas en Tiempo Real:**
- `conversations` → Nuevas conversaciones instantáneas
- `messages` → Mensajes en tiempo real
- `notifications` → Notificaciones instantáneas  
- `users` → Status online/offline en vivo

## 🚀 Triggers Automáticos

### **`update_conversation_last_message`**
- Actualiza automáticamente `last_message_at` cuando se envía un mensaje

### **`update_updated_at_column`**
- Mantiene `updated_at` actualizado en conversaciones y mensajes

## 📈 Resultado Esperado

### **Después de la reparación:**
```
==========================================
CHAT, NOTIFICACIONES Y STATUS - REPARACIÓN COMPLETA
==========================================
Tablas base: 2 de 2 (users, notifications)
Tablas de chat: 3 de 3 (conversations, messages, conversation_participants)  
Columnas notifications: 4+ de 4 (user_id, type, title, is_read)
Columna users.status: 1 de 1
Foreign keys de chat: 2+ (conversations con users)
Políticas RLS: 10+ (security activada)
==========================================
SUCCESS: Esquema de chat y notificaciones reparado completamente
✅ Sistema de chat con conversaciones y mensajes
✅ Notificaciones con user_id y campos completos
✅ Status de usuarios online/offline
✅ Foreign keys y relaciones correctas
✅ Políticas RLS de seguridad
✅ Realtime para chat en tiempo real
✅ Funciones auxiliares para chat
✅ Vistas para consultas optimizadas
✅ Triggers automáticos
==========================================
ERRORES RESUELTOS:
1. ✅ conversations_participant1_id_fkey - Foreign key creada
2. ✅ notifications.user_id does not exist - Columna agregada
3. ✅ users.status does not exist - Columna agregada
==========================================
```

## 🧪 Probar la Reparación

### **Test 1: Crear Conversación**
```sql
-- Simular creación de conversación
SELECT get_or_create_conversation(
    (SELECT id FROM users LIMIT 1),
    (SELECT id FROM users OFFSET 1 LIMIT 1)
);
```

### **Test 2: Enviar Mensaje**
```sql
-- Simular envío de mensaje
INSERT INTO messages (conversation_id, sender_id, content)
VALUES (
    (SELECT id FROM conversations LIMIT 1),
    (SELECT id FROM users LIMIT 1),
    'Mensaje de prueba del sistema de chat'
);
```

### **Test 3: Crear Notificación**
```sql
-- Simular notificación
INSERT INTO notifications (user_id, type, title, message)
VALUES (
    (SELECT id FROM users LIMIT 1),
    'system',
    'Sistema de chat activado',
    'El sistema de mensajería ya está funcionando correctamente'
);
```

### **Test 4: Actualizar Status**
```sql
-- Simular usuario online
UPDATE users SET status = 'online' 
WHERE id = (SELECT id FROM users LIMIT 1);
```

## ⚙️ Integración con la App

### **En React (ChatContext.tsx):**
```typescript
// Ya debería funcionar sin cambios
const { data: conversations } = await supabase
  .from('conversations')
  .select(`
    *,
    participant1:users!conversations_participant1_id_fkey(*),
    participant2:users!conversations_participant2_id_fkey(*)
  `);
```

### **Notificaciones (BuyerNotifications.tsx):**
```typescript
// Ya debería funcionar sin cambios  
const { data: notifications } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', user.id)
  .eq('is_read', false);
```

## 🎉 Conclusión

Después de ejecutar el script `/database/fix_chat_notifications_schema.sql`:

1. ✅ **Chat completamente funcional** con conversaciones privadas
2. ✅ **Notificaciones asignadas a usuarios** con estructura completa
3. ✅ **Status en tiempo real** para mostrar usuarios online
4. ✅ **Seguridad robusta** con políticas RLS
5. ✅ **Tiempo real habilitado** para experiencia fluida
6. ✅ **Funciones auxiliares** para operaciones comunes
7. ✅ **Sin más errores** de foreign keys o columnas faltantes

**El sistema de chat y notificaciones de TRATO está listo para usar** 💬✨