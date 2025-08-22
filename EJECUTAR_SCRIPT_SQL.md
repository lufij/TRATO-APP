# INSTRUCCIONES PARA EJECUTAR SCRIPT SQL

## ⚠️ IMPORTANTE: EJECUTAR EN ORDEN

### 1. Ir a Supabase SQL Editor
- Abre https://supabase.com/dashboard
- Selecciona tu proyecto TRATO
- Ve a "SQL Editor"

### 2. Ejecutar Script Corregido
**Copia y pega TODO el contenido del archivo:**
`database/setup_driver_deliveries_clean.sql`

**NO ejecutes el archivo original** `setup_driver_deliveries.sql` (tiene errores)

### 3. Verificar Ejecución
Deberías ver al final:
```
Sistema de entregas para repartidores configurado exitosamente
```

### 4. Verificar Funciones Creadas
Ejecuta esta consulta para verificar:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'get_available_deliveries',
  'assign_driver_to_order', 
  'update_order_status'
);
```

### 5. Si hay errores
- Copia el error completo
- Informa al desarrollador
- NO intentes ejecutar el script varias veces

### 6. Crear orden de prueba (opcional)
Después del script principal, puedes crear una orden de prueba con:
`database/crear_orden_prueba_delivery.sql`

## Estado actual: NECESARIO EJECUTAR ANTES DE CONTINUAR ⚠️
