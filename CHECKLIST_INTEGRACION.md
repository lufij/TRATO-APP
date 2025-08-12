# ✅ CHECKLIST DE INTEGRACIÓN - Sistema de Productos

## 🚀 ANTES DE EMPEZAR

¿Es la primera vez que configuras la base de datos?
- [ ] SÍ → Sigue este checklist completo
- [ ] NO → Ve directamente al paso 3

---

## 📋 PASO A PASO

### 1️⃣ **EJECUTAR SCRIPT DE BASE DE DATOS**
- [ ] Abrir: https://supabase.com/dashboard/project/olidxbacfxrijmmtpcoy/sql
- [ ] Copiar **TODO** el contenido de `/database/fix_setup.sql`
- [ ] Pegar en SQL Editor
- [ ] Hacer clic en **"Run"** ▶️
- [ ] Verificar que dice: "✅ SETUP COMPLETED SUCCESSFULLY!"

### 2️⃣ **CONFIGURAR AUTHENTICATION**
- [ ] Ir a: https://supabase.com/dashboard/project/olidxbacfxrijmmtpcoy/auth/settings
- [ ] Buscar "Enable email confirmations" 
- [ ] Cambiar a **OFF** (desactivado)
- [ ] Hacer clic en **"Save"**

### 3️⃣ **VERIFICAR STORAGE**
- [ ] Ir a: https://supabase.com/dashboard/project/olidxbacfxrijmmtpcoy/storage/buckets
- [ ] Confirmar que existen estos 3 buckets:
  - [ ] `products` ✅
  - [ ] `avatars` ✅  
  - [ ] `business-logos` ✅

### 4️⃣ **VERIFICAR INSTALACIÓN**
- [ ] Ejecutar script: `/database/verify_products_setup.sql` en SQL Editor
- [ ] Verificar que dice: "🎉 ¡CONFIGURACIÓN COMPLETA!"
- [ ] Si hay errores, anotar cuáles:
  ```
  _________________________________
  _________________________________
  _________________________________
  ```

### 5️⃣ **PROBAR LA APLICACIÓN**
- [ ] Recargar aplicación (F5)
- [ ] Registrarse como vendedor de prueba
- [ ] Crear un producto normal
- [ ] Subir una imagen de prueba
- [ ] Crear un producto del día
- [ ] Verificar que aparecen en el dashboard

---

## 🔧 SI ALGO FALLA

### ❌ Error: "policy already exists"
- [ ] Ejecutar `/database/emergency_cleanup.sql` PRIMERO
- [ ] Luego ejecutar `/database/fix_setup.sql`

### ❌ Error: "bucket not found"  
- [ ] Ir a Storage → Buckets manualmente
- [ ] Crear buckets: `products`, `avatars`, `business-logos`
- [ ] Hacer todos públicos

### ❌ Error: "table not found"
- [ ] Asegurarse de ejecutar el script **COMPLETO**
- [ ] No copiar solo partes del archivo

### ❌ La aplicación no carga
- [ ] Verificar que las credenciales en `/utils/supabase/config.ts` sean correctas
- [ ] Recargar la página (F5)

---

## 🎯 FUNCIONALIDADES QUE TENDRÁS

### ✅ Para Vendedores:
- [ ] Dashboard con estadísticas de productos
- [ ] Crear productos normales (permanentes)  
- [ ] Crear productos del día (se eliminan a medianoche)
- [ ] Subir imágenes desde dispositivo
- [ ] Editar productos existentes
- [ ] Eliminar productos
- [ ] Ver countdown de productos del día

### ✅ Sistema Automático:
- [ ] Productos del día se eliminan a las 23:59:59
- [ ] Imágenes organizadas por usuario y fecha
- [ ] Limpieza automática de archivos
- [ ] Seguridad: cada usuario solo ve sus productos

---

## 🏁 VERIFICACIÓN FINAL

**Antes de usar en producción, confirma:**

- [ ] ✅ Base de datos configurada sin errores
- [ ] ✅ Authentication sin verificación de email  
- [ ] ✅ Storage buckets creados y funcionando
- [ ] ✅ Vendedor puede registrarse
- [ ] ✅ Subida de imágenes funciona
- [ ] ✅ Productos se crean correctamente
- [ ] ✅ Dashboard muestra estadísticas

---

## 📞 SOPORTE

Si necesitas ayuda adicional:

1. **Consultar:** `/INTEGRACION_PRODUCTOS_SUPABASE.md` (guía detallada)
2. **Ejecutar:** `/database/verify_products_setup.sql` (diagnóstico)
3. **Limpiar:** `/database/emergency_cleanup.sql` (en caso de problemas)

---

## 🎉 ¡LISTO!

Una vez completado este checklist, tu **Sistema de Gestión de Productos TRATO** estará 100% funcional y listo para usar en producción.

**Fecha de completado:** _______________

**Notas adicionales:**
```
_________________________________
_________________________________
_________________________________
```