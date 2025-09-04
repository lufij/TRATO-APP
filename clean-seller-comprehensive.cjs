const fs = require('fs');

const filePath = 'components/SellerDashboard.tsx';

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  console.log('Contenido antes:');
  console.log(content.substring(1180*50, 1200*50)); // Show context
  
  // Simple replacement - remove NotificationPermissionManager import
  const lines = content.split('\n');
  const filteredLines = lines.filter(line => 
    !line.includes('NotificationPermissionManager') && 
    !line.includes('GESTOR DE PERMISOS')
  );
  
  // Also remove the div container
  let inManagerDiv = false;
  const finalLines = [];
  
  for (let i = 0; i < filteredLines.length; i++) {
    const line = filteredLines[i];
    
    if (line.includes('<div className="container mx-auto px-4 pt-4">') && 
        i + 1 < filteredLines.length && filteredLines[i + 1].includes('onPermissionChange')) {
      inManagerDiv = true;
      continue;
    }
    
    if (inManagerDiv && line.includes('</div>')) {
      inManagerDiv = false;
      continue;
    }
    
    if (!inManagerDiv) {
      finalLines.push(line);
    }
  }
  
  const newContent = finalLines.join('\n');
  
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('✅ SellerDashboard.tsx limpiado - eliminadas todas las referencias');
} catch (error) {
  console.error('❌ Error:', error.message);
}
