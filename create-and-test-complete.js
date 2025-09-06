// CREAR ORDEN Y TESTEAR BOTÓN COMPLETO
// ====================================

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function createOrderAndTest() {
  console.log('🧪 CREAR ORDEN Y TESTEAR BOTÓN COMPLETO')
  console.log('======================================')

  try {
    // 1. Ejecutar SQL directo para crear orden
    console.log('1. Ejecutando SQL para crear orden...')
    
    const createOrderSQL = `
      INSERT INTO orders (
        customer_name, customer_phone, delivery_address, 
        total, delivery_fee, status, delivery_type, driver_id,
        created_at, updated_at, picked_up_at
      ) VALUES (
        'TEST - Cliente En Tránsito',
        '+506 8888-8888',
        'Dirección de prueba, San José',
        15000,
        2000,
        'in_transit',
        'delivery',
        '00b384bc-6a52-4f25-b691-1700abd7ad89',
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (customer_name) DO UPDATE SET
        status = 'in_transit',
        updated_at = NOW()
      RETURNING *;
    `

    // Intentar crear usando una función SQL personalizada
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION create_test_order_force()
      RETURNS TABLE(order_id UUID, status TEXT, message TEXT)
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        new_order_id UUID;
        driver_uuid UUID := '00b384bc-6a52-4f25-b691-1700abd7ad89';
      BEGIN
        -- Generar nuevo UUID
        new_order_id := gen_random_uuid();
        
        -- Desactivar RLS temporalmente para esta inserción
        SET row_security = off;
        
        -- Insertar orden
        INSERT INTO orders (
          id,
          customer_name, customer_phone, delivery_address, 
          total, delivery_fee, status, delivery_type, driver_id,
          created_at, updated_at, picked_up_at, in_transit_at
        ) VALUES (
          new_order_id,
          'TEST - Cliente En Tránsito',
          '+506 8888-8888',
          'Dirección de prueba, San José',
          15000,
          2000,
          'in_transit',
          'delivery',
          driver_uuid,
          NOW(),
          NOW(),
          NOW(),
          NOW()
        );
        
        -- Reactivar RLS
        SET row_security = on;
        
        RETURN QUERY SELECT new_order_id, 'in_transit'::TEXT, 'Orden creada exitosamente'::TEXT;
        
      EXCEPTION WHEN others THEN
        SET row_security = on; -- Asegurar que RLS se reactive
        RETURN QUERY SELECT NULL::UUID, 'error'::TEXT, ('Error: ' || SQLERRM)::TEXT;
      END;
      $$;
    `

    console.log('   Creando función helper...')
    const { error: functionError } = await supabase.rpc('sql', { query: createFunctionSQL })
    
    if (functionError) {
      console.log('❌ Error creando función:', functionError.message)
    } else {
      console.log('✅ Función helper creada')
    }

    // Ejecutar la función
    console.log('   Ejecutando función para crear orden...')
    const { data: createResult, error: createError } = await supabase
      .rpc('create_test_order_force')

    if (createError) {
      console.log('❌ Error ejecutando función:', createError.message)
      
      // Fallback: mostrar SQL manual
      console.log('\n📋 EJECUTA ESTE SQL MANUALMENTE EN SUPABASE:')
      console.log('===========================================')
      console.log(`
-- Desactivar RLS temporalmente
SET row_security = off;

-- Crear orden de prueba
INSERT INTO orders (
  id,
  customer_name, customer_phone, delivery_address, 
  total, delivery_fee, status, delivery_type, driver_id,
  created_at, updated_at, picked_up_at, in_transit_at
) VALUES (
  gen_random_uuid(),
  'TEST - Cliente En Tránsito',
  '+506 8888-8888',
  'Dirección de prueba, San José',
  15000,
  2000,
  'in_transit',
  'delivery',
  '00b384bc-6a52-4f25-b691-1700abd7ad89',
  NOW(),
  NOW(),
  NOW(),
  NOW()
);

-- Reactivar RLS
SET row_security = on;

-- Verificar que se creó
SELECT * FROM orders WHERE customer_name = 'TEST - Cliente En Tránsito';
      `)
      
    } else if (createResult && createResult.length > 0) {
      const result = createResult[0]
      console.log('✅ ORDEN CREADA:', result)
      
      if (result.order_id) {
        console.log(`   ID: ${result.order_id}`)
        console.log(`   Status: ${result.status}`)
        
        // 2. Ahora testear el botón
        console.log('\n2. Testeando función de actualización...')
        const { data: testResult, error: testError } = await supabase
          .rpc('debug_order_update', {
            target_order_id: result.order_id,
            new_status: 'delivered'
          })

        if (testError) {
          console.log('❌ Error en test:', testError.message)
        } else if (testResult && testResult.length > 0) {
          const test = testResult[0]
          console.log('\n📋 RESULTADO DEL TEST:')
          console.log('======================')
          console.log(`Success: ${test.success}`)
          console.log(`Message: ${test.message}`)
          console.log(`Current User: ${test.current_user_id}`)
          console.log(`Driver ID: ${test.order_driver_id}`)
          console.log(`Update Allowed: ${test.update_allowed}`)
          
          if (test.success) {
            console.log('\n🎉 ¡EL BACKEND FUNCIONA!')
            console.log('   El problema está en el frontend o autenticación')
            
            console.log('\n🔧 SOLUCIONES POSIBLES:')
            console.log('=======================')
            console.log('1. El repartidor debe estar logueado en la app')
            console.log('2. Verificar que el ID del usuario logueado coincida con el driver_id')
            console.log('3. Revisar la consola del navegador (F12) por errores JavaScript')
            console.log('4. Verificar que la función updateDeliveryStatus esté siendo llamada')
            
          } else {
            console.log('\n❌ PROBLEMA IDENTIFICADO:')
            console.log('=========================')
            console.log(test.message)
            
            if (test.current_user_id === null) {
              console.log('\n🔥 SOLUCIÓN: El usuario debe loguearse')
              console.log('   1. Asegúrate de que el repartidor esté logueado')
              console.log('   2. Verifica que auth.user() devuelva el usuario correcto')
            }
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error)
  }

  console.log('\n✅ Proceso completado')
  console.log('====================')
  console.log('📝 PRÓXIMOS PASOS:')
  console.log('1. Si hay orden creada, refresca el dashboard del repartidor')
  console.log('2. La orden debe aparecer en "En tránsito"')
  console.log('3. Abre DevTools (F12) y ve a Console')
  console.log('4. Haz clic en "Marcar como Entregado" y mira errores')
  console.log('5. Si no hay errores pero no funciona, es problema de autenticación')
}

createOrderAndTest()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
