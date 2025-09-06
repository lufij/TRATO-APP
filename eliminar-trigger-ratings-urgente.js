// 🚨 SCRIPT URGENTE: Eliminar trigger problemático de ratings
// Este script ejecuta SQL directamente para eliminar el trigger que causa errores RLS

import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://deadqlydodqcublfed.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRxbHlkb2RxY3VibGZlZCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3MjQzNTc4ODYsImV4cCI6MjAzOTkzMzg4Nn0.kKyWG7qhDx-B-5bOQx_J9EH8C7Lp_1NeNxl9Jq2T9J8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function eliminarTriggerProblematico() {
  console.log('🚨 ELIMINANDO TRIGGER PROBLEMÁTICO...');
  
  try {
    // 1. Verificar si existe el trigger
    console.log('1️⃣ Verificando si el trigger existe...');
    const { data: triggerCheck, error: checkError } = await supabase.rpc('sql', {
      query: `
        SELECT 
          trigger_name, 
          event_manipulation, 
          action_timing, 
          action_statement
        FROM information_schema.triggers 
        WHERE trigger_name = 'trigger_create_pending_ratings'
          AND event_object_table = 'orders';
      `
    });

    if (checkError) {
      console.error('Error verificando trigger:', checkError);
      return;
    }

    if (triggerCheck && triggerCheck.length > 0) {
      console.log('✅ Trigger encontrado:', triggerCheck[0]);
      
      // 2. Eliminar el trigger
      console.log('2️⃣ Eliminando trigger problemático...');
      const { error: dropError } = await supabase.rpc('sql', {
        query: 'DROP TRIGGER IF EXISTS trigger_create_pending_ratings ON orders;'
      });

      if (dropError) {
        console.error('❌ Error eliminando trigger:', dropError);
        return;
      }

      console.log('✅ Trigger eliminado exitosamente');

      // 3. Verificar que fue eliminado
      console.log('3️⃣ Verificando eliminación...');
      const { data: verifyCheck, error: verifyError } = await supabase.rpc('sql', {
        query: `
          SELECT count(*) as triggers_restantes
          FROM information_schema.triggers 
          WHERE trigger_name = 'trigger_create_pending_ratings'
            AND event_object_table = 'orders';
        `
      });

      if (!verifyError && verifyCheck) {
        console.log('🔍 Triggers restantes con ese nombre:', verifyCheck[0]?.triggers_restantes || 0);
      }

      console.log('🎉 ¡PROBLEMA RESUELTO! El botón "Marcar como Entregado" debería funcionar ahora.');
      
    } else {
      console.log('⚠️ El trigger no existe o ya fue eliminado previamente');
    }

    // 4. Mostrar todos los triggers restantes en orders
    console.log('4️⃣ Mostrando triggers restantes en tabla orders...');
    const { data: remainingTriggers, error: remainingError } = await supabase.rpc('sql', {
      query: `
        SELECT 
          trigger_name, 
          event_manipulation, 
          action_timing
        FROM information_schema.triggers 
        WHERE event_object_table = 'orders'
        ORDER BY trigger_name;
      `
    });

    if (!remainingError && remainingTriggers) {
      console.log('📋 Triggers restantes en tabla orders:');
      remainingTriggers.forEach((trigger, index) => {
        console.log(`  ${index + 1}. ${trigger.trigger_name} (${trigger.action_timing} ${trigger.event_manipulation})`);
      });
    }

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

// Ejecutar inmediatamente
eliminarTriggerProblematico();
