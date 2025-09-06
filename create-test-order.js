// CREAR ORDEN DE PRUEBA PARA TESTING
// ==================================

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan credenciales de Supabase en .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTestOrder() {
  console.log('🧪 CREANDO ORDEN DE PRUEBA')
  console.log('===========================')

  try {
    // 1. Primero obtener el usuario autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log('❌ Usuario no autenticado, usando usuario anónimo')
      
      // Intentar autenticar con email y contraseña (si los tienes)
      console.log('🔐 Intentando autenticación...')
      
      // Como no tenemos credenciales, vamos a buscar un usuario driver existente
      const { data: drivers, error: driversError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver')
        .limit(1)

      if (driversError) {
        console.error('❌ Error buscando repartidores:', driversError)
        return
      }

      if (drivers && drivers.length > 0) {
        console.log('👤 Repartidor encontrado:', drivers[0])
        
        // Crear orden directamente con bypass de RLS usando servicio admin
        const adminSupabase = createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: false
          }
        })

        const testOrderData = {
          id: crypto.randomUUID(),
          customer_name: 'Cliente de Prueba - In Transit',
          customer_phone: '+506 8888-8888',
          delivery_address: 'Dirección de prueba, San José',
          total: 15000,
          status: 'picked_up',
          delivery_type: 'delivery',
          driver_id: drivers[0].id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          picked_up_at: new Date().toISOString(),
          delivery_fee: 2000,
          estimated_delivery: new Date(Date.now() + 30 * 60000).toISOString()
        }

        console.log('📝 Creando orden con datos:', testOrderData)

        // Intentar inserción con diferentes enfoques
        console.log('🔄 Intento 1: Inserción directa...')
        const { data: order1, error: error1 } = await supabase
          .from('orders')
          .insert([testOrderData])
          .select()

        if (error1) {
          console.log('❌ Intento 1 falló:', error1.message)
          
          console.log('🔄 Intento 2: Usar RPC function...')
          const { data: order2, error: error2 } = await supabase
            .rpc('create_test_order', {
              order_data: testOrderData
            })

          if (error2) {
            console.log('❌ Intento 2 falló:', error2.message)
            
            console.log('📋 INSTRUCCIONES MANUALES:')
            console.log('==========================')
            console.log('Para crear la orden de prueba manualmente, ejecuta en el SQL Editor de Supabase:')
            console.log('')
            console.log('INSERT INTO orders (')
            console.log('  id, customer_name, customer_phone, delivery_address,')
            console.log('  total, status, delivery_type, driver_id,')
            console.log('  created_at, updated_at, picked_up_at, delivery_fee, estimated_delivery')
            console.log(') VALUES (')
            console.log(`  '${testOrderData.id}',`)
            console.log(`  '${testOrderData.customer_name}',`)
            console.log(`  '${testOrderData.customer_phone}',`)
            console.log(`  '${testOrderData.delivery_address}',`)
            console.log(`  ${testOrderData.total},`)
            console.log(`  '${testOrderData.status}',`)
            console.log(`  '${testOrderData.delivery_type}',`)
            console.log(`  '${testOrderData.driver_id}',`)
            console.log(`  '${testOrderData.created_at}',`)
            console.log(`  '${testOrderData.updated_at}',`)
            console.log(`  '${testOrderData.picked_up_at}',`)
            console.log(`  ${testOrderData.delivery_fee},`)
            console.log(`  '${testOrderData.estimated_delivery}'`)
            console.log(');')
            console.log('')
            console.log('Después de crear la orden, podrás probar el botón "En tránsito" en el dashboard del repartidor.')

          } else {
            console.log('✅ Orden creada exitosamente con RPC:', order2)
          }

        } else {
          console.log('✅ Orden creada exitosamente:', order1)
        }

      } else {
        console.log('❌ No se encontraron repartidores en la base de datos')
      }

    } else {
      console.log('✅ Usuario autenticado:', user.email)
    }

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar
createTestOrder()
  .then(() => {
    console.log('\n✅ Proceso completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
