// BUSCAR ESTRUCTURA DE TABLAS Y CREAR ORDEN DE PRUEBA
// ==================================================

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function exploreAndCreateTest() {
  console.log('🔍 EXPLORANDO BASE DE DATOS')
  console.log('============================')

  try {
    // 1. Buscar órdenes existentes para entender la estructura
    console.log('1. Buscando órdenes existentes...')
    const { data: existingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(3)

    if (ordersError) {
      console.log('❌ Error consultando órdenes:', ordersError.message)
    } else {
      console.log(`📦 ${existingOrders?.length || 0} órdenes encontradas`)
      if (existingOrders && existingOrders.length > 0) {
        console.log('📋 Estructura de primera orden:')
        console.log(JSON.stringify(existingOrders[0], null, 2))
      }
    }

    // 2. Buscar usuarios/drivers en diferentes tablas posibles
    console.log('\n2. Buscando usuarios/drivers...')
    
    const tablesToCheck = ['users', 'drivers', 'sellers', 'auth.users']
    
    for (const table of tablesToCheck) {
      console.log(`   Probando tabla: ${table}`)
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)

        if (!error && data && data.length > 0) {
          console.log(`   ✅ ${table}: ${data.length} registros encontrados`)
          console.log(`   📄 Estructura:`, Object.keys(data[0]))
        }
      } catch (err) {
        console.log(`   ❌ ${table}: no accesible`)
      }
    }

    // 3. Intentar crear orden de prueba directamente con IDs reales si encontramos alguno
    console.log('\n3. Intentando crear orden de prueba...')
    
    // Usar un ID genérico para el driver (usualmente UUID)
    const driverIds = [
      '00000000-0000-0000-0000-000000000001',
      '11111111-1111-1111-1111-111111111111',
      'test-driver-id'
    ]

    for (const driverId of driverIds) {
      console.log(`   Probando con driver_id: ${driverId}`)
      
      const testOrder = {
        customer_name: 'Test Customer - In Transit Bug',
        customer_phone: '+506 1234-5678',
        delivery_address: 'Test Address, San José, Costa Rica',
        total: 25000,
        delivery_fee: 3500,
        status: 'picked_up',
        delivery_type: 'delivery',
        driver_id: driverId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        picked_up_at: new Date().toISOString(),
        estimated_delivery: new Date(Date.now() + 30 * 60000).toISOString()
      }

      const { data: newOrder, error: createError } = await supabase
        .from('orders')
        .insert([testOrder])
        .select()

      if (!createError && newOrder) {
        console.log('✅ ORDEN CREADA EXITOSAMENTE!')
        console.log('📋 Detalles de la orden:')
        console.log(`   ID: ${newOrder[0].id}`)
        console.log(`   Status: ${newOrder[0].status}`)
        console.log(`   Driver: ${newOrder[0].driver_id}`)
        console.log(`   Customer: ${newOrder[0].customer_name}`)
        console.log('')
        console.log('🎯 PRÓXIMOS PASOS:')
        console.log('1. Ve al dashboard del repartidor')
        console.log('2. Busca esta orden en la sección "Entregas Activas"')
        console.log('3. Haz clic en el botón "Marcar en tránsito"')
        console.log('4. Verifica si funciona correctamente')
        console.log('')
        console.log('🗑️  Para eliminar esta orden de prueba después, ejecuta:')
        console.log(`   DELETE FROM orders WHERE id = '${newOrder[0].id}';`)
        break
      } else {
        console.log(`   ❌ Error: ${createError?.message}`)
      }
    }

    // 4. SQL manual si todo falla
    console.log('\n4. Si nada funcionó, usa este SQL directamente en Supabase:')
    console.log('========================================================')
    console.log(`
-- Crear orden de prueba manualmente
INSERT INTO orders (
  customer_name, customer_phone, delivery_address, 
  total, delivery_fee, status, delivery_type,
  created_at, updated_at, picked_up_at, estimated_delivery
) VALUES (
  'Test Customer - In Transit',
  '+506 8888-8888',
  'Test Address, San José',
  25000,
  3500,
  'picked_up',
  'delivery',
  NOW(),
  NOW(),
  NOW(),
  NOW() + INTERVAL '30 minutes'
);

-- Ver la orden creada
SELECT * FROM orders WHERE customer_name = 'Test Customer - In Transit';
    `)

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

exploreAndCreateTest()
  .then(() => {
    console.log('\n✅ Exploración completada')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
