# 🚀 Configuración de Desarrollo TRATO

Este proyecto está optimizado para **Visual Studio Code** con configuraciones profesionales que mejoran la experiencia de desarrollo.

## 📋 Configuración Automática

### ✅ Extensiones Instaladas Automáticamente
- **TypeScript & React**: Soporte completo para TS/React
- **Tailwind CSS**: IntelliSense para clases CSS
- **ESLint & Prettier**: Formateo y linting automático
- **Material Icon Theme**: Iconos bonitos para archivos
- **GitLens**: Mejor integración con Git
- **Error Lens**: Errores inline en tiempo real

### 🎨 Tema Visual Personalizado
- **Colores TRATO**: Barra de título naranja (#f97316)
- **Fuente**: Fira Code con ligaduras habilitadas
- **Iconos**: Material Icon Theme para mejor organización

## 🔧 Comandos Útiles (Ctrl+Shift+P)

### 🏃‍♂️ Desarrollo Rápido
```
> Tasks: Run Task > 🚀 Desarrollo - Iniciar servidor
```

### 🔨 Build y Deploy
```
> Tasks: Run Task > 🔨 Build - Construir proyecto
> Tasks: Run Task > 🧪 Preview - Vista previa del build
```

### 🧹 Formateo y Limpieza
```
> Tasks: Run Task > ✨ Format - Formatear código
> Tasks: Run Task > 🧹 Lint - Verificar código
```

### 🗄️ Base de Datos
```
> Tasks: Run Task > 🗄️ Base de Datos - Verificar conexión
```

## 🎯 Snippets Personalizados TRATO

### `trc` - Componente React básico
```typescript
import React from 'react';

interface ComponentNameProps {
  // props here
}

export function ComponentName({ }: ComponentNameProps) {
  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      
    </div>
  );
}
```

### `trcard` - Componente Card TRATO
```typescript
<Card className="border-orange-200">
  <CardHeader>
    <CardTitle className="text-orange-800">Título</CardTitle>
  </CardHeader>
  <CardContent>
    // Contenido
  </CardContent>
</Card>
```

### `trbtn` - Botón con gradiente TRATO
```typescript
<Button className="bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600 text-white">
  Texto del botón
</Button>
```

### `trsupa` - Query Supabase
```typescript
const { data: dataName, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value)
  .order('created_at', { ascending: false });

if (error) {
  console.error('Error loading dataName:', error);
  throw error;
}
```

### `trload` - Estado de carga
```typescript
if (loading) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando...</p>
      </div>
    </div>
  );
}
```

## 🚀 Scripts NPM Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo con hot reload
npm run dev:debug        # Desarrollo con logs de debug

# Build y Deploy
npm run build            # Construir para producción
npm run preview          # Vista previa del build
npm run build:analyze    # Análisis del bundle

# Calidad de Código
npm run lint             # Verificar errores de linting
npm run lint:fix         # Corregir errores automáticamente
npm run format           # Formatear código con Prettier
npm run type-check       # Verificar tipos TypeScript

# Utilidades
npm run clean            # Limpiar node_modules y cache
npm run db:check         # Verificar conexión con Supabase
npm run setup            # Configuración completa del proyecto
```

## 🎯 Atajos de Teclado Útiles

### 🏃‍♂️ Desarrollo
- `F5`: Iniciar debugging
- `Ctrl + Shift + \``: Terminal nueva
- `Ctrl + Shift + P`: Paleta de comandos
- `Ctrl + \``: Toggle terminal

### ✨ Formateo
- `Shift + Alt + F`: Formatear documento
- `Ctrl + S`: Guardar y formatear automáticamente
- `Ctrl + Shift + I`: Organizar imports

### 🔍 Navegación
- `Ctrl + P`: Buscar archivos
- `Ctrl + Shift + F`: Buscar en todo el proyecto
- `Ctrl + G`: Ir a línea
- `F12`: Ir a definición

## 🎨 Colores TRATO para Desarrollo

### 🟠 Naranja Principal
```css
--trato-orange: #f97316
--trato-orange-50: #fff7ed
--trato-orange-100: #ffedd5
--trato-orange-500: #f97316
--trato-orange-600: #ea580c
```

### 🟢 Verde Claro
```css
--trato-green: #84cc16
--trato-green-50: #f7fee7
--trato-green-100: #ecfccb
--trato-green-500: #84cc16
--trato-green-600: #65a30d
```

## 🔧 Configuración Personalizada

### Formateo Automático
- ✅ Al guardar archivo
- ✅ Al pegar código
- ✅ Organizar imports automáticamente
- ✅ Corregir ESLint automáticamente

### IntelliSense Mejorado
- ✅ Tailwind CSS con colores y medidas
- ✅ TypeScript con tipos inline
- ✅ React hooks y props
- ✅ Supabase client y tipos

### Debugging
- ✅ Chrome DevTools integrado
- ✅ Source maps habilitados
- ✅ Breakpoints en TypeScript
- ✅ Variables y watch expressions

## 📝 Tips de Productividad

1. **Usa los snippets**: Escribe `trc` + Tab para un componente rápido
2. **Paleta de comandos**: `Ctrl + Shift + P` para cualquier acción
3. **Multi-cursor**: `Alt + Click` para editar múltiples líneas
4. **Refactoring**: `F2` para renombrar símbolos en todo el proyecto
5. **Problems panel**: `Ctrl + Shift + M` para ver errores y warnings

## 🎯 Flujo de Trabajo Recomendado

1. **Iniciar**: `Ctrl + Shift + P` → "Tasks: Run Task" → "🚀 Desarrollo"
2. **Desarrollo**: Usa snippets y hot reload para cambios rápidos
3. **Testing**: `Ctrl + Shift + P` → "Tasks: Run Task" → "🔍 Type Check"
4. **Build**: `Ctrl + Shift + P` → "Tasks: Run Task" → "🔨 Build"
5. **Deploy**: El build se genera en `/dist`

---

**¡Tu entorno de desarrollo TRATO está listo para crear una experiencia excepcional! 🚀**