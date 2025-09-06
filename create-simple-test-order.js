// CREAR ORDEN DE PRUEBA SIMPLIFICADA
// ===================================

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function createSimpleTestOrder() {
  console.log('🧪 CREANDO ORDEN DE PRUEBA SIMPLIFICADA')
  console.log('======================================')

  try {
    // 1. Obtener un driver real
    console.log('1. Buscando driver disponible...')
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select('*')
      .eq('is_active', true)
      .limit(1)

    if (driversError) {
      console.log('❌ Error buscando drivers:', driversError.message)
      return
    }

    if (!drivers || drivers.length === 0) {
      console.log('❌ No hay drivers activos')
      return
    }

    const driver = drivers[0]
    console.log('✅ Driver encontrado:', driver.id)

    // 2. Crear orden simple (solo columnas que sabemos que existen)
    console.log('2. Creando orden de prueba...')
    
    const testOrder = {
      customer_name: 'TEST - Cliente En Tránsito',
      customer_phone: '+506 8888-8888',
      delivery_address: 'Dirección de prueba, San José',
      total: 15000,
      delivery_fee: 2000,
      status: 'picked_up',
      delivery_type: 'delivery',
      driver_id: driver.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      picked_up_at: new Date().toISOString()
    }

    console.log('📝 Datos de la orden:', testOrder)

    const { data: newOrder, error: createError } = await supabase
      .from('orders')
      .insert([testOrder])
      .select()

    if (createError) {
      console.log('❌ Error creando orden:', createError.message)
      console.log('   Código:', createError.code)
      console.log('   Detalles:', createError.details)
      
      // Mostrar SQL manual
      console.log('\n📋 EJECUTA ESTE SQL MANUALMENTE EN SUPABASE:')
      console.log('===========================================')
      console.log(`
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
  'picked_up',
  'delivery',
  '${driver.id}',
  NOW(),
  NOW(),
  NOW()
);

-- Verificar que se creó
SELECT * FROM orders WHERE customer_name = 'TEST - Cliente En Tránsito';
      `)
      
    } else if (newOrder && newOrder.length > 0) {
      const order = newOrder[0]
      console.log('✅ ORDEN CREADA EXITOSAMENTE!')
      console.log(`📋 ID: ${order.id}`)
      console.log(`👤 Customer: ${order.customer_name}`)
      console.log(`📍 Status: ${order.status}`)
      console.log(`🚚 Driver: ${order.driver_id}`)
      
      console.log('\n🎯 PRÓXIMOS PASOS PARA PROBAR:')
      console.log('==============================')
      console.log('1. Abre el dashboard del repartidor en tu navegador')
      console.log('2. Deberías ver esta orden en "Entregas Activas"')
      console.log('3. Haz clic en "Marcar en tránsito" ▶️')
      console.log('4. Verifica si el botón funciona y cambia el estado')
      console.log('5. Revisa la consola del navegador por errores')
      
      console.log('\n🗑️  LIMPIAR DESPUÉS:')
      console.log(`DELETE FROM orders WHERE id = '${order.id}';`)
      
      return order.id
    }

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

createSimpleTestOrder()
  .then((orderId) => {
    if (orderId) {
      console.log(`\n✅ Orden creada: ${orderId}`)
      console.log('🚀 ¡Ahora puedes probar el botón "En tránsito"!')
    }
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
