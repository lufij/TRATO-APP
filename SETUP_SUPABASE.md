# Configuración Completa de Supabase - DeliveryApp

## 🚨 IMPORTANTE: Solución al Error "table not found"

Si ves el error `"Could not find the table 'public.users'"`, sigue las instrucciones en [FIX_DATABASE_ERROR.md](./FIX_DATABASE_ERROR.md) **ANTES** de continuar.

## 📋 Lista de Verificación Completa

### ✅ Paso 1: Configuración Inicial de Supabase

1. **Crear Proyecto**:
   - Ve a [supabase.com](https://supabase.com)
   - Crea una cuenta y un nuevo proyecto
   - Anota tu **Project ID** y **Database Password**

2. **Obtener Credenciales**:
   - Ve a **Settings > API**
   - Copia tu **Project URL** (formato: `https://xxx.supabase.co`)
   - Copia tu **anon public key**

3. **Actualizar Configuración Local**:
   ```typescript
   // En /utils/supabase/config.ts
   export const supabaseConfig = {
     url: 'https://TU_PROJECT_ID.supabase.co',
     anonKey: 'TU_ANON_KEY_AQUI'
   };
   ```

### ✅ Paso 2: Desactivar Verificación de Email

**MUY IMPORTANTE**: Este paso es esencial para el funcionamiento correcto.

1. Ve a **Authentication > Settings**
2. Busca **"Enable email confirmations"**
3. **DESACTIVA** esta opción (toggle OFF)
4. En **"User Signups"**, mantén activado **"Enable user signups"**
5. **DESACTIVA** también **"Double confirm email changes"**
6. Guarda todos los cambios

### ✅ Paso 3: Ejecutar Setup Completo de Base de Datos

1. **Ir a SQL Editor**:
   - En tu dashboard de Supabase, ve a **SQL Editor**
   - Haz click en **"New Query"**

2. **Ejecutar Script Completo**:
   - Copia **TODO** el contenido del archivo `/database/complete_setup.sql`
   - Pégalo en el editor SQL
   - Haz click en **RUN**
   - **Espera** a que termine completamente (puede tomar 30-60 segundos)

3. **Verificar Éxito**:
   - Deberías ver mensajes como "✅ Database setup completed successfully!"
   - Si hay errores de "already exists", es normal - continúa

### ✅ Paso 4: Verificar Tablas Creadas

Ve a **Database > Tables** y verifica que existan:

- ✅ `users` - Información básica de usuarios
- ✅ `sellers` - Datos de vendedores
- ✅ `drivers` - Datos de repartidores
- ✅ `products` - Catálogo de productos
- ✅ `cart_items` - Items en carritos
- ✅ `orders` - Órdenes de compra
- ✅ `order_items` - Items de órdenes
- ✅ `reviews` - Reseñas de productos

### ✅ Paso 5: Verificar Storage Buckets

Ve a **Storage** y verifica que existan:

- ✅ `products` - Imágenes de productos
- ✅ `avatars` - Fotos de perfil
- ✅ `business-logos` - Logos de negocios

### ✅ Paso 6: Verificar Políticas RLS

Ve a **Database > Tables > [tabla] > Policies** para cada tabla y verifica que existan políticas como:

- **users**: "Public profiles are viewable by everyone"
- **products**: "Public products are viewable by everyone"
- **cart_items**: "Users can view their own cart items"
- etc.

## 🧪 Probar la Configuración

### Test Básico
1. Reinicia tu aplicación: `npm run dev`
2. Ve a la página de registro
3. Intenta crear una cuenta nueva
4. **NO** deberías ver errores de "table not found"
5. El usuario debería ser redirigido inmediatamente a su dashboard

### Test de Base de Datos
Ejecuta estas queries en SQL Editor para verificar:

```sql
-- Verificar que existan todas las tablas
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'sellers', 'drivers', 'products', 'cart_items', 'orders', 'order_items', 'reviews');

-- Verificar buckets de storage
SELECT id, name, public FROM storage.buckets;

-- Verificar que RLS esté habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;
```

## 🔧 Solución de Problemas

### Error: "Could not find table"
- **Causa**: El script SQL no se ejecutó o falló
- **Solución**: Ejecuta `/database/complete_setup.sql` completo
- **Verificación**: Ve a Database > Tables y confirma que existan

### Error: "Invalid login credentials"
- **Causa**: Credenciales incorrectas en config
- **Solución**: Verifica Project URL y anon key en `/utils/supabase/config.ts`

### Error: "Email not confirmed"
- **Causa**: Verificación de email activada
- **Solución**: Ve a Authentication > Settings y desactiva "Enable email confirmations"

### Error: "Row Level Security policy violation"
- **Causa**: Políticas RLS no configuradas
- **Solución**: Re-ejecuta el script completo SQL

### Error: "permission denied for schema"
- **Causa**: Problemas con credenciales
- **Solución**: Verifica que uses el anon key correcto, no el service key

## 📊 Arquitectura de Datos

### Relaciones Principales
```
auth.users (Supabase)
    ↓
public.users (base)
    ↓
├── sellers (vendedores)
├── drivers (repartidores)
└── cart_items (compradores)
    
sellers → products → cart_items → orders → order_items
```

### Flujo de Autenticación
```
Registro → Supabase Auth → public.users → Perfil específico (sellers/drivers)
```

### Políticas de Seguridad
- **Lectura**: Mayormente pública (perfiles, productos)
- **Escritura**: Solo propietarios pueden modificar sus datos
- **Carritos/Órdenes**: Privados por usuario
- **Storage**: Público para lectura, autenticado para escritura

## 🎯 Resultado Final

Con esta configuración tendrás:

1. ✅ **Registro sin fricción**: Los usuarios se registran e ingresan inmediatamente
2. ✅ **Base de datos completa**: Todas las tablas y relaciones configuradas
3. ✅ **Seguridad RLS**: Políticas que protegen los datos apropiadamente
4. ✅ **Storage configurado**: Buckets para imágenes y archivos
5. ✅ **Múltiples roles**: Soporte completo para compradores, vendedores y repartidores

## 📞 Contacto y Soporte

Si después de seguir todos estos pasos sigues teniendo problemas:

1. **Verifica** que hayas ejecutado el script SQL completo
2. **Confirma** que la verificación de email esté desactivada
3. **Revisa** la consola del navegador para errores específicos
4. **Comprueba** que las credenciales en config.ts sean correctas

La configuración está diseñada para ser robusta y funcional desde el primer momento. ¡Una vez completada, tu aplicación estará lista para ser usada!