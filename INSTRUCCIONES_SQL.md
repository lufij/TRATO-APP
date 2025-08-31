# 📋 INSTRUCCIONES: ¿Necesitas ejecutar SQL en Supabase?

## 🎯 **RESPUESTA RÁPIDA:**

### ✅ **CON EL FIX IMPLEMENTADO (Recomendado):**
**NO necesitas ejecutar SQL adicional**. El fix que implementamos en el frontend maneja todo automáticamente.

### ⚠️ **SOLO SI HAY PROBLEMAS, ejecutar SQL mínimo:**

---

## 🔧 **OPCIÓN 1: Todo funciona (No hacer nada)**

Si después de probar el fix:
- ✅ El stock se descuenta cuando el vendedor acepta
- ✅ Los logs aparecen en consola
- ✅ No hay errores

**→ NO necesitas ejecutar ningún SQL**

---

## 🆘 **OPCIÓN 2: Si hay problemas (SQL mínimo)**

Si encuentras errores como:
- ❌ "Column doesn't exist"
- ❌ "Permission denied"
- ❌ "daily_product_id is null"

**→ Ejecutar SOLO este archivo SQL:**

### 📁 **Archivo**: `VERIFICACION_STOCK_MINIMA.sql`

**Dónde ejecutarlo:**
1. Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. Ir a tu proyecto → **SQL Editor**
3. Pegar el contenido de `VERIFICACION_STOCK_MINIMA.sql`
4. Clic en **Run**

**Qué hace:**
- ✅ Verifica que las columnas necesarias existan
- ✅ Agrega columnas faltantes si es necesario
- ✅ Crea productos de prueba si no hay ninguno
- ✅ Configura permisos básicos

---

## ❌ **NO EJECUTAR estos archivos (Obsoletos):**

- ~~`FIX_STOCK_AUTOMATICO_DEFINITIVO.sql`~~ → Triggers obsoletos
- ~~`setup-stock-trigger.sql`~~ → No necesario con frontend fix
- ~~`FIX_TRIGGER_STOCK_ACCEPTED.sql`~~ → Puede causar duplicación

**¿Por qué no?**
Porque ahora el **frontend maneja el stock directamente**, haciendo los triggers de base de datos innecesarios y potencialmente problemáticos.

---

## 🧪 **CÓMO PROBAR QUE FUNCIONA:**

### **1. Abrir la aplicación:**
- URL: http://localhost:5176
- Abrir DevTools (F12) → Console

### **2. Como comprador:**
- Hacer pedido con productos del día
- Anotar stock inicial

### **3. Como vendedor:**
- Aceptar el pedido
- **Buscar en consola**: `🔄 Orden aceptada, actualizando stock...`

### **4. Verificar:**
- El stock debería disminuir inmediatamente
- Mensaje: `✅ Stock actualizado exitosamente`

---

## 📞 **RESUMEN:**

1. **PRIMERO**: Probar sin ejecutar SQL
2. **SI NO FUNCIONA**: Ejecutar solo `VERIFICACION_STOCK_MINIMA.sql`
3. **NUNCA**: Ejecutar múltiples archivos SQL de triggers

**El fix del frontend es más confiable que los triggers de base de datos.**
