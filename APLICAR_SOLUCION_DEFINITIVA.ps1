$filePath = "f:\TRATO APP\components\driver\DriverDashboard.tsx"

Write-Host "🚀 APLICANDO SOLUCIÓN DEFINITIVA PARA REPARTIDORES" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Yellow

# Leer todas las líneas del archivo
$lines = Get-Content $filePath

# Encontrar el inicio de la función updateOrderStatus
$startIndex = -1
$endIndex = -1

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "const updateOrderStatus = async") {
        $startIndex = $i
        Write-Host "✓ Función encontrada en línea: $($i + 1)" -ForegroundColor Green
        break
    }
}

if ($startIndex -eq -1) {
    Write-Host "❌ No se encontró la función updateOrderStatus" -ForegroundColor Red
    exit 1
}

# Encontrar el final de la función (la llave de cierre correspondiente)
$braceCount = 0
$inFunction = $false

for ($i = $startIndex; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    
    # Contar llaves abiertas
    $openBraces = ($line -split '\{').Count - 1
    $closeBraces = ($line -split '\}').Count - 1
    
    if ($line -match "const updateOrderStatus = async" -or $inFunction) {
        $inFunction = $true
        $braceCount += $openBraces - $closeBraces
        
        if ($braceCount -eq 0 -and $inFunction -and ($line -match '\}')) {
            $endIndex = $i
            Write-Host "✓ Final de función encontrado en línea: $($i + 1)" -ForegroundColor Green
            break
        }
    }
}

if ($endIndex -eq -1) {
    Write-Host "❌ No se encontró el final de la función" -ForegroundColor Red
    exit 1
}

# Nueva función definitiva
$newFunction = @(
    "  const updateOrderStatus = async (orderId: string, newStatus: string) => {",
    "    if (!user) {",
    "      toast.error('Usuario no autenticado');",
    "      return;",
    "    }",
    "",
    "    console.log(`🚚 SOLUCIÓN DEFINITIVA - ORDEN: `${orderId}`, NUEVO ESTADO: `${newStatus}`);",
    "    setProcessingOrderId(orderId);",
    "    ",
    "    try {",
    "      // MÉTODO DEFINITIVO: Solo actualización directa, sin RPC functions",
    "      const updateData: any = { ",
    "        status: newStatus,",
    "        updated_at: new Date().toISOString()",
    "      };",
    "      ",
    "      // Agregar campos específicos según el estado",
    "      switch(newStatus) {",
    "        case 'picked_up':",
    "          updateData.picked_up_at = new Date().toISOString();",
    "          console.log('📦 Marcando como RECOGIDO...');",
    "          break;",
    "        case 'in_transit':",
    "          console.log('🚚 Marcando como EN TRÁNSITO...');",
    "          break;",
    "        case 'delivered':",
    "          updateData.delivered_at = new Date().toISOString();",
    "          console.log('✅ Marcando como ENTREGADO...');",
    "          break;",
    "      }",
    "      ",
    "      console.log('📊 Datos de actualización:', updateData);",
    "      console.log('🎯 Filtros: orderId =', orderId, ', driverId =', user.id);",
    "      ",
    "      // ACTUALIZACIÓN DIRECTA DEFINITIVA",
    "      const { data, error } = await supabase",
    "        .from('orders')",
    "        .update(updateData)",
    "        .eq('id', orderId)",
    "        .eq('driver_id', user.id)",
    "        .select('id, status, picked_up_at, delivered_at, updated_at');",
    "",
    "      if (error) {",
    "        console.error('❌ ERROR DE BASE DE DATOS:', error);",
    "        toast.error(`Error: `${error.message}`);",
    "        return;",
    "      }",
    "",
    "      if (!data || data.length === 0) {",
    "        console.error('❌ ORDEN NO ENCONTRADA O SIN PERMISOS');",
    "        toast.error('La orden no existe o no tienes permisos para actualizarla');",
    "        return;",
    "      }",
    "",
    "      const updatedOrder = data[0];",
    "      console.log('✅ ORDEN ACTUALIZADA EXITOSAMENTE:', updatedOrder);",
    "      ",
    "      // Mensajes de éxito específicos",
    "      const messages: Record<string, string> = {",
    "        'picked_up': '📦 Pedido RECOGIDO exitosamente',",
    "        'in_transit': '🚚 Pedido EN TRÁNSITO al cliente',",
    "        'delivered': '✅ Pedido ENTREGADO exitosamente'",
    "      };",
    "      ",
    "      const message = messages[newStatus] || 'Estado actualizado';",
    "      toast.success(message);",
    "      console.log(`🎉 `${message.toUpperCase()}`);",
    "      ",
    "      // Refrescar datos del dashboard",
    "      console.log('🔄 Actualizando vista del dashboard...');",
    "      await fetchData();",
    "      ",
    "      console.log('🏁 PROCESO COMPLETADO - SOLUCIÓN DEFINITIVA FUNCIONANDO');",
    "",
    "    } catch (error: any) {",
    "      console.error('💥 ERROR CRÍTICO:', error);",
    "      toast.error(`Error crítico: `${error?.message || 'Error desconocido'}`);",
    "    } finally {",
    "      setProcessingOrderId(null);",
    "    }",
    "  };"
)

# Crear backup
$backupPath = $filePath + ".backup." + (Get-Date -Format "yyyyMMdd_HHmmss")
Copy-Item $filePath $backupPath
Write-Host "💾 Backup creado: $backupPath" -ForegroundColor Cyan

# Construir el nuevo archivo
$newContent = @()
$newContent += $lines[0..($startIndex - 1)]  # Líneas antes de la función
$newContent += $newFunction                    # Nueva función
$newContent += $lines[($endIndex + 1)..($lines.Count - 1)]  # Líneas después de la función

# Escribir el archivo actualizado
$newContent | Out-File $filePath -Encoding UTF8

Write-Host "✅ FUNCIÓN REEMPLAZADA EXITOSAMENTE" -ForegroundColor Green
Write-Host "🎉 SOLUCIÓN DEFINITIVA APLICADA CORRECTAMENTE" -ForegroundColor Green
Write-Host ""
Write-Host "📋 PRÓXIMOS PASOS:" -ForegroundColor Cyan
Write-Host "   1. Recarga la página del repartidor (F5)" -ForegroundColor White
Write-Host "   2. Prueba los botones:" -ForegroundColor White
Write-Host "      • 'Marcar recogido'" -ForegroundColor Yellow
Write-Host "      • 'En tránsito'" -ForegroundColor Yellow
Write-Host "      • 'Entregado'" -ForegroundColor Yellow
Write-Host "   3. ¡Deberían funcionar perfectamente!" -ForegroundColor White
Write-Host ""
Write-Host "🏁 ¡TU APP ESTÁ LISTA PARA AYUDAR A TU COMUNIDAD!" -ForegroundColor Green
