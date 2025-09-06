// DEBUG ESPECÍFICO DEL BOTÓN ENTREGADO
// ====================================

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugDeliveredButton() {
  console.log('🔍 DEBUG ESPECÍFICO BOTÓN "ENTREGADO"')
  console.log('=====================================')

  try {
    // 1. Buscar la orden de prueba
    console.log('1. Buscando orden de prueba...')
    const { data: testOrders, error: findError } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_name', 'TEST - Cliente En Tránsito')

    if (findError) {
      console.error('❌ Error buscando orden:', findError.message)
      return
    }

    if (!testOrders || testOrders.length === 0) {
      console.log('❌ No se encontró orden de prueba')
      console.log('   Ejecuta primero el script de creación de orden')
      return
    }

    const testOrder = testOrders[0]
    console.log('✅ Orden de prueba encontrada:')
    console.log(`   ID: ${testOrder.id}`)
    console.log(`   Status: ${testOrder.status}`)
    console.log(`   Driver ID: ${testOrder.driver_id}`)
    console.log(`   Customer: ${testOrder.customer_name}`)

    // 2. Ejecutar la función de debug
    console.log('\n2. Ejecutando debug de actualización...')
    const { data: debugResult, error: debugError } = await supabase
      .rpc('debug_order_update', {
        target_order_id: testOrder.id,
        new_status: 'delivered',
        target_driver_id: testOrder.driver_id
      })

    if (debugError) {
      console.error('❌ Error en debug function:', debugError.message)
      console.log('   Código:', debugError.code)
      console.log('   Detalles:', debugError.details)
      return
    }

    if (debugResult && debugResult.length > 0) {
      const result = debugResult[0]
      console.log('\n📋 RESULTADO DEL DEBUG:')
      console.log('========================')
      console.log(`✅ Success: ${result.success}`)
      console.log(`📝 Message: ${result.message}`)
      console.log(`👤 Current User ID: ${result.current_user_id}`)
      console.log(`🚚 Order Driver ID: ${result.order_driver_id}`)
      console.log(`📊 Current Status: ${result.order_current_status}`)
      console.log(`🔐 Update Allowed: ${result.update_allowed}`)

      // 3. Análisis del resultado
      console.log('\n🔍 ANÁLISIS:')
      console.log('============')
      
      if (result.success) {
        console.log('🎉 ¡LA ACTUALIZACIÓN FUNCIONÓ!')
        console.log('   El problema puede ser en el frontend')
        
        // Verificar si realmente se actualizó
        console.log('\n4. Verificando actualización en DB...')
        const { data: updatedOrder } = await supabase
          .from('orders')
          .select('*')
          .eq('id', testOrder.id)
          .single()

        if (updatedOrder) {
          console.log(`   Status después del update: ${updatedOrder.status}`)
          console.log(`   Delivered at: ${updatedOrder.delivered_at}`)
        }
        
      } else {
        console.log('❌ LA ACTUALIZACIÓN FALLÓ')
        
        if (result.current_user_id === null) {
          console.log('🔥 PROBLEMA: Usuario no autenticado')
          console.log('   El repartidor debe loguearse en la app')
        } else if (result.current_user_id !== result.order_driver_id) {
          console.log('🔥 PROBLEMA: Usuario no es el driver asignado')
          console.log(`   Usuario actual: ${result.current_user_id}`)
          console.log(`   Driver de la orden: ${result.order_driver_id}`)
        } else {
          console.log('🔥 PROBLEMA: ' + result.message)
        }
      }

    } else {
      console.log('❌ No se obtuvo resultado del debug')
    }

    // 4. Crear SQL directo para testing
    console.log('\n📝 SQL DIRECTO PARA TESTING:')
    console.log('=============================')
    console.log(`-- Actualizar orden manualmente:`)
    console.log(`UPDATE orders SET`)
    console.log(`  status = 'delivered',`)
    console.log(`  delivered_at = NOW(),`)
    console.log(`  updated_at = NOW()`)
    console.log(`WHERE id = '${testOrder.id}';`)
    console.log(``)
    console.log(`-- Verificar cambio:`)
    console.log(`SELECT id, status, delivered_at FROM orders WHERE id = '${testOrder.id}';`)
    
    // 5. Si no funciona, crear orden con status in_transit
    if (testOrder.status !== 'in_transit') {
      console.log('\n🔄 PREPARANDO ORDEN PARA PRUEBA:')
      console.log('=================================')
      console.log('La orden debe estar en status "in_transit" para poder marcarla como entregada')
      
      const { data: updateResult, error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'in_transit',
          in_transit_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', testOrder.id)
        .select()

      if (updateError) {
        console.log('❌ Error actualizando a in_transit:', updateError.message)
        console.log('\n📝 Ejecuta este SQL manualmente:')
        console.log(`UPDATE orders SET status = 'in_transit', in_transit_at = NOW() WHERE id = '${testOrder.id}';`)
      } else {
        console.log('✅ Orden actualizada a "in_transit"')
        console.log('   Ahora refresca la página y prueba el botón verde')
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error)
  }

  console.log('\n🔚 DEBUG COMPLETADO')
  console.log('===================')
  console.log('💡 PRÓXIMO PASO:')
  console.log('   1. Refresca la página del repartidor')
  console.log('   2. Asegúrate de que la orden esté en "En tránsito"')
  console.log('   3. Haz clic en el botón verde "Marcar como Entregado"')
  console.log('   4. Abre DevTools (F12) y mira la consola por errores')
}

debugDeliveredButton()
  .then(() => {
    console.log('\n✅ Debug completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
