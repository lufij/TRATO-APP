# DeliveryApp - Plataforma de Delivery Completa

Una aplicación de delivery fullstack que conecta compradores, vendedores y repartidores en un ecosistema integrado.

## 🚨 Error Común y Solución Rápida

### Si ves: `"Could not find the table 'public.users'"`

**Solución inmediata:**
1. Ve a tu dashboard de Supabase → **SQL Editor**
2. Ejecuta **TODO** el contenido de `/database/complete_setup.sql`
3. Verifica en **Database > Tables** que se crearon las tablas
4. Reinicia la aplicación: `npm run dev`

Para más detalles: [FIX_DATABASE_ERROR.md](./FIX_DATABASE_ERROR.md)

## 🚀 Características Principales

- **3 Tipos de Usuario**: Compradores, Vendedores y Repartidores
- **Registro Instantáneo**: Sin verificación de email, acceso inmediato
- **Autenticación Completa**: Login seguro con Supabase Auth
- **Gestión de Productos**: CRUD completo con imágenes en Supabase Storage
- **Carrito en Tiempo Real**: Sincronización automática entre dispositivos
- **Sistema de Órdenes**: Flujo completo desde compra hasta entrega
- **Perfiles Públicos**: Todos los usuarios y productos son públicos
- **Storage Organizado**: Estructura modular por tipo de usuario

## 🛠 Tecnologías Utilizadas

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Supabase (Database, Auth, Storage, Realtime)
- **UI Components**: shadcn/ui
- **Estado**: Context API
- **Base de Datos**: PostgreSQL (Supabase)

## ⚡ Inicio Rápido

### 1. Configurar Supabase

