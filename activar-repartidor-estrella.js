import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables de entorno de Supabase no encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function activarRepartidorEstrella() {
  console.log('🚀 ACTIVANDO REPARTIDOR ESTRELLA...')
  console.log('=' .repeat(50))
  
  const repartidorId = 'f574d364-3b5c-45e0-a0d0-a8a60cbca510'
  
  try {
    // Mostrar estado actual
    console.log('\n📋 ESTADO ACTUAL:')
    const { data: before, error: beforeError } = await supabase
      .from('drivers')
      .select('id, is_online, is_active, is_verified')
      .eq('id', repartidorId)
      .single()
    
    if (beforeError) {
      console.log('❌ Error obteniendo estado actual:', beforeError.message)
      return
    }
    
    console.log(`   is_online: ${before.is_online}`)
    console.log(`   is_active: ${before.is_active}`)  
    console.log(`   is_verified: ${before.is_verified}`)
    
    // Activar repartidor
    console.log('\n🔧 ACTIVANDO REPARTIDOR...')
    const { data: updated, error: updateError } = await supabase
      .from('drivers')
      .update({
        is_online: true,
        is_active: true,
        is_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', repartidorId)
      .select()
      .single()
    
    if (updateError) {
      console.log('❌ Error activando repartidor:', updateError.message)
      return
    }
    
    console.log('✅ Repartidor activado exitosamente!')
    
    // Mostrar estado después
    console.log('\n📋 ESTADO DESPUÉS:')
    const { data: after, error: afterError } = await supabase
      .from('drivers')
      .select('id, is_online, is_active, is_verified')
      .eq('id', repartidorId)
      .single()
    
    if (afterError) {
      console.log('❌ Error obteniendo estado final:', afterError.message)
      return
    }
    
    console.log(`   is_online: ${after.is_online}`)
    console.log(`   is_active: ${after.is_active}`)  
    console.log(`   is_verified: ${after.is_verified}`)
    
    // Verificar contador total
    console.log('\n🟢 VERIFICANDO CONTADOR DEL INDICADOR:')
    const { count, error: countError } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .eq('is_online', true)
      .eq('is_active', true)
      .eq('is_verified', true)
    
    if (countError) {
      console.log('❌ Error verificando contador:', countError.message)
    } else {
      console.log(`✅ REPARTIDORES QUE APARECERÁN EN INDICADOR VERDE: ${count}`)
      console.log(`   (Ahora debería mostrar 2 en lugar de 1)`)
    }
    
    // Mostrar ambos repartidores activos
    console.log('\n👥 REPARTIDORES ACTIVOS EN EL SISTEMA:')
    const { data: allActive, error: allActiveError } = await supabase
      .from('drivers')
      .select(`
        id,
        is_online, 
        is_active, 
        is_verified,
        users (name, phone)
      `)
      .eq('is_online', true)
      .eq('is_active', true)
      .eq('is_verified', true)
    
    if (allActiveError) {
      console.log('❌ Error obteniendo repartidores activos:', allActiveError.message)
    } else if (allActive && allActive.length > 0) {
      allActive.forEach((driver, index) => {
        const userName = driver.users ? driver.users.name : 'Nombre no disponible'
        const userPhone = driver.users ? driver.users.phone : 'Teléfono no disponible'
        console.log(`   ${index + 1}. ${userName} (${userPhone})`)
        console.log(`      ID: ${driver.id.substring(0, 8)}...`)
        console.log(`      Estado: Online ✅ | Active ✅ | Verified ✅`)
        console.log('')
      })
    }

  } catch (error) {
    console.error('❌ Error general:', error.message)
  }
  
  console.log('=' .repeat(50))
  console.log('🏁 ACTIVACIÓN COMPLETADA')
  console.log('')
  console.log('💡 RESULTADO ESPERADO:')
  console.log('   - El indicador verde ahora debería mostrar "2"')
  console.log('   - Ambos repartidores aparecerán como disponibles')
  console.log('   - El contador se actualizará automáticamente')
}

activarRepartidorEstrella()
