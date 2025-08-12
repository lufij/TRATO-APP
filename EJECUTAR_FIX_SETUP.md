# 🚀 EJECUTAR CONFIGURACIÓN DE BASE DE DATOS

## ⚡ Instrucciones Paso a Paso

### 1. Abrir Supabase Dashboard
1. Ve a [supabase.com](https://supabase.com)
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto: **`olidxbacfxrijmmtpcoy`**

### 2. Acceder al SQL Editor
1. En el panel izquierdo, busca y haz clic en **"SQL Editor"**
2. Se abrirá una nueva pestaña con el editor SQL

### 3. Ejecutar el Script de Configuración
1. **Abrir el archivo**: Busca `/database/fix_setup.sql` en tu proyecto
2. **Copiar todo el contenido**: Selecciona todo (Ctrl+A) y copia (Ctrl+C)
3. **Pegar en Supabase**: En el SQL Editor, pega todo el código (Ctrl+V)
4. **Ejecutar**: Haz clic en el botón **"Run"** (▶️) en la esquina inferior derecha

### 4. Verificar Resultados
El script mostrará varios mensajes de confirmación:
- ✅ `Tables created successfully` - 8 tablas creadas
- ✅ `Storage buckets created successfully` - 3 buckets creados
- ✅ `RLS enabled on all tables` - Seguridad habilitada
- ✅ `SETUP COMPLETED SUCCESSFULLY!` - Configuración completada

### 5. Configurar Autenticación
1. Ve a **Authentication** → **Settings**
2. Busca **"Enable email confirmations"**
3. **Desactívalo** (toggle a OFF)
4. Haz clic en **"Save"**

### 6. Verificar en tu Aplicación
1. Regresa a tu aplicación (localhost o producción)
2. Recarga la página (F5)
3. La pantalla de error de database debería desaparecer
4. Podrás registrar usuarios y usar todas las funcionalidades

## 🎯 ¿Qué hace este script?

### Crea 8 tablas principales:
- **users**: Usuarios base (compradores, vendedores, repartidores)
- **sellers**: Datos específicos de vendedores
- **drivers**: Datos específicos de repartidores
- **products**: Catálogo de productos
- **cart_items**: Carritos de compras
- **orders**: Órdenes de compra
- **order_items**: Detalles de cada orden
- **reviews**: Reseñas y calificaciones

### Configura Storage para imágenes:
- **products**: Fotos de productos (hasta 50MB)
- **avatars**: Fotos de perfil (hasta 10MB)
- **business-logos**: Logos de negocios (hasta 10MB)

### Establece seguridad (RLS):
- Cada usuario solo puede ver/editar sus propios datos
- Los datos públicos (productos, perfiles) son visibles para todos
- Sistema de permisos granular por rol

## 🛠 Resolución de Problemas

### Si ves errores durante la ejecución:
1. **"relation already exists"**: Normal, el script limpia datos existentes
2. **"permission denied"**: Verifica que eres el propietario del proyecto
3. **"bucket already exists"**: Normal, el script es idempotente

### Si la aplicación sigue mostrando errores:
1. Verifica que se ejecutó el script completo
2. Espera 30 segundos para propagación
3. Recarga la aplicación
4. Verifica en "Database" → "Tables" que las 8 tablas estén creadas

## ✅ Verificación Manual

En **Database** → **Tables** deberías ver:
- ✅ users
- ✅ sellers  
- ✅ drivers
- ✅ products
- ✅ cart_items
- ✅ orders
- ✅ order_items
- ✅ reviews

En **Storage** deberías ver:
- ✅ products
- ✅ avatars
- ✅ business-logos

## 🎉 ¡Listo!

Una vez completados estos pasos, tu aplicación de delivery estará 100% funcional con:
- ✅ Registro de usuarios sin verificación email
- ✅ Base de datos completa
- ✅ Storage de imágenes configurado
- ✅ Seguridad y permisos establecidos

**¡Tu aplicación TRATO está lista para usarse!**