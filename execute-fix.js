// Script para ejecutar el fix de la función GPS
import fs from 'fs';

// Leer el SQL
const sqlContent = fs.readFileSync('FIX_UPDATE_DRIVER_LOCATION.sql', 'utf8');

console.log('📄 Contenido del archivo FIX_UPDATE_DRIVER_LOCATION.sql:');
console.log('='.repeat(60));
console.log(sqlContent);
console.log('='.repeat(60));
console.log('\n🔧 INSTRUCCIONES:');
console.log('1. Copia el contenido SQL mostrado arriba');
console.log('2. Ve a https://supabase.com/dashboard/project/olidxbacfxrijmmtpcoy/sql');
console.log('3. Pega el SQL en el editor y ejecuta');
console.log('4. Esto corregirá la función update_driver_location');