1. Crea una cuenta en [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. **Desactiva verificación de email**:
   - Ve a **Authentication > Settings**
   - Desactiva **"Enable email confirmations"**
4. Ve a **Settings > API** y copia tus credenciales
5. Actualiza `/utils/supabase/config.ts` con tu Project URL y anon key

### 2. Configurar Base de Datos

1. Ve a **SQL Editor** en Supabase
2. Ejecuta **TODO** el contenido de `/database/complete_setup.sql`
3. Verifica que se crearon las tablas en **Database > Tables**

### 3. Ejecutar la Aplicación

```bash
npm run dev
```

¡Listo! Ya puedes registrar usuarios y usar la aplicación.

## 📋 Configuración Detallada

### Configuración Completa de Supabase
Para instrucciones paso a paso: [SETUP_SUPABASE.md](./SETUP_SUPABASE.md)

### Solución de Problemas
Para errores específicos: [FIX_DATABASE_ERROR.md](./FIX_DATABASE_ERROR.md)

## 🔄 Flujo de Usuario

### Registro (Sin Verificación)
1. **Selección de Rol**: Comprador, vendedor o repartidor
2. **Formulario Multi-paso**: Información personal y específica del rol
3. **Acceso Inmediato**: Sin email de verificación, acceso directo al dashboard

### Dashboards por Rol
- **Compradores**: Catálogo de productos, carrito, historial
- **Vendedores**: Gestión de productos, órdenes, analytics
- **Repartidores**: Órdenes disponibles, tracking, ganancias

## 📊 Estructura de la Base de Datos

### Tablas Principales
- **users**: Información básica de todos los usuarios
- **sellers**: Información extendida para vendedores  
- **drivers**: Información extendida para repartidores
- **products**: Catálogo de productos de vendedores
- **cart_items**: Items en carritos de compradores
- **orders**: Órdenes de compra
- **order_items**: Items específicos de cada orden
- **reviews**: Reseñas de productos

### Storage Buckets
- **products**: Imágenes de productos
- **avatars**: Fotos de perfil de usuarios
- **business-logos**: Logos de negocios

## 🔐 Seguridad y Permisos

### Row Level Security (RLS)
- **Perfiles**: Públicos para todos, editables solo por el propietario
- **Productos**: Públicos cuando `is_public = true`, gestionables solo por el vendedor
- **Carritos**: Privados por usuario
- **Órdenes**: Visibles para comprador, vendedor y repartidor asignado
- **Reseñas**: Públicas, creables solo por compradores que completaron la orden

### Storage Security
- **Lectura**: Pública para todos los buckets
- **Escritura**: Solo usuarios autenticados en sus propias carpetas
- **Estructura**: `/bucket_name/user_id/file_name`

## 👥 Roles y Funcionalidades

### Compradores (`comprador`)
- ✅ Ver catálogo público de productos
- ✅ Buscar y filtrar productos
- ✅ Agregar productos al carrito
- ✅ Realizar órdenes
- ⏳ Ver historial de órdenes
- ⏳ Dejar reseñas

### Vendedores (`vendedor`)
- ✅ Crear perfil de negocio
- ⏳ Gestionar catálogo de productos (CRUD)
- ⏳ Subir imágenes de productos
- ⏳ Ver órdenes recibidas
- ⏳ Actualizar estado de órdenes
- ⏳ Dashboard de ventas

### Repartidores (`repartidor`)
- ✅ Crear perfil con vehículo
- ⏳ Ver órdenes disponibles
- ⏳ Aceptar entregas
- ⏳ Actualizar ubicación en tiempo real
- ⏳ Marcar entregas como completadas

## 🚧 Próximas Funcionalidades

- [ ] Dashboard completo para vendedores
- [ ] Sistema de checkout y pagos
- [ ] Tracking en tiempo real con mapas
- [ ] Notificaciones push
- [ ] Sistema de reseñas
- [ ] Panel de administración
- [ ] Analytics y reportes
- [ ] Chat entre usuarios
- [ ] Geolocalización automática

## 🔧 Desarrollo

### Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── ui/             # Componentes shadcn/ui
│   ├── BuyerHome.tsx   # Dashboard compradores
│   ├── SellerDashboard.tsx # Dashboard vendedores  
│   ├── DriverDashboard.tsx # Dashboard repartidores
│   ├── WelcomeScreen.tsx   # Pantalla inicial
│   ├── RoleSelection.tsx   # Selección de rol
│   └── RegistrationForm.tsx # Formulario registro
├── contexts/           # Context providers (Auth, Cart)
├── hooks/              # Custom hooks
├── utils/              # Utilidades y configuración
├── database/           # Schema SQL
└── styles/             # Estilos globales
```

### Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Linting
npm run lint
```

## 🔍 Troubleshooting

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `"Could not find table 'public.users'"` | Schema no ejecutado | Ejecutar `/database/complete_setup.sql` |
| `"Invalid login credentials"` | Credenciales incorrectas | Verificar `/utils/supabase/config.ts` |
| `"Email not confirmed"` | Verificación email activada | Desactivar en Auth > Settings |
| `"Row Level Security violation"` | Políticas RLS incorrectas | Re-ejecutar script SQL completo |

### Lista de Verificación

- [ ] ✅ Credenciales Supabase correctas en config.ts
- [ ] ✅ Verificación de email desactivada
- [ ] ✅ Script SQL ejecutado completamente  
- [ ] ✅ Tablas creadas en Database > Tables
- [ ] ✅ Buckets creados en Storage
- [ ] ✅ Aplicación reiniciada después de cambios

## ⚡ Características del Sistema

### Registro Sin Fricción
- **Sin verificación de email**: Acceso inmediato después del registro
- **Formulario inteligente**: Campos específicos según el rol elegido
- **Progress bar**: Indicador visual del progreso de registro
- **Validación en tiempo real**: Feedback inmediato sobre errores

### Experiencia de Usuario
- **Responsive Design**: Optimizado para móvil y desktop
- **Loading states**: Feedback visual durante operaciones
- **Error handling**: Manejo robusto de errores con mensajes claros
- **Navegación fluida**: Transiciones suaves entre pantallas

## 📱 Responsive Design

La aplicación está optimizada para:
- 📱 **Mobile**: Experiencia nativa en dispositivos móviles
- 💻 **Desktop**: Interfaz completa para gestión avanzada
- 📟 **Tablet**: Adaptación fluida entre dispositivos

## 🌐 Deploy

Para producción, asegúrate de:

1. Configurar las variables de entorno en tu plataforma de hosting
2. Actualizar las políticas CORS en Supabase si es necesario
3. Verificar que todas las políticas RLS estén activas
4. Confirmar que la verificación de email esté desactivada

## 📞 Soporte

Si tienes problemas:

1. **Consulta** [FIX_DATABASE_ERROR.md](./FIX_DATABASE_ERROR.md) para errores de DB
2. **Revisa** [SETUP_SUPABASE.md](./SETUP_SUPABASE.md) para configuración
3. **Verifica** que las credenciales sean correctas
4. **Asegúrate** de que el schema SQL se ejecutó completamente
5. **Confirma** que la verificación de email esté desactivada

## 🔄 Flujo de Datos

```
Registro → Creación Usuario → Login Automático → Dashboard por Rol
```

Sin pasos intermedios de verificación = experiencia fluida y sin fricciones.

---

**🎯 ¿Listo para empezar?**

1. Configura Supabase siguiendo [SETUP_SUPABASE.md](./SETUP_SUPABASE.md)
2. Ejecuta `npm run dev`
3. ¡Crea tu primera cuenta y explora la aplicación!

**¡Desarrollado con ❤️ para la comunidad de delivery!**
