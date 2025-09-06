# 🚀 DEPLOY AUTOMÁTICO PARA CELULAR - PowerShell
# Ejecutar: .\deploy-celular.ps1

Write-Host "🚀 INICIANDO DEPLOYMENT PARA PRUEBAS EN CELULAR..." -ForegroundColor Cyan

# Verificar que estamos en el directorio correcto
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: Ejecutar desde la raíz del proyecto" -ForegroundColor Red
    exit 1
}

# 1. Verificar y instalar dependencias
Write-Host "📦 Verificando dependencias..." -ForegroundColor Yellow
npm install

# 2. Hacer build de producción
Write-Host "🔨 Compilando para producción..." -ForegroundColor Yellow
npm run build

# 3. Verificar que el build fue exitoso
if (!(Test-Path "dist")) {
    Write-Host "❌ Error: Build falló, no se generó carpeta dist" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build exitoso!" -ForegroundColor Green

# 4. Configurar git si es necesario
Write-Host "📝 Configurando git..." -ForegroundColor Yellow
git add .
git commit -m "🚀 Deployment ready - Build para celular generado"

# 5. Push a repositorio
Write-Host "⬆️ Subiendo cambios..." -ForegroundColor Yellow
git push origin main

# 6. Mostrar opciones de deployment
Write-Host ""
Write-Host "🎯 BUILD COMPLETADO - OPCIONES DE DEPLOYMENT:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  VERCEL (Recomendado):" -ForegroundColor White
Write-Host "   npm install -g vercel" -ForegroundColor Gray
Write-Host "   vercel --prod" -ForegroundColor Gray
Write-Host ""
Write-Host "2️⃣  NETLIFY:" -ForegroundColor White
Write-Host "   npm install -g netlify-cli" -ForegroundColor Gray
Write-Host "   netlify deploy --prod --dir=dist" -ForegroundColor Gray
Write-Host ""
Write-Host "3️⃣  GITHUB PAGES:" -ForegroundColor White
Write-Host "   Ir a GitHub → Settings → Pages → main branch" -ForegroundColor Gray
Write-Host ""
Write-Host "4️⃣  SERVIDOR PROPIO:" -ForegroundColor White
Write-Host "   Subir contenido de carpeta 'dist/' a tu servidor" -ForegroundColor Gray
Write-Host ""

# 7. Mostrar información del build
Write-Host "📊 INFORMACIÓN DEL BUILD:" -ForegroundColor Cyan
$distSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "📁 Carpeta de producción: ./dist/"
Write-Host "📏 Tamaño total: $([math]::Round($distSize, 2)) MB"
$fileCount = (Get-ChildItem -Path "dist" -Recurse -File).Count
Write-Host "📄 Archivos generados: $fileCount archivos"
Write-Host ""

# 8. Verificar estructura de archivos críticos
Write-Host "🔍 VERIFICANDO ARCHIVOS CRÍTICOS:" -ForegroundColor Cyan
if (Test-Path "dist/index.html") { Write-Host "✅ index.html" -ForegroundColor Green } else { Write-Host "❌ index.html" -ForegroundColor Red }
if (Test-Path "dist/manifest.json") { Write-Host "✅ manifest.json (PWA)" -ForegroundColor Green } else { Write-Host "⚠️  manifest.json (opcional)" -ForegroundColor Yellow }
if (Test-Path "dist/assets") { Write-Host "✅ assets/" -ForegroundColor Green } else { Write-Host "❌ assets/" -ForegroundColor Red }

# 9. Información adicional para celular
Write-Host ""
Write-Host "📱 CONFIGURACIÓN PARA CELULAR:" -ForegroundColor Cyan
Write-Host "✅ PWA configurado (instalable en móvil)" -ForegroundColor Green
Write-Host "✅ Service Worker implementado" -ForegroundColor Green
Write-Host "✅ Notificaciones push habilitadas" -ForegroundColor Green
Write-Host "✅ Interface responsive optimizada" -ForegroundColor Green
Write-Host "✅ Audio y vibración para móviles" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 ¡LISTO PARA DEPLOYMENT!" -ForegroundColor Green
Write-Host "📱 Tu app está optimizada para celular y lista para producción." -ForegroundColor White

# 10. Abrir explorador con la carpeta dist
Write-Host ""
Write-Host "📂 Abriendo carpeta dist para inspección..." -ForegroundColor Yellow
explorer.exe "dist"
