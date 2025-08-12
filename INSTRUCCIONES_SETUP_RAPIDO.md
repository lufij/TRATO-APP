# ⚡ SETUP RÁPIDO - 5 MINUTOS

## 🎯 Resumen Ultra Rápido

**Para ejecutar el setup de tu base de datos:**

### 1️⃣ Ir a Supabase SQL Editor
**URL directa**: https://supabase.com/dashboard/project/olidxbacfxrijmmtpcoy/sql

### 2️⃣ Copiar y Ejecutar Script
1. Abre `/database/fix_setup.sql` 
2. Copia TODO el contenido (actualizado - es idempotente)
3. Pega en SQL Editor
4. Haz clic en **"Run"** ▶️

### 3️⃣ Desactivar Verificación Email
**URL directa**: https://supabase.com/dashboard/project/olidxbacfxrijmmtpcoy/auth/settings
- Busca "Enable email confirmations"
- Cambia a **OFF**
- Guarda cambios

---

## 🚨 ¿Error de Política Duplicada?

Si ves este error:
```
ERROR: 42710: policy "Public product images" for table "objects" already exists
```

**Solución rápida:**
1. El script ha sido **actualizado y es idempotente**
2. Si sigue fallando, ejecuta **primero** `/database/emergency_cleanup.sql`
3. Luego ejecuta `/database/fix_setup.sql`

Ver guía completa: `/FIX_POLICY_ERROR.md`

---

## 🔍 ¿Qué verás después del setup?

### ✅ En Database → Tables:
```
users          ← Usuarios base
sellers        ← Datos de vendedores  
drivers        ← Datos de repartidores
products       ← Catálogo productos
cart_items     ← Carritos compras
orders         ← Órdenes de compra
order_items    ← Detalles órdenes
reviews        ← Reseñas/calificaciones
```

### ✅ En Storage → Buckets:
```
products         ← Fotos productos (50MB max)
avatars          ← Fotos perfil (10MB max)  
business-logos   ← Logos negocios (10MB max)
```

### ✅ En tu Aplicación:
- Sin errores de "tabla no encontrada"
- Registro funcional sin verificación email
- Dashboards por rol listos para usar

---

## 🚨 Si algo sale mal:

### Error "permission denied":
- Verifica que eres owner del proyecto Supabase

### Error "policy already exists":
- **NUEVO**: El script actualizado maneja esto automáticamente
- Si persiste, ver `/FIX_POLICY_ERROR.md`

### App sigue con errores:
1. Espera 30 segundos
2. Recarga la aplicación (F5)
3. Verifica que las 8 tablas estén en Database

---

## 📱 Funcionalidades que tendrás:

### 🛒 Para Compradores:
- Explorar productos por categoría
- Agregar al carrito
- Realizar pedidos
- Seguimiento de órdenes
- Calificar productos

### 🏪 Para Vendedores:
- Dashboard de ventas
- Gestión de productos
- Administrar órdenes
- Estadísticas de negocio

### 🚚 Para Repartidores:
- Ver órdenes disponibles
- Aceptar entregas
- Actualizar estado de entrega
- Historial de entregas

---

## 🎉 ¡Una vez hecho esto!

Tu aplicación **TRATO** estará 100% funcional y lista para:
- ✅ Registro de usuarios inmediato
- ✅ Sistema completo de delivery
- ✅ Storage de imágenes
- ✅ Seguridad y permisos
- ✅ Datos en tiempo real

**¡Todo listo en 5 minutos!** 🚀

---

## 📚 Archivos de Ayuda

- **Setup general**: `/EJECUTAR_FIX_SETUP.md`
- **Error de políticas**: `/FIX_POLICY_ERROR.md`
- **Diagnóstico**: `/database/verify_setup.sql`
- **Limpieza**: `/database/emergency_cleanup.sql`