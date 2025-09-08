// =====================================================
// VERIFICAR CONFIGURACIÓN SUPABASE REALTIME
// =====================================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://deaddzyloiqdckublfed.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRkenlsb2lxZGNrdWJsZmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3NzU4MDMsImV4cCI6MjA0NzM1MTgwM30.wCZjdV3Tr7X0qMU38C29cR8_8Lr9U2-GK8Ie3LJpP4I'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Verificando configuración Supabase...')

// Test 1: Verificar conexión
async function testConnection() {
  try {
    const { data, error } = await supabase.from('users').select('count').single()
    if (error) {
      console.log('❌ Error conexión:', error.message)
    } else {
      console.log('✅ Conexión Supabase OK')
    }
  } catch (err) {
    console.log('⚠️ Test conexión:', err.message)
  }
}

// Test 2: Verificar Realtime
async function testRealtime() {
  console.log('🔄 Probando suscripción Realtime...')
  
  const channel = supabase
    .channel('test-orders')
    .on(
      'postgres_changes',
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'orders' 
      },
      (payload) => {
        console.log('🎉 Realtime funciona! Nueva orden:', payload.new)
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Suscripción Realtime activa')
      } else {
        console.log('❌ Error suscripción:', status)
      }
    })

  // Cleanup después de 5 segundos
  setTimeout(() => {
    supabase.removeChannel(channel)
    console.log('🔄 Test Realtime completado')
  }, 5000)
}

// Test 3: Verificar políticas RLS
async function testRLS() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, status')
      .limit(1)
    
    if (error) {
      console.log('⚠️ RLS activo (normal):', error.message)
    } else {
      console.log('✅ Acceso orders OK:', data?.length || 0, 'registros')
    }
  } catch (err) {
    console.log('⚠️ Test RLS:', err.message)
  }
}

// Ejecutar tests
async function runTests() {
  await testConnection()
  await testRealtime()
  await testRLS()
  
  console.log('\n📋 RESUMEN:')
  console.log('1. Si ves "✅ Conexión Supabase OK" - Base funcionando')
  console.log('2. Si ves "✅ Suscripción Realtime activa" - Realtime OK')
  console.log('3. Si ves errores RLS - Normal (necesitas auth)')
  console.log('\n🎯 Siguiente: Probar notificaciones desde la app')
}

runTests()
