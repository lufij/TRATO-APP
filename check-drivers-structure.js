// 🔍 VERIFICAR ESTRUCTURA DE TABLA DRIVERS
// Ejecutar en la consola del navegador para ver las columnas reales

console.log('🔍 Verificando estructura de tabla drivers...');

if (typeof supabase !== 'undefined') {
  // Obtener un registro para ver la estructura
  supabase.from('drivers').select('*').limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.log('❌ Error obteniendo estructura:', error.message);
      } else {
        console.log('✅ Estructura de drivers encontrada:');
        if (data && data.length > 0) {
          const columns = Object.keys(data[0]);
          console.log('📋 Columnas disponibles:', columns);
          
          // Verificar columnas específicas que necesitamos
          const requiredColumns = ['is_online', 'is_active', 'is_verified', 'active'];
          console.log('\\n🔍 Verificando columnas necesarias:');
          
          requiredColumns.forEach(col => {
            const exists = columns.includes(col);
            console.log(`  ${col}: ${exists ? '✅ EXISTE' : '❌ NO EXISTE'}`);
          });
          
          console.log('\\n📊 Datos del registro:');
          console.log(data[0]);
          
        } else {
          console.log('⚠️ No hay registros para verificar estructura');
          
          // Intentar crear un driver de prueba para ver qué columnas acepta
          console.log('\\n🧪 Probando insertar registro de prueba...');
          
          // NO ejecutar, solo mostrar lo que se necesitaría
          console.log('Para verificar estructura, ejecuta en Supabase SQL:');
          console.log('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'drivers\';');
        }
      }
    });
} else {
  console.log('❌ Supabase no disponible en consola');
  console.log('Ejecuta este script en el dashboard de la aplicación web');
}
