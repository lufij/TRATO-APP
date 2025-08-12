# 🛠️ SOLUCIÓN ESPECÍFICA - Error is_default

## 🚨 Error Exacto Reportado:
```
ERROR:  42703: column "is_default" does not exist
CONTEXT:  SQL statement "CREATE INDEX IF NOT EXISTS idx_user_addresses_is_default ON user_addresses(is_default)"
PL/pgSQL function inline_code_block line 48 at SQL statement
```

## 🎯 CAUSA DEL PROBLEMA:
El error ocurre porque el script `fix_setup.sql` intenta crear un **índice** en la columna `is_default` de la tabla `user_addresses`, pero esa columna **no existe** en la tabla existente.

### **Secuencia del problema:**
1. **Tabla `user_addresses` existe** pero está incompleta (creada previamente sin todas las columnas)
2. **Script intenta crear índices** antes de verificar/agregar las columnas faltantes
3. **Índice `idx_user_addresses_is_default`** falla porque la columna `is_default` no existe
4. **Script se detiene** con error de sintaxis

---

## 🚀 SOLUCIÓN RÁPIDA (2 minutos)

### Opción 1: Script Específico para is_default (Recomendado)
1. **Ve a Supabase Dashboard** → **SQL Editor**
2. **Nueva Query**
3. **Copia y pega TODO** el contenido de: **`/database/fix_user_addresses_is_default.sql`**
4. **Ejecuta** (botón RUN)
5. **Debe mostrar**: "🎉 ¡ERROR user_addresses.is_default COMPLETAMENTE CORREGIDO!"

### Opción 2: Script Principal Actualizado  
1. **Nueva Query** en SQL Editor
2. **Copia y pega**: el contenido de `/database/fix_setup.sql` (ya corregido)
3. **Ejecuta**
4. **Debe mostrar**: "🎉 ¡CONFIGURACIÓN COMPLETA EXITOSA (TODAS LAS CORRECCIONES APLICADAS)!"

### Opción 3: Comando Manual Directo
```sql
-- Solo agregar la columna que falta
ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- Luego crear el índice
CREATE INDEX IF NOT EXISTS idx_user_addresses_is_default ON user_addresses(is_default);

-- Test
SELECT is_default FROM user_addresses LIMIT 1;
```

---

## 🔍 ¿Qué se corrigió exactamente?

### ❌ Problema Original:
```sql
-- SECUENCIA QUE CAUSABA ERROR:

-- 1. Crear tabla user_addresses SIN is_default (incompleta)
CREATE TABLE user_addresses (
    id UUID PRIMARY KEY,
    user_id UUID,
    address_line TEXT
    -- ❌ FALTABA: is_default BOOLEAN DEFAULT FALSE
);

-- 2. Luego intentar crear índice en columna inexistente
CREATE INDEX idx_user_addresses_is_default ON user_addresses(is_default);
-- ❌ ERROR: column "is_default" does not exist
```

### ✅ Solución Aplicada:
```sql
-- SECUENCIA CORREGIDA:

-- 1. Verificar si tabla existe y agregar columnas faltantes
IF EXISTS tabla user_addresses THEN
    IF NOT EXISTS columna is_default THEN
        ALTER TABLE user_addresses ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
    END IF;
END IF;

-- 2. Solo crear índice SI la columna existe
IF EXISTS columna is_default THEN
    CREATE INDEX idx_user_addresses_is_default ON user_addresses(is_default);
END IF;
```

### 🔧 Cambios específicos en fix_setup.sql:

1. **✅ Agregada verificación completa** de todas las columnas de `user_addresses`
2. **✅ Creación de índices condicionada** a la existencia de las columnas
3. **✅ Orden correcto**: agregar columnas ANTES de crear índices
4. **✅ Manejo de errores** con bloques `BEGIN/EXCEPTION/END`

---

## 🧪 Cómo verificar que está solucionado:

### Test 1: Verificar que la columna existe
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_addresses' AND column_name = 'is_default';

-- Debe mostrar: is_default | boolean | YES | false
```

### Test 2: Verificar que el índice se creó
```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename = 'user_addresses' AND indexname = 'idx_user_addresses_is_default';

-- Debe mostrar: idx_user_addresses_is_default | user_addresses
```

### Test 3: Probar query que usará el índice
```sql
SELECT * FROM user_addresses WHERE is_default = true LIMIT 1;

-- Debe funcionar sin errores
```

### Test 4: Ejecutar fix_setup.sql completo
```sql
-- Ejecutar todo el script fix_setup.sql actualizado
-- Debe completarse sin errores de "column does not exist"
```

---

## 🚨 Si el error persiste:

### Error 1: "user_addresses table does not exist"
```sql
-- Solución: Crear tabla completa
-- Ejecutar: fix_user_addresses_is_default.sql (crea tabla si no existe)
```

### Error 2: "Cannot add column with NOT NULL constraint"
```sql
-- Solución: Agregar con DEFAULT primero
ALTER TABLE user_addresses ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
-- Luego cambiar constraint si es necesario
```

### Error 3: "Index creation still fails"
```sql
-- Verificar que la columna realmente existe:
\d user_addresses

-- O usar información_schema:
SELECT column_name FROM information_schema.columns WHERE table_name = 'user_addresses';
```

### Error 4: "Sintaxis de función PL/pgSQL"
```sql
-- El script corregido usa sintaxis compatible con Supabase
-- Si falla, ejecutar comandos manuales directamente
```

---

## 💡 ¿Por qué ocurrió este error?

### **Causa raíz**:
1. **Scripts anteriores** crearon tabla `user_addresses` incompleta
2. **Migraciones incrementales** no actualizaron tablas existentes 
3. **Orden de operaciones** incorrecto: índices antes que columnas
4. **Falta de verificación** de existencia de columnas antes de crear índices

### **Lecciones aprendidas**:
1. **Siempre verificar** existencia de columnas antes de crear índices
2. **Usar `IF EXISTS`** para operaciones condicionales
3. **Orden correcto**: CREATE TABLE → ADD COLUMNS → CREATE INDEXES
4. **Scripts idempotentes** que funcionen en cualquier estado de BD

---

## 🎉 Resultado Final:

Una vez aplicado el fix:
- ✅ **Tabla user_addresses completa** con `is_default`, `address_line`, `latitude`, `longitude`, etc.
- ✅ **Índice idx_user_addresses_is_default** funcionando correctamente
- ✅ **Script fix_setup.sql** se ejecuta sin errores de sintaxis
- ✅ **Sistema de ubicaciones** completamente funcional
- ✅ **Todas las queries** que usan `is_default` funcionan
- ✅ **Error "column is_default does not exist"** completamente eliminado

**¡El error `column "is_default" does not exist` debería estar completamente solucionado!** 🚀📍

## 🔗 Archivos Relacionados:
- **`/database/fix_user_addresses_is_default.sql`** - ⭐ Script específico para este error
- **`/database/fix_setup.sql`** - ✅ Script principal actualizado y corregido
- **`/database/verify_setup.sql`** - Script de verificación opcional