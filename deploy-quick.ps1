# 🚀 DEPLOY RÁPIDO PARA CELULAR
Write-Host "🚀 DEPLOYMENT PARA CELULAR - TRATO APP" -ForegroundColor Cyan

# Información del build actual
if (Test-Path "dist") {
    Write-Host "✅ Build encontrado en carpeta 'dist/'" -ForegroundColor Green
    $fileCount = (Get-ChildItem -Path "dist" -Recurse -File).Count
    Write-Host "📄 Archivos: $fileCount" -ForegroundColor White
    
    # Verificar archivos críticos
    if (Test-Path "dist/index.html") { Write-Host "✅ index.html" -ForegroundColor Green }
    if (Test-Path "dist/assets") { Write-Host "✅ assets/" -ForegroundColor Green }
    
} else {
    Write-Host "❌ No se encontró carpeta 'dist'. Ejecuta: npm run build" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎯 OPCIONES DE DEPLOYMENT:" -ForegroundColor Yellow

Write-Host ""
Write-Host "1️⃣  VERCEL (Recomendado - 2 minutos):" -ForegroundColor White
Write-Host "   npm install -g vercel" -ForegroundColor Gray
Write-Host "   vercel --prod" -ForegroundColor Gray

Write-Host ""
Write-Host "2️⃣  NETLIFY:" -ForegroundColor White  
Write-Host "   npm install -g netlify-cli" -ForegroundColor Gray
Write-Host "   netlify deploy --prod --dir=dist" -ForegroundColor Gray

Write-Host ""
Write-Host "3️⃣  GITHUB PAGES:" -ForegroundColor White
Write-Host "   GitHub → Settings → Pages → main branch" -ForegroundColor Gray

Write-Host ""
Write-Host "📱 DESPUÉS DEL DEPLOYMENT:" -ForegroundColor Cyan
Write-Host "- Abre la URL en tu celular" -ForegroundColor White
Write-Host "- Instala como PWA (Agregar a inicio)" -ForegroundColor White
Write-Host "- Prueba las notificaciones sonoras" -ForegroundColor White
Write-Host "- Verifica que no hay errores 400" -ForegroundColor White

Write-Host ""
Write-Host "🎉 ¡LISTO! Tu app esta compilada y lista para deployment." -ForegroundColor Green
