#!/bin/bash

# 🚀 SCRIPT DE DEPLOYMENT AUTOMÁTICO
# Ejecutar desde la raíz del proyecto

echo "🚀 INICIANDO DEPLOYMENT PARA PRUEBAS EN CELULAR..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Ejecutar desde la raíz del proyecto"
    exit 1
fi

# 1. Verificar y instalar dependencias
echo "📦 Verificando dependencias..."
npm install

# 2. Hacer build de producción
echo "🔨 Compilando para producción..."
npm run build

# 3. Verificar que el build fue exitoso
if [ ! -d "dist" ]; then
    echo "❌ Error: Build falló, no se generó carpeta dist"
    exit 1
fi

echo "✅ Build exitoso!"

# 4. Configurar git si es necesario
echo "📝 Configurando git..."
git add .
git commit -m "🚀 Deployment ready - Build para celular generado"

# 5. Push a repositorio
echo "⬆️ Subiendo cambios..."
git push origin main

# 6. Opciones de deployment
echo ""
echo "🎯 BUILD COMPLETADO - OPCIONES DE DEPLOYMENT:"
echo ""
echo "1️⃣  VERCEL (Recomendado):"
echo "   npm install -g vercel"
echo "   vercel --prod"
echo ""
echo "2️⃣  NETLIFY:"
echo "   npm install -g netlify-cli"
echo "   netlify deploy --prod --dir=dist"
echo ""
echo "3️⃣  GITHUB PAGES:"
echo "   Ir a GitHub → Settings → Pages → main branch"
echo ""
echo "4️⃣  SERVIDOR PROPIO:"
echo "   Subir contenido de carpeta 'dist/' a tu servidor"
echo ""

# 7. Mostrar información del build
echo "📊 INFORMACIÓN DEL BUILD:"
echo "📁 Carpeta de producción: ./dist/"
echo "📏 Tamaño total: $(du -sh dist/ | cut -f1)"
echo "📄 Archivos generados: $(find dist/ -type f | wc -l) archivos"
echo ""

# 8. Verificar estructura de archivos críticos
echo "🔍 VERIFICANDO ARCHIVOS CRÍTICOS:"
if [ -f "dist/index.html" ]; then echo "✅ index.html"; else echo "❌ index.html"; fi
if [ -f "dist/manifest.json" ]; then echo "✅ manifest.json (PWA)"; else echo "⚠️  manifest.json (opcional)"; fi
if [ -d "dist/assets" ]; then echo "✅ assets/"; else echo "❌ assets/"; fi

echo ""
echo "🎉 ¡LISTO PARA DEPLOYMENT!"
echo "📱 Tu app está optimizada para celular y lista para producción."
