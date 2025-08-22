# 🚚 INSTRUCCIONES PARA ACTIVAR SISTEMA DE REPARTIDORES

## ⚠️ PASOS REQUERIDOS

### 1. Ejecutar Scripts de Base de Datos

**Ejecuta estos scripts en Supabase SQL Editor en este orden:**

```sql
-- 1. Primero: Sistema de verificación de ubicaciones
-- Ejecuta: database/location_system_fixed.sql
```

```sql
-- 2. Segundo: Sistema de entregas para repartidores  
-- Ejecuta: database/setup_driver_deliveries.sql
```

```sql
-- 3. Tercero (OPCIONAL): Crear orden de prueba
-- Ejecuta: database/crear_orden_prueba_delivery.sql
```

### 2. Verificar Repartidores

**En el dashboard de administrador:**
- Ve a la sección "Gestión de Repartidores"
- Asegúrate de que hay repartidores registrados
- Aprueba los repartidores (marcar como verificados y activos)

### 3. Probar el Sistema

**Para ver entregas reales:**
1. Un vendedor debe crear productos
2. Un comprador debe hacer un pedido con delivery
3. El vendedor debe aceptar y marcar como "listo"
4. La entrega aparecerá en el dashboard de repartidores

## 🔧 FUNCIONALIDADES IMPLEMENTADAS

### Dashboard de Repartidores
- ✅ **Solo entregas reales** (no datos demo)
- ✅ **Botón "Aceptar entrega" funcional**
- ✅ **Actualización de estado de entregas**
- ✅ **Vista de entregas asignadas**
- ✅ **Botón "Ver ruta" para navegación**

### Sistema de Estados de Entrega
- `ready` → `assigned` (cuando repartidor acepta)
- `assigned` → `picked-up` (repartidor recoge)
- `picked-up` → `in-transit` (en camino)
- `in-transit` → `delivered` (entregado)

### Restricciones y Validaciones
- Solo repartidores verificados y activos pueden tomar entregas
- Solo el repartidor asignado puede cambiar estados
- Sistema de notificaciones automáticas
- Validación de permisos por rol

## 🎯 MENSAJE CUANDO NO HAY ENTREGAS

El dashboard mostrará:
```
No hay entregas disponibles
Las nuevas entregas aparecerán aquí cuando estén listas.
```

## 🚀 CÓMO PROBAR

### Opción 1: Crear orden real
1. Crear producto como vendedor
2. Hacer pedido como comprador
3. Aceptar y marcar listo como vendedor

### Opción 2: Usar script de prueba
```sql
-- Ejecuta database/crear_orden_prueba_delivery.sql
-- Esto creará una orden lista para entrega
```

## 📱 FUNCIONES DE LA BASE DE DATOS

### `get_available_deliveries()`
- Retorna solo órdenes con estado 'ready'
- Tipo 'delivery'
- Sin repartidor asignado

### `assign_driver_to_order(order_id, driver_id)`
- Asigna repartidor a orden
- Cambia estado a 'assigned'
- Crea notificaciones

### `update_order_status(order_id, status, user_id)`
- Actualiza estado de orden
- Valida permisos del usuario
- Crea notificaciones automáticas

## ✅ VERIFICACIONES

Después de ejecutar los scripts, verifica:

1. **Funciones creadas:**
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name LIKE '%delivery%' 
   OR routine_name LIKE '%driver%';
   ```

2. **Órdenes disponibles:**
   ```sql
   SELECT COUNT(*) as entregas_disponibles
   FROM orders 
   WHERE status = 'ready' 
   AND delivery_type = 'delivery' 
   AND driver_id IS NULL;
   ```

3. **Repartidores activos:**
   ```sql
   SELECT COUNT(*) as repartidores_activos
   FROM users 
   WHERE role = 'repartidor' 
   AND is_active = true 
   AND is_verified = true;
   ```

## 🔄 PRÓXIMOS PASOS

1. Ejecutar scripts de base de datos
2. Verificar que no hay errores en consola
3. Probar flujo completo de entrega
4. Validar notificaciones y estados

## 🐛 SOLUCIÓN DE PROBLEMAS

**Si no aparecen entregas:**
- Verificar que hay órdenes con estado 'ready' y tipo 'delivery'
- Verificar que el repartidor está verificado y activo
- Revisar console.log() en navegador para errores

**Si el botón "Aceptar" no funciona:**
- Verificar que las funciones RPC existen en Supabase
- Revisar permisos de las funciones (GRANT EXECUTE TO authenticated)
- Verificar console.log() para errores específicos
