const fs = require('fs');

const filePath = 'components/SellerDashboard.tsx';

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove the import line
  content = content.replace(/import \{ NotificationPermissionManager \} from '\.\/ui\/NotificationPermissionManager';\n?/g, '');
  
  // Remove the component usage
  const componentUsagePattern = /\s*{\/\* [^*]*GESTOR DE PERMISOS[^*]*\*\/}\s*<div className="container mx-auto px-4 pt-4">\s*<NotificationPermissionManager[^>]*>\s*<\/NotificationPermissionManager>\s*<\/div>\s*/gs;
  content = content.replace(componentUsagePattern, '\n      ');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Archivo SellerDashboard.tsx limpiado exitosamente');
} catch (error) {
  console.error('❌ Error:', error.message);
}
