// =====================================================
// DIAGNÓSTICO URGENTE - NOTIFICACIONES NO FUNCIONAN
// =====================================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://deaddzyloiqdckublfed.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRkenlsb2lxZGNrdWJsZmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3NzU4MDMsImV4cCI6MjA0NzM1MTgwM30.wCZjdV3Tr7X0qMU38C29cR8_8Lr9U2-GK8Ie3LJpP4I'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔧 DIAGNÓSTICO URGENTE - Sistema de notificaciones')

// Test 1: Verificar conexión básica
async function testBasicConnection() {
  console.log('\n1️⃣ Probando conexión básica...')
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1)
    if (error) {
      console.error('❌ Error conexión básica:', error.message)
      return false
    } else {
      console.log('✅ Conexión básica OK')
      return true
    }
  } catch (err) {
    console.error('❌ Error conexión:', err.message)
    return false
  }
}

// Test 2: Verificar suscripción realtime
async function testRealtimeSubscription() {
  console.log('\n2️⃣ Probando suscripción Realtime...')
  
  return new Promise((resolve) => {
    let subscriptionWorking = false
    
    const channel = supabase
      .channel('diagnostic-test')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders' 
        },
        (payload) => {
          console.log('🎉 ¡REALTIME FUNCIONA! Evento recibido:', payload.eventType)
          subscriptionWorking = true
          resolve(true)
        }
      )
      .subscribe((status) => {
        console.log('📡 Status suscripción:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscripción Realtime activa')
          
          // Timeout para verificar si llegan eventos
          setTimeout(() => {
            if (!subscriptionWorking) {
              console.log('⚠️ Suscripción activa pero no recibe eventos')
            }
            supabase.removeChannel(channel)
            resolve(subscriptionWorking)
          }, 3000)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en canal Realtime')
          resolve(false)
        }
      })
  })
}

// Test 3: Crear orden de prueba y verificar trigger
async function testOrderCreationAndTrigger() {
  console.log('\n3️⃣ Creando orden de prueba...')
  
  try {
    // Obtener un usuario vendedor y comprador
    const { data: users } = await supabase
      .from('users')
      .select('id, role')
      .limit(10)
    
    const seller = users?.find(u => u.role === 'vendedor')
    const buyer = users?.find(u => u.role === 'comprador')
    
    if (!seller || !buyer) {
      console.error('❌ No se encontraron usuarios vendedor/comprador')
      return false
    }
    
    console.log('👤 Usando vendedor:', seller.id)
    console.log('👤 Usando comprador:', buyer.id)
    
    // Crear orden
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        buyer_id: buyer.id,
        seller_id: seller.id,
        total: 999,
        status: 'pendiente',
        delivery_method: 'pickup',
        delivery_address: 'Diagnóstico test'
      })
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error creando orden:', error.message)
      return false
    }
    
    console.log('✅ Orden creada exitosamente:', order.id)
    return true
    
  } catch (err) {
    console.error('❌ Error en test de orden:', err.message)
    return false
  }
}

// Test 4: Verificar permisos de notificaciones
async function testNotificationPermissions() {
  console.log('\n4️⃣ Verificando permisos de notificaciones...')
  
  if (typeof window !== 'undefined' && 'Notification' in window) {
    console.log('📋 Notification API disponible')
    console.log('🔔 Permiso actual:', Notification.permission)
    
    if (Notification.permission === 'default') {
      console.log('⚠️ Permisos no solicitados aún')
    } else if (Notification.permission === 'denied') {
      console.error('❌ Permisos de notificación denegados')
    } else {
      console.log('✅ Permisos de notificación concedidos')
    }
    
    return Notification.permission === 'granted'
  } else {
    console.error('❌ Notification API no disponible')
    return false
  }
}

// Test 5: Probar audio básico
async function testBasicAudio() {
  console.log('\n5️⃣ Probando capacidades de audio...')
  
  if (typeof window !== 'undefined') {
    try {
      // Test Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      console.log('🎵 AudioContext disponible, estado:', audioContext.state)
      
      if (audioContext.state === 'suspended') {
        console.log('⚠️ AudioContext suspendido (necesita interacción del usuario)')
      }
      
      audioContext.close()
      return true
    } catch (err) {
      console.error('❌ Error con Web Audio API:', err.message)
      return false
    }
  } else {
    console.log('⚠️ Ejecutándose en Node.js, no se puede probar audio')
    return false
  }
}

// Ejecutar todos los tests
async function runDiagnostic() {
  console.log('🚀 Iniciando diagnóstico completo...\n')
  
  const results = {
    connection: await testBasicConnection(),
    realtime: await testRealtimeSubscription(),
    orderCreation: await testOrderCreationAndTrigger(),
    notifications: await testNotificationPermissions(),
    audio: await testBasicAudio()
  }
  
  console.log('\n📊 RESULTADOS DEL DIAGNÓSTICO:')
  console.log('========================================')
  console.log('Conexión básica:', results.connection ? '✅ OK' : '❌ FAIL')
  console.log('Realtime:', results.realtime ? '✅ OK' : '❌ FAIL')
  console.log('Creación orden:', results.orderCreation ? '✅ OK' : '❌ FAIL')
  console.log('Permisos notificación:', results.notifications ? '✅ OK' : '❌ FAIL')
  console.log('Capacidades audio:', results.audio ? '✅ OK' : '❌ FAIL')
  
  // Diagnóstico del problema
  console.log('\n🔍 DIAGNÓSTICO:')
  if (!results.connection) {
    console.log('🚨 PROBLEMA: No hay conexión con Supabase')
  } else if (!results.realtime) {
    console.log('🚨 PROBLEMA: Realtime no está funcionando - revisar configuración')
  } else if (!results.notifications) {
    console.log('🚨 PROBLEMA: Permisos de notificación no concedidos')
  } else if (!results.audio) {
    console.log('🚨 PROBLEMA: Audio no disponible - requiere interacción del usuario')
  } else {
    console.log('✅ Todos los componentes básicos funcionan')
    console.log('🔧 El problema puede estar en la implementación específica')
  }
  
  console.log('\n🎯 PRÓXIMOS PASOS:')
  if (!results.realtime) {
    console.log('1. Verificar configuración Realtime en Supabase Dashboard')
    console.log('2. Ejecutar SQL de configuración nuevamente')
  }
  if (!results.notifications) {
    console.log('3. Solicitar permisos de notificación explícitamente')
  }
  if (!results.audio) {
    console.log('4. Requerir interacción del usuario antes del primer sonido')
  }
}

// Ejecutar diagnóstico
runDiagnostic().catch(console.error)
