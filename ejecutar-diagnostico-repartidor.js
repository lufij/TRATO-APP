import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables de entorno de Supabase no encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function ejecutarDiagnostico() {
  console.log('🔍 EJECUTANDO DIAGNÓSTICO DE REPARTIDORES...')
  console.log('=' .repeat(60))
  
  try {
    // 1. Verificar estructura de la tabla drivers
    console.log('\n1️⃣ ESTRUCTURA REAL DE LA TABLA DRIVERS:')
    const { data: columns, error: colError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'drivers')
      .order('ordinal_position')
    
    if (colError) {
      console.log('❌ Error obteniendo columnas:', colError.message)
    } else if (columns && columns.length > 0) {
      columns.forEach(col => {
        console.log(`   ${col.column_name} | ${col.data_type} | ${col.is_nullable} | ${col.column_default || 'NULL'}`)
      })
    } else {
      console.log('   ⚠️ No se encontraron columnas o no hay acceso')
    }

    // 2. Contar todos los repartidores
    console.log('\n2️⃣ TOTAL DE REPARTIDORES EN TABLA DRIVERS:')
    const { count, error: countError } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.log('❌ Error contando drivers:', countError.message)
    } else {
      console.log(`   Total: ${count} repartidores`)
    }

    // 3. Ver los primeros repartidores con todas sus columnas
    console.log('\n3️⃣ PRIMEROS REPARTIDORES (TODAS LAS COLUMNAS):')
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3)
    
    if (driversError) {
      console.log('❌ Error obteniendo drivers:', driversError.message)
    } else if (drivers && drivers.length > 0) {
      drivers.forEach((driver, index) => {
        console.log(`\n   Repartidor ${index + 1}:`)
        Object.entries(driver).forEach(([key, value]) => {
          console.log(`     ${key}: ${value}`)
        })
      })
    } else {
      console.log('   ⚠️ No se encontraron repartidores')
    }

    // 4. Verificar repartidores en tabla users
    console.log('\n4️⃣ REPARTIDORES EN TABLA USERS:')
    const { count: userCount, error: userCountError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'repartidor')
    
    if (userCountError) {
      console.log('❌ Error contando users repartidores:', userCountError.message)
    } else {
      console.log(`   Total: ${userCount} usuarios con role 'repartidor'`)
    }

    // 5. Mostrar repartidores con nombres
    console.log('\n5️⃣ REPARTIDORES CON NOMBRES (JOIN USERS + DRIVERS):')
    const { data: usersWithDrivers, error: joinError } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        phone,
        created_at,
        drivers (
          id,
          created_at
        )
      `)
      .eq('role', 'repartidor')
      .order('created_at', { ascending: false })
    
    if (joinError) {
      console.log('❌ Error en JOIN:', joinError.message)
    } else if (usersWithDrivers && usersWithDrivers.length > 0) {
      usersWithDrivers.forEach(user => {
        const tieneDriver = user.drivers && user.drivers.length > 0 ? '✅ Sí' : '❌ No'
        console.log(`\n   ${user.name}:`)
        console.log(`     ID: ${user.id}`)
        console.log(`     Email: ${user.email}`)
        console.log(`     Teléfono: ${user.phone}`)
        console.log(`     Creado: ${user.created_at}`)
        console.log(`     Tiene perfil driver: ${tieneDriver}`)
      })
    }

    // 6. Intentar verificar las columnas críticas para el indicador
    console.log('\n6️⃣ VERIFICACIÓN COLUMNAS CRÍTICAS PARA INDICADOR:')
    
    // Intentar consulta con las columnas que requiere el indicador
    const { data: onlineDrivers, error: onlineError } = await supabase
      .from('drivers')
      .select('id, is_online, is_active, is_verified')
      .limit(5)
    
    if (onlineError) {
      console.log('❌ Error con columnas is_online/is_active/is_verified:', onlineError.message)
      console.log('   Esto explica por qué el indicador no funciona!')
    } else {
      console.log('✅ Las columnas críticas existen')
      console.log('   Primeros 5 repartidores con estados:')
      onlineDrivers.forEach((driver, index) => {
        console.log(`     ${index + 1}. ID: ${driver.id.substring(0, 8)}... | Online: ${driver.is_online} | Active: ${driver.is_active} | Verified: ${driver.is_verified}`)
      })
    }

  } catch (error) {
    console.error('❌ Error general:', error.message)
  }

  console.log('\n' + '=' .repeat(60))
  console.log('🏁 DIAGNÓSTICO COMPLETADO')
}

ejecutarDiagnostico()
