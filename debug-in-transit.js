// DEBUG ESPECÍFICO PARA BOTÓN "EN TRÁNSITO"
// ==========================================

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

async function debugInTransitButton() {
  console.log('🔍 DEBUGGING BOTÓN "EN TRÁNSITO"')
  console.log('================================')

  try {
    // 1. Verificar si hay órdenes en estado "picked_up" 
    console.log('1. Buscando órdenes en estado "picked_up"...')
    const { data: pickedUpOrders, error: pickedUpError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'picked_up')
      .not('driver_id', 'is', null)

    if (pickedUpError) {
      console.error('❌ Error consultando órdenes picked_up:', pickedUpError)
      return
    }

    console.log(`📦 Órdenes en "picked_up": ${pickedUpOrders?.length || 0}`)
    
    if (pickedUpOrders && pickedUpOrders.length > 0) {
      const testOrder = pickedUpOrders[0]
      console.log('\n📋 ORDEN DE PRUEBA:')
      console.log(`   ID: ${testOrder.id}`)
      console.log(`   Status actual: ${testOrder.status}`)
      console.log(`   Driver ID: ${testOrder.driver_id}`)
      console.log(`   Customer: ${testOrder.customer_name}`)
      console.log(`   Total: $${testOrder.total}`)

      // 2. Intentar actualización de prueba (sin cambiar datos realmente)
      console.log('\n2. Probando actualización a "in_transit"...')
      
      const updateData = {
        status: 'in_transit',
        updated_at: new Date().toISOString(),
        in_transit_at: new Date().toISOString()
      }

      console.log('   Datos a actualizar:', updateData)

      // Intento 1: Actualización con condiciones específicas
      const { data: result1, error: error1 } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', testOrder.id)
        .eq('status', 'picked_up') // Debe estar en picked_up
        .select()

      if (error1) {
        console.error('❌ ERROR en actualización 1:', error1)
        console.error('   Código:', error1.code)
        console.error('   Detalles:', error1.details)
        console.error('   Hint:', error1.hint)
      } else {
        console.log('✅ ACTUALIZACIÓN EXITOSA!')
        console.log('   Resultado:', result1)
        
        // Revertir el cambio para no afectar datos reales
        console.log('\n3. Revirtiendo cambio para no afectar datos...')
        await supabase
          .from('orders')
          .update({
            status: 'picked_up',
            updated_at: new Date().toISOString(),
            in_transit_at: null
          })
          .eq('id', testOrder.id)

        console.log('✅ Cambio revertido')
      }

      // 3. Verificar permisos específicos del usuario
      console.log('\n4. Verificando permisos de usuario...')
      
      // Obtener usuario actual (simulando autenticación)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (user) {
        console.log(`👤 Usuario autenticado: ${user.id}`)
        console.log(`   Email: ${user.email}`)
        
        // Verificar si el usuario es el driver de la orden
        if (user.id === testOrder.driver_id) {
          console.log('✅ Usuario ES el repartidor asignado')
        } else {
          console.log('❌ Usuario NO es el repartidor asignado')
          console.log(`   User ID: ${user.id}`)
          console.log(`   Driver ID: ${testOrder.driver_id}`)
        }
      } else {
        console.log('❌ Usuario NO autenticado')
      }

    } else {
      console.log('⚠️  No hay órdenes en estado "picked_up" para probar')
      
      // Crear una orden de prueba
      console.log('\n📝 Creando orden de prueba...')
      const testOrderData = {
        customer_name: 'Test Customer',
        total: 100,
        status: 'picked_up',
        delivery_type: 'delivery',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        picked_up_at: new Date().toISOString()
      }

      const { data: newOrder, error: createError } = await supabase
        .from('orders')
        .insert([testOrderData])
        .select()

      if (createError) {
        console.error('❌ Error creando orden de prueba:', createError)
      } else {
        console.log('✅ Orden de prueba creada:', newOrder)
      }
    }

    // 4. Verificar estructura de la tabla
    console.log('\n5. Verificando estructura de tabla orders...')
    const { data: columns, error: structureError } = await supabase
      .rpc('get_table_columns', { table_name: 'orders' })

    if (!structureError && columns) {
      console.log('📋 Columnas de la tabla orders:')
      columns.forEach((col) => {
        console.log(`   - ${col.column_name}: ${col.data_type}`)
      })
    } else {
      console.log('⚠️  No se pudo obtener estructura de tabla')
    }

    // 5. Verificar triggers y constraints
    console.log('\n6. Verificando constraints de status...')
    const { data: constraints, error: constraintError } = await supabase
      .from('information_schema.check_constraints')
      .select('*')
      .ilike('constraint_name', '%status%')

    if (!constraintError && constraints) {
      console.log('🔒 Constraints de status encontrados:')
      constraints.forEach((constraint) => {
        console.log(`   - ${constraint.constraint_name}: ${constraint.check_clause}`)
      })
    }

  } catch (error) {
    console.error('❌ Error general en debug:', error)
  }

  console.log('\n🔚 DEBUG COMPLETADO')
}

// Ejecutar debug
debugInTransitButton()
  .then(() => {
    console.log('\n✅ Debug completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error en debug:', error)
    process.exit(1)
  })
