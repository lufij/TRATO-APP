# 🖼️ CONFIGURACIÓN DE IMÁGENES EN SUPABASE

## ⚠️ PROBLEMA REPORTADO
Las fotos de perfil y portada no se guardan porque faltan los buckets en Supabase.

## 📋 PASOS PARA SOLUCIONAR

### 1. Ejecutar Script SQL
Ve a tu panel de Supabase → SQL Editor y ejecuta este script:

```sql
-- SCRIPT PARA CREAR BUCKETS DE IMÁGENES EN SUPABASE

-- Crear bucket para logos de negocios si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-logos',
  'business-logos', 
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Crear bucket para portadas de negocios si no existe  
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-covers',
  'business-covers',
  true, 
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;
```

### 2. Configurar Políticas RLS
Ejecuta también estas políticas para permitir subir imágenes:

```sql
-- Políticas para LOGOS
CREATE POLICY "Users can upload their own business logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'business-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Business logos are publicly viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'business-logos');

CREATE POLICY "Users can update their own business logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'business-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Políticas para PORTADAS
CREATE POLICY "Users can upload their own business covers" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'business-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Business covers are publicly viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'business-covers');

CREATE POLICY "Users can update their own business covers" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'business-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 3. Verificar en Supabase Dashboard
1. Ve a Storage en tu panel de Supabase
2. Deberías ver 2 buckets nuevos:
   - `business-logos` (público)
   - `business-covers` (público)

### 4. Probar la Funcionalidad
Después de ejecutar el script:
1. Ve al perfil del vendedor
2. Haz clic en "Editar"
3. Sube una foto de perfil o portada
4. Verifica que se guarde correctamente

## 🔧 FUNCIONALIDADES IMPLEMENTADAS

✅ **Redimensionado automático**
- Logos: 400x400px máximo
- Portadas: 1200x400px máximo

✅ **Validaciones**
- Solo archivos de imagen permitidos
- Máximo 10MB por archivo
- Compresión automática con Canvas API

✅ **Almacenamiento**
- URLs públicas en Supabase Storage
- Estructura: `{user-id}/business-logo-{timestamp}.jpg`
- Actualización automática en base de datos

✅ **Logs de diagnóstico**
- Consolelog detallado para debugging
- Mensajes específicos de éxito/error

## 🚨 SI AÚN NO FUNCIONA

Revisa la consola del navegador (F12) para ver errores específicos como:
- "bucket does not exist"
- "RLS policy violation"
- "insufficient privileges"

Estos logs te dirán exactamente qué está fallando.
