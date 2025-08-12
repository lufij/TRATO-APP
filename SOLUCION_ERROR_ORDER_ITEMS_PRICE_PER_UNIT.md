# 🛠️ SOLUCIÓN ESPECÍFICA - Error order_items.price_per_unit

## 🚨 Error Exacto:
```json
{
  "code": "42703",
  "details": null,
  "hint": null,
  "message": "column order_items_1.price_per_unit does not exist"
}
```

## 🎯 CAUSA DEL PROBLEMA:
La tabla `order_items` existe pero **le faltan columnas esenciales**, específicamente:
- ❌ `price_per_unit` (precio por unidad)
- ❌ `total_price` (precio total)
- ❌ Posiblemente otras columnas críticas

Este error indica que la tabla `order_items` se creó incompleta o los scripts de migración no se ejecutaron correctamente.

---

## 🚀 SOLUCIÓN RÁPIDA (3 minutos)

### Paso 1: Corregir Tabla order_items
1. **Ve a Supabase Dashboard** → **SQL Editor**
2. **Nueva Query**
3. **Copia y pega TODO** el contenido de: `/database/fix_order_items_columns.sql`
4. **Ejecuta** (botón RUN)
5. **Espera** a ver: "🎯 CORRECCIÓN ESPECÍFICA order_items COMPLETADA"

### Paso 2: Verificar la Corrección
1. **Nueva Query** en SQL Editor
2. **Copia y pega**: el contenido de `/database/verify_order_items_fix.sql`
3. **Ejecuta**
4. **Debe mostrar**: "🎉 ¡ERROR order_items.price_per_unit COMPLETAMENTE CORREGIDO!"

### Paso 3: Probar la App
1. **Recarga** tu aplicación TRATO
2. **Ve a dashboard de vendedor** → **Órdenes**
3. **El error debería desaparecer**
4. **El sistema de órdenes debería funcionar**

---

## 🔍 ¿Qué agrega el script de corrección?

### ✅ Columnas que se agregan a order_items:
```sql
-- Columnas de precios (las que estaban faltando)
price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0  -- ← Esta es la que causaba el error
total_price DECIMAL(10,2) NOT NULL DEFAULT 0

-- Columnas de cantidad y relaciones
quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0)
order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE
product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE

-- Columnas de timestamps
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### ✅ Configuraciones adicionales:
- **Índices** para optimizar consultas
- **Foreign Keys** hacia `orders` y `products`  
- **Row Level Security** (RLS) para seguridad
- **Triggers** para `updated_at` automático

---

## 🧪 Cómo verificar que está solucionado:

Ejecuta este test rápido en SQL Editor:
```sql
-- Test que antes fallaba, ahora debería funcionar:
SELECT 
    oi.price_per_unit,
    oi.total_price,
    oi.quantity,
    o.status,
    p.name
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
LEFT JOIN products p ON oi.product_id = p.id
LIMIT 5;
```

**Si no da error y muestra columnas**, el problema está solucionado.

---

## 🚨 Si el error persiste:

### Error 1: "table order_items does not exist"
```sql
-- Solución: Crear sistema completo de órdenes
-- Ejecutar: fix_all_schema_errors_final_corrected.sql
```

### Error 2: "relation orders does not exist"
```sql
-- Solución: Crear tabla orders primero
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Error 3: "relation products does not exist"
```sql
-- Solución: Crear tabla products primero
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Error 4: "access denied" o "permission denied"
```sql
-- Solución: Verificar RLS policies o usar service_role key
-- Revisar que el usuario tenga permisos en Supabase
```

---

## 💡 ¿Por qué ocurrió este error?

### Posibles causas:
1. **Script de migración incompleto** - Solo se creó la tabla básica sin todas las columnas
2. **Interrupción del setup** - El proceso se detuvo antes de completar la estructura
3. **Múltiples ejecuciones** - Scripts ejecutados parcialmente en diferentes momentos
4. **Orden incorrecto** - Se intentó crear `order_items` antes que `orders` o `products`

### Prevención futura:
- ✅ **Ejecutar scripts completos** sin interrupciones
- ✅ **Verificar** siempre después de ejecutar migraciones
- ✅ **Usar scripts idempotentes** que pueden ejecutarse múltiples veces sin problema

---

## 🎉 Resultado Final:

Una vez aplicado el fix:
- ✅ **Tabla order_items completa** con todas las columnas
- ✅ **Sistema de órdenes funcionando** en dashboard vendedor  
- ✅ **Queries de precios** funcionando correctamente
- ✅ **Foreign keys** establecidas correctamente
- ✅ **Error desaparecido** permanentemente

**¡El error `column order_items_1.price_per_unit does not exist` debería estar completamente solucionado!** 🚀📦

## 🔗 Archivos Relacionados:
- `/database/fix_order_items_columns.sql` - Script de corrección
- `/database/verify_order_items_fix.sql` - Script de verificación  
- `/database/fix_all_schema_errors_final_corrected.sql` - Corrección completa del sistema