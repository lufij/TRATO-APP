// =====================================================
// RESTAURAR NOTIFICACIONES BÁSICAS - URGENTE
// =====================================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://deaddzyloiqdckublfed.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRkenlsb2lxZGNrdWJsZmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3NzU4MDMsImV4cCI6MjA0NzM1MTgwM30.wCZjdV3Tr7X0qMU38C29cR8_8Lr9U2-GK8Ie3LJpP4I'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🚨 RESTAURANDO NOTIFICACIONES BÁSICAS...')

// Función para probar notificación simple
function testSimpleNotification() {
  console.log('🔔 Probando notificación simple del navegador...')
  
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification('✅ Test de Notificación', {
        body: 'Si ves esto, las notificaciones básicas funcionan',
        icon: '/favicon.ico'
      })
      console.log('   ✅ Notificación enviada')
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('✅ Permisos Otorgados', {
            body: 'Ahora las notificaciones están habilitadas'
          })
        }
      })
    } else {
      console.log('   ❌ Permisos denegados')
    }
  } else {
    console.log('   ❌ Notificaciones no soportadas')
  }
}

// Función para test de realtime sin autenticación
async function testBasicRealtime() {
  console.log('🔄 Probando Realtime básico...')
  
  const channel = supabase
    .channel('basic-test', {
      config: {
        presence: { key: 'test' },
        broadcast: { self: true }
      }
    })
    .on('broadcast', { event: 'test' }, (payload) => {
      console.log('   ✅ Broadcast funcionando:', payload)
    })
    .subscribe((status, error) => {
      console.log('   📡 Status:', status)
      if (error) {
        console.log('   ❌ Error:', error)
      }
      
      if (status === 'SUBSCRIBED') {
        console.log('   ✅ Realtime básico funcionando')
        // Enviar test broadcast
        channel.send({
          type: 'broadcast',
          event: 'test',
          payload: { message: 'Test successful' }
        })
      }
    })
}

// Función para crear orden de prueba y verificar trigger
async function testOrderCreation() {
  console.log('🛒 Probando creación de orden...')
  
  try {
    const testOrder = {
      buyer_id: '11111111-1111-1111-1111-111111111111', // UUID de prueba
      seller_id: '22222222-2222-2222-2222-222222222222', // UUID de prueba
      total: 25.50,
      status: 'pending',
      notes: 'Orden de prueba para verificar notificaciones'
    }
    
    const { data, error } = await supabase
      .from('orders')
      .insert(testOrder)
      .select()
    
    if (error) {
      console.log('   ❌ Error creando orden:', error.message)
      return false
    }
    
    console.log('   ✅ Orden creada:', data[0].id)
    return true
  } catch (err) {
    console.log('   ❌ Excepción:', err.message)
    return false
  }
}

// Función para configurar notificación básica de orders
async function setupBasicOrderNotifications() {
  console.log('⚡ Configurando notificaciones básicas de orders...')
  
  const channel = supabase
    .channel('orders-simple')
    .on(
      'postgres_changes',
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'orders'
      },
      (payload) => {
        console.log('🎯 Nueva orden detectada:', payload.new)
        
        // Notificación simple del navegador
        if (Notification.permission === 'granted') {
          new Notification('🛒 Nueva Orden', {
            body: `Orden por Q${payload.new.total} recibida`,
            icon: '/favicon.ico',
            tag: 'new-order'
          })
        }
        
        // Sonido simple con Web Audio API
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)()
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          
          oscillator.frequency.value = 800
          oscillator.type = 'sine'
          gainNode.gain.value = 0.3
          
          oscillator.start()
          oscillator.stop(audioContext.currentTime + 0.5)
          
          console.log('   🔊 Sonido reproducido')
        } catch (err) {
          console.log('   ⚠️ Error con sonido:', err.message)
        }
      }
    )
    .subscribe((status, error) => {
      console.log('   📡 Status notificaciones orders:', status)
      if (error) {
        console.log('   ❌ Error:', error)
      }
      
      if (status === 'SUBSCRIBED') {
        console.log('   ✅ Escuchando nuevas órdenes...')
      }
    })
}

// Ejecutar tests en secuencia
async function runEmergencyFix() {
  console.log('🚨 INICIANDO REPARACIÓN DE EMERGENCIA')
  console.log('=====================================')
  
  // 1. Test de notificaciones básicas
  testSimpleNotification()
  
  // 2. Test de realtime
  await testBasicRealtime()
  
  // 3. Configurar notificaciones de orders
  await setupBasicOrderNotifications()
  
  // 4. Esperar un poco y crear orden de prueba
  setTimeout(async () => {
    console.log('\n🧪 Creando orden de prueba en 3 segundos...')
    await testOrderCreation()
  }, 3000)
  
  console.log('\n✅ Configuración de emergencia completada')
  console.log('📋 Para probar: crea una orden desde otra pestaña')
}

// Auto-ejecutar si se carga en el navegador
if (typeof window !== 'undefined') {
  window.runEmergencyFix = runEmergencyFix
  console.log('🔧 Ejecuta: runEmergencyFix() en la consola del navegador')
} else {
  runEmergencyFix()
}
