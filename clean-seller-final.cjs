const fs = require('fs');

try {
  let content = fs.readFileSync('components/SellerDashboard.tsx', 'utf8');
  
  // Split into lines
  const lines = content.split('\n');
  
  // Find the problematic section and remove it
  const newLines = [];
  let skipMode = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Start skipping at comment line
    if (line.includes('GESTOR DE PERMISOS')) {
      skipMode = true;
      continue;
    }
    
    // Skip NotificationPermissionManager lines
    if (line.includes('NotificationPermissionManager')) {
      continue;
    }
    
    // Skip div container that wraps it
    if (skipMode && line.includes('<div className="container mx-auto px-4 pt-4">')) {
      continue;
    }
    
    // Skip permission change handler
    if (skipMode && line.includes('onPermissionChange')) {
      continue;
    }
    
    // Skip console.log line
    if (skipMode && line.includes('console.log') && line.includes('Permisos de notificación')) {
      continue;
    }
    
    // Skip function closing
    if (skipMode && line.includes('}}')) {
      continue;
    }
    
    // Skip component closing
    if (skipMode && line.includes('/>') && !line.includes('NotificationSystem')) {
      continue;
    }
    
    // Skip div closing
    if (skipMode && line.trim() === '</div>') {
      skipMode = false;
      continue;
    }
    
    // Keep all other lines
    newLines.push(line);
  }
  
  const cleanedContent = newLines.join('\n');
  fs.writeFileSync('components/SellerDashboard.tsx', cleanedContent, 'utf8');
  
  console.log('✅ SellerDashboard.tsx limpiado exitosamente');
  console.log(`Líneas reducidas de ${lines.length} a ${newLines.length}`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
