# 🔧 INSTRUCCIONES PARA PROBAR EL FIX DEL STOCK

## Problema Identificado
Las calcomanías para carros no aparecen actualizadas en la vista del comprador a pesar de que:
- ✅ El stock fue actualizado correctamente desde el panel del vendedor
- ✅ La base de datos muestra el stock correcto
- ✅ El panel del vendedor muestra el stock actualizado
- ❌ La vista del comprador no refleja estos cambios

## Solución Implementada

### 1. **Cache Busting Agresivo**
- Limpieza completa de localStorage y sessionStorage
- Timestamps únicos para evitar cache
- Forzado de re-render del estado de React

### 2. **Refresh Mejorado**
- Función `refreshProductStock()` mejorada con limpieza de cache
- Auto-refresh cuando la página se vuelve visible
- Logs detallados para debugging

### 3. **UI Mejorada**
- Botón de "Actualizar Stock" más efectivo
- Mensajes de éxito/error más claros
- Timestamp de última actualización visible

## Cómo Probar

### Paso 1: Ejecutar SQL de Verificación
```sql
-- Ejecuta esto en Supabase para confirmar el estado actual:
SELECT 
    id,
    name as "Producto",
    stock_quantity as "Stock Real",
    is_public as "¿Público?",
    updated_at as "Última Actualización"
FROM public.products 
WHERE name ILIKE '%calcoman%'
ORDER BY name;
```

### Paso 2: Probar en la App
1. Ve a la vista del comprador
2. Busca "calcomanías para carros"
3. Si NO aparece, haz clic en el botón **"🔄 Actualizar Stock"**
4. Revisa los logs de la consola para ver el proceso

### Paso 3: Verificar Logs
Abre las herramientas de desarrollador y busca estos mensajes:
- `🧹 Cache limpio, timestamp: ...`
- `✅ Datos refrescados: X productos`
- `📋 Productos encontrados: ...`

## Casos de Prueba

### ✅ Caso 1: Stock Visible
Si después del refresh aparecen las calcomanías → **PROBLEMA RESUELTO**

### ❌ Caso 2: Sigue Sin Aparecer
Si aún no aparecen, verificar:
1. ¿El producto tiene `is_public = true`?
2. ¿El `stock_quantity > 0`?
3. ¿Hay errores en la consola?

### 🔍 Caso 3: Aparece y Desaparece
Si aparece brevemente y luego desaparece → problema de race condition en useEffect

## Próximos Pasos

Si el problema persiste, necesitamos:
1. Los resultados del SQL de verificación
2. Los logs de la consola durante el refresh
3. Screenshots de lo que se ve vs lo que debería verse

## Archivos Modificados
- `hooks/useBuyerData.ts` - Cache busting y refresh mejorado
- `components/buyer/BuyerHome.tsx` - Auto-refresh y UI mejorada
- `utils/cacheBuster.ts` - Utilidades para limpiar cache
