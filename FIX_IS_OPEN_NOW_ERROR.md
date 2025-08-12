# 🚨 Error: Columna 'is_open_now' No Encontrada

## ⚠️ Problema Detectado
```
Error updating business status: {
  "code": "PGRST204",
  "message": "Could not find the 'is_open_now' column of 'sellers' in the schema cache"
}
```

## 🎯 Causa
Falta la columna `is_open_now` en la tabla `sellers` de tu base de datos. Esta columna es necesaria para la funcionalidad de **abrir/cerrar negocio manualmente**.

## ⚡ SOLUCIÓN RÁPIDA (2 minutos)

### Opción A: Solo agregar la columna faltante
1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Ejecuta el script `/database/fix_is_open_now.sql`
3. Recarga tu aplicación

### Opción B: Actualización completa
1. Ve a **Supabase Dashboard** → **SQL Editor** 
2. Ejecuta el script completo `/database/fix_setup.sql`
3. Recarga tu aplicación

## 🔍 Verificación
Después de ejecutar cualquier script, deberías ver:
```
✅ COLUMNA is_open_now CONFIGURADA CORRECTAMENTE
🎉 El botón ABRIR/CERRAR NEGOCIO ya funciona!
```

## 🎛️ Funcionalidades que se habilitarán:

### ✅ **Botón ABRIR/CERRAR Negocio**
- Toggle prominente en la parte superior del perfil
- Cambio de estado en tiempo real
- Colores visuales (verde = abierto, rojo = cerrado)

### ✅ **Override de Horarios**
- El estado manual tiene prioridad sobre horarios programados
- Los clientes ven el estado real del negocio

### ✅ **Visibilidad para Clientes**
- Badge de estado en vista previa
- Información clara de disponibilidad

## 🚨 Si el Error Persiste

### 1. Verificar que el script se ejecutó
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'sellers' 
AND column_name = 'is_open_now';
```

Debería devolver: `is_open_now`

### 2. Limpiar cache de Supabase
- Ve a **Settings** → **API**
- Haz clic en **Restart API** (si está disponible)
- O espera 1-2 minutos para que se actualice automáticamente

### 3. Verificar permisos RLS
El script automáticamente configura los permisos necesarios.

## 📋 Archivos Relacionados
- `/database/fix_is_open_now.sql` - Fix rápido solo para esta columna
- `/database/fix_setup.sql` - Script completo actualizado
- `/components/SellerBusinessProfile.tsx` - Componente que usa la columna

## 🎉 Resultado Esperado
Una vez solucionado, verás en el Dashboard del vendedor:

1. **Sección superior** con botón grande ABRIR/CERRAR NEGOCIO
2. **Colores dinámicos** que cambian según el estado
3. **Mensajes claros** sobre el impacto para los clientes
4. **Vista previa** mostrando el badge de estado

---

**🚀 ¡En menos de 2 minutos tendrás la funcionalidad completa funcionando!**