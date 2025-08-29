const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://gxdibtqhvwohpqxpcsaa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZGlidHFodndvaHBxeHBjc2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEwMDY3ODIsImV4cCI6MjA0NjU4Mjc4Mn0.d9-E8QfOtPDtHgaYKoIFSNjRFUGq7nqXa8VmNQB5H4I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executePhoneSetup() {
  try {
    console.log('📱 Ejecutando setup de teléfono obligatorio...');
    
    // Verificar conexión primero
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (testError) {
      console.error('❌ Error de conexión:', testError.message);
      return;
    }
    
    console.log('✅ Conexión a Supabase exitosa');
    
    // Leer el script SQL
    const sqlScript = fs.readFileSync('./database/MAKE_PHONE_REQUIRED.sql', 'utf8');
    
    // Intentar ejecutar usando rpc si está disponible
    try {
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql: sqlScript 
      });
      
      if (error) {
        throw error;
      }
      
      console.log('✅ Script SQL ejecutado exitosamente usando RPC');
      
    } catch (rpcError) {
      console.log('⚠️ RPC no disponible, intentando método alternativo...');
      
      // Método alternativo: ejecutar usando _sql_exec
      const { data, error } = await supabase
        .from('_sql_exec')
        .insert({ query: sqlScript });
      
      if (error) {
        throw error;
      }
      
      console.log('✅ Script SQL ejecutado exitosamente usando método alternativo');
    }
    
    console.log('🎯 Configuración completada:');
    console.log('   ✅ Teléfono ahora es obligatorio para nuevos usuarios');
    console.log('   ✅ Constraint único agregado para teléfonos');
    console.log('   ✅ Formateo automático +502 activado');
    console.log('   ✅ Usuarios existentes no afectados');
    console.log('');
    console.log('📱 Funcionamiento:');
    console.log('   👤 Usuario ingresa: 12345678');
    console.log('   💾 Sistema guarda: +50212345678');
    console.log('   🔒 Validación: Exactamente 8 dígitos');
    
  } catch (err) {
    console.error('❌ Error ejecutando setup:', err.message);
    console.log('');
    console.log('📝 INSTRUCCIONES MANUALES:');
    console.log('1. Ve a: https://supabase.com/dashboard/project/gxdibtqhvwohpqxpcsaa/sql');
    console.log('2. Abre el archivo: database/MAKE_PHONE_REQUIRED.sql');
    console.log('3. Copia TODO el contenido');
    console.log('4. Pégalo en el SQL Editor');
    console.log('5. Haz clic en "RUN" ▶️');
  }
}

executePhoneSetup();
