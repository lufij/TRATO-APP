# 🔧 INTEGRACIÓN SUPABASE - Sistema de Productos

## ⚠️ ACTUALIZACIÓN REQUERIDA

**SÍ, necesitas actualizar tu base de datos Supabase** para que el sistema de gestión de productos funcione correctamente.

## 🎯 ¿Qué necesitas hacer?

### 1️⃣ **EJECUTAR SCRIPT ACTUALIZADO** (Obligatorio)

El script `/database/fix_setup.sql` ahora incluye:
- ✅ Nueva tabla `daily_products` 
- ✅ Políticas de seguridad para productos del día
- ✅ Funciones de auto-limpieza
- ✅ Soporte para imágenes organizadas por usuario

**📍 PASOS:**
1. Ve a: https://supabase.com/dashboard/project/olidxbacfxrijmmtpcoy/sql
2. Copia **TODO** el contenido de `/database/fix_setup.sql`
3. Pégalo en SQL Editor
4. Haz clic en **"Run"** ▶️

### 2️⃣ **VERIFICAR AUTHENTICATION** (Importante)

**📍 Ve a Authentication → Settings:**
https://supabase.com/dashboard/project/olidxbacfxrijmmtpcoy/auth/settings

- ❌ **Desactiva** "Enable email confirmations"
- ✅ **Activa** "Allow new users to sign up"

### 3️⃣ **VERIFICAR STORAGE** (Crítico)

**📍 Ve a Storage → Buckets:**
https://supabase.com/dashboard/project/olidxbacfxrijmmtpcoy/storage/buckets

Debes ver estos 3 buckets:
- ✅ `products` (para todas las imágenes de productos)
- ✅ `avatars` (para fotos de perfil)  
- ✅ `business-logos` (para logos de negocios)

---

## 🗃️ NUEVAS TABLAS CREADAS

### `daily_products` (Nueva)
```sql
- id (UUID, PK)
- seller_id (UUID, FK → sellers)
- name (TEXT)
- description (TEXT)
- price (DECIMAL)
- image_url (TEXT)
- stock_quantity (INTEGER)
- expires_at (TIMESTAMP) ← Se elimina automáticamente
- created_at (TIMESTAMP)
```

### Tablas Actualizadas:
- `cart_items` → Ahora soporta productos del día
- `order_items` → Ahora soporta productos del día
- `reviews` → Ahora soporta productos del día

---

## 📁 ORGANIZACIÓN DE STORAGE

### Estructura de Carpetas:
```
products/
├── {user_id}/               ← Productos normales
│   ├── timestamp1.jpg
│   └── timestamp2.png
└── daily-products/          ← Productos del día
    └── {user_id}/
        └── {date}/
            ├── timestamp1.jpg
            └── timestamp2.png
```

### Políticas de Seguridad:
- ✅ Usuarios solo pueden subir a sus carpetas
- ✅ Imágenes son públicas para visualización
- ✅ Auto-limpieza de imágenes cuando se elimina producto

---

## ✅ VERIFICACIÓN POST-INSTALACIÓN

### 1. Verificar Tablas
```sql
-- Ejecuta esto en SQL Editor para verificar
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'sellers', 'products', 'daily_products');
```

**Debe mostrar 4 tablas.**

### 2. Verificar Storage Buckets
Ve a Storage y confirma que existan los 3 buckets mencionados.

### 3. Probar Upload de Imagen
1. Regístrate como vendedor
2. Intenta crear un producto
3. Sube una imagen de prueba

---

## 🚨 SI ALGO FALLA

### Error: "policy already exists"
**Solución:**
1. Ejecuta `/database/emergency_cleanup.sql` PRIMERO
2. Luego ejecuta `/database/fix_setup.sql`

### Error: "storage bucket not found"
**Solución:**
1. Ve a Storage → Buckets
2. Crea manualmente: `products`, `avatars`, `business-logos`
3. Haz todos públicos

### Error: "users table not found"
**Solución:**
- Asegúrate de ejecutar el script COMPLETO
- No solo partes del mismo

---

## 🎉 FUNCIONALIDADES QUE TENDRÁS

### Para Vendedores:
- ✅ Crear productos normales (permanentes)
- ✅ Crear productos del día (se eliminan a medianoche)
- ✅ Subir imágenes organizadas por usuario
- ✅ Editar/eliminar productos
- ✅ Ver estadísticas de productos

### Sistema Automático:
- ✅ Productos del día se eliminan a las 23:59:59
- ✅ Imágenes de productos eliminados se limpian
- ✅ Organización automática de archivos
- ✅ Políticas de seguridad por usuario

---

## 📋 CHECKLIST FINAL

Antes de usar la aplicación, verifica:

- [ ] ✅ Script `fix_setup.sql` ejecutado sin errores
- [ ] ✅ Email confirmations desactivado en Auth
- [ ] ✅ 3 buckets de storage creados
- [ ] ✅ Aplicación recargada (F5)
- [ ] ✅ Registro de vendedor funciona
- [ ] ✅ Upload de imágenes funciona

---

## 🔄 ¿NECESITAS AYUDA?

Si encuentras errores durante la instalación:

1. **Consulta:** `/FIX_POLICY_ERROR.md`
2. **Ejecuta:** `/database/verify_setup.sql` para diagnóstico
3. **Limpia:** `/database/emergency_cleanup.sql` si es necesario

**¡Una vez completado esto, tu sistema de productos estará 100% funcional!**