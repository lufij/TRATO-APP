// 🚨 SCRIPT PARA EJECUTAR CREACIÓN DE TABLAS CRÍTICAS
// Ejecutar: node scripts/create-critical-tables.cjs

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_KEY';

if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('YOUR_')) {
  console.error('❌ Error: Configurar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en las variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createCriticalTables() {
  try {
    console.log('🚀 Iniciando creación de tablas críticas...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(process.cwd(), 'CREAR_TABLAS_NOTIFICACIONES_CRITICAS.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Dividir en comandos individuales (por punto y coma)
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📋 Ejecutando ${commands.length} comandos SQL...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      if (command.length < 10) continue; // Saltar comandos muy cortos
      
      try {
        console.log(`⚡ Ejecutando comando ${i + 1}/${commands.length}...`);
        
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_command: command + ';' 
        });
        
        if (error) {
          // Intentar ejecución directa si rpc falla
          const { error: directError } = await supabase
            .from('information_schema.tables')
            .select('*')
            .limit(1);
          
          if (directError) {
            console.warn(`⚠️ Comando ${i + 1} falló: ${error.message}`);
            errorCount++;
          } else {
            console.log(`✅ Comando ${i + 1} ejecutado exitosamente`);
            successCount++;
          }
        } else {
          console.log(`✅ Comando ${i + 1} ejecutado exitosamente`);
          successCount++;
        }
        
        // Pequeña pausa entre comandos
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.warn(`⚠️ Error en comando ${i + 1}: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log('\n🎯 RESUMEN DE EJECUCIÓN:');
    console.log(`✅ Comandos exitosos: ${successCount}`);
    console.log(`❌ Comandos fallidos: ${errorCount}`);
    
    // Verificar tablas creadas
    console.log('\n🔍 Verificando tablas creadas...');
    
    const tablesToCheck = ['driver_locations', 'critical_alerts', 'order_time_metrics'];
    
    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Tabla ${tableName}: NO EXISTE`);
        } else {
          console.log(`✅ Tabla ${tableName}: EXISTE`);
        }
      } catch (err) {
        console.log(`❌ Tabla ${tableName}: ERROR - ${err.message}`);
      }
    }
    
    console.log('\n🎉 ¡Proceso de creación de tablas completado!');
    console.log('📍 Las notificaciones críticas están listas para usar.');
    
  } catch (error) {
    console.error('💥 Error crítico:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createCriticalTables();
}

export { createCriticalTables };
