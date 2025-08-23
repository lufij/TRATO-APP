# 🚨 SOLUCIÓN DEFINITIVA: Problemas de Ubicación e Imágenes

## 🔍 PROBLEMA IDENTIFICADO
La aplicación no puede guardar cambios porque **faltan columnas en la tabla `sellers`** de Supabase.

## 📋 PASOS PARA SOLUCIONAR

### 1️⃣ EJECUTAR SCRIPT EN SUPABASE
Ve a tu panel de Supabase → SQL Editor y ejecuta estos scripts EN ORDEN:

```sql
-- PASO 1: Ejecutar FIX_SELLERS_TABLE_COMPLETO.sql
-- Este script crea/agrega todas las columnas necesarias
```

```sql
-- PASO 2: Ejecutar SCRIPT_BUCKETS_IMAGENES_SUPABASE.sql  
-- Este script crea los buckets para imágenes
```

```sql
-- PASO 3: Ejecutar UPDATE_BUCKETS_50MB.sql
-- Este script actualiza la capacidad a 50MB
```

### 2️⃣ VERIFICAR EN SUPABASE DASHBOARD

**Tabla `sellers` debe tener estas columnas:**
- ✅ `business_logo` (TEXT)
- ✅ `cover_image_url` (TEXT)
- ✅ `address` (TEXT)
- ✅ `latitude` (DECIMAL)
- ✅ `longitude` (DECIMAL)
- ✅ `location_verified` (BOOLEAN)
- ✅ `is_open_now` (BOOLEAN)

**Storage debe tener estos buckets:**
- ✅ `business-logos` (50MB, público)
- ✅ `business-covers` (50MB, público)

### 3️⃣ VERIFICAR POLÍTICAS RLS
Las políticas deben permitir:
- ✅ Usuarios pueden ver/editar su propio perfil
- ✅ Público puede ver vendedores activos
- ✅ Subir/ver imágenes en buckets

## 🔧 QUÉ HEMOS MEJORADO

### ✅ Sistema de Imágenes
- Subida automática a Supabase Storage
- Redimensionado automático (400x400 logos, 1200x400 portadas)
- Capacidad aumentada a 50MB por imagen
- Logs detallados para debugging

### ✅ Sistema de Ubicación
- GPS automático funcional
- Guardado de coordenadas y dirección
- Verificación de ubicación
- Filtro de negocios abiertos en marketplace

### ✅ Botón de Estado
- Diseño compacto como solicitado
- Verde para "Abierto", gris para "Cerrado"
- Funcionalidad: solo negocios abiertos aparecen en marketplace

### ✅ Manejo de Errores
- Logs específicos en consola
- Mensajes claros para el usuario
- Validaciones robustas

## 🎯 RESULTADO ESPERADO

Después de ejecutar los scripts:
1. ✅ Fotos de perfil y portada se suben y guardan
2. ✅ Ubicación GPS se detecta y guarda
3. ✅ Botón abierto/cerrado funciona correctamente
4. ✅ Solo negocios abiertos aparecen en marketplace
5. ✅ Todos los cambios se guardan sin errores

## 🚨 SI AÚN HAY ERRORES

Revisa la consola del navegador (F12) y busca:
- `column "business_logo" does not exist` → Ejecutar FIX_SELLERS_TABLE_COMPLETO.sql
- `bucket does not exist` → Ejecutar SCRIPT_BUCKETS_IMAGENES_SUPABASE.sql
- `RLS policy violation` → Verificar políticas en Supabase
- `permission denied` → Verificar que el usuario esté autenticado

Los logs te dirán exactamente qué falta por configurar.
