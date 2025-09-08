// =====================================================
// DIAGNÓSTICO COMPLETO DE NOTIFICACIONES
// =====================================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://deaddzyloiqdckublfed.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRkenlsb2lxZGNrdWJsZmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3NzU4MDMsImV4cCI6MjA0NzM1MTgwM30.wCZjdV3Tr7X0qMU38C29cR8_8Lr9U2-GK8Ie3LJpP4I'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 DIAGNÓSTICO COMPLETO DE NOTIFICACIONES')
console.log('==========================================')

// Test 1: Conexión básica
async function testConnection() {
  console.log('\n1️⃣ PROBANDO CONEXIÓN BÁSICA...')
  try {
    const { data, error } = await supabase.from('orders').select('count').limit(1)
    console.log('   ✅ Conexión Supabase OK')
    return true
  } catch (err) {
    console.log('   ❌ Error conexión:', err.message)
    return false
  }
}

// Test 2: Verificar usuario actual
async function testAuth() {
  console.log('\n2️⃣ VERIFICANDO AUTENTICACIÓN...')
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      console.log('   ✅ Usuario autenticado:', user.email)
      return user
    } else {
      console.log('   ⚠️ No hay usuario autenticado')
      return null
    }
  } catch (err) {
    console.log('   ❌ Error auth:', err.message)
    return null
  }
}

// Test 3: Verificar realtime connection
async function testRealtimeConnection() {
  console.log('\n3️⃣ PROBANDO CONEXIÓN REALTIME...')
  
  return new Promise((resolve) => {
    let resolved = false
    const timeout = setTimeout(() => {
      if (!resolved) {
        console.log('   ❌ Timeout: Realtime no responde')
        resolved = true
        resolve(false)
      }
    }, 5000)

    const channel = supabase
      .channel('test-connection')
      .on('presence', { event: 'sync' }, () => {
        console.log('   ✅ Realtime conectado')
      })
      .subscribe((status) => {
        if (!resolved) {
          if (status === 'SUBSCRIBED') {
            console.log('   ✅ Suscripción Realtime exitosa')
            clearTimeout(timeout)
            resolved = true
            supabase.removeChannel(channel)
            resolve(true)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.log('   ❌ Error Realtime:', status)
            clearTimeout(timeout)
            resolved = true
            resolve(false)
          }
        }
      })
  })
}

// Test 4: Probar suscripción a orders
async function testOrdersSubscription() {
  console.log('\n4️⃣ PROBANDO SUSCRIPCIÓN A ORDERS...')
  
  return new Promise((resolve) => {
    let resolved = false
    const timeout = setTimeout(() => {
      if (!resolved) {
        console.log('   ❌ Timeout: Suscripción orders no funciona')
        resolved = true
        resolve(false)
      }
    }, 5000)

    const channel = supabase
      .channel('orders-test')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders' 
        },
        (payload) => {
          console.log('   🎉 Evento orders detectado:', payload.eventType)
          if (!resolved) {
            clearTimeout(timeout)
            resolved = true
            supabase.removeChannel(channel)
            resolve(true)
          }
        }
      )
      .subscribe((status) => {
        console.log('   📡 Status suscripción orders:', status)
        if (status === 'SUBSCRIBED') {
          console.log('   ✅ Escuchando cambios en orders...')
          // Crear una orden de prueba para trigger
          setTimeout(async () => {
            if (!resolved) {
              console.log('   🔄 Creando orden de prueba...')
              try {
                const { error } = await supabase.from('orders').insert({
                  buyer_id: '00000000-0000-0000-0000-000000000000',
                  seller_id: '00000000-0000-0000-0000-000000000000',
                  total: 1,
                  status: 'pending'
                })
                if (error) {
                  console.log('   ⚠️ No se pudo crear orden prueba:', error.message)
                  clearTimeout(timeout)
                  resolved = true
                  supabase.removeChannel(channel)
                  resolve(false)
                }
              } catch (err) {
                console.log('   ⚠️ Error creando orden prueba:', err.message)
              }
            }
          }, 1000)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (!resolved) {
            console.log('   ❌ Error suscripción orders:', status)
            clearTimeout(timeout)
            resolved = true
            resolve(false)
          }
        }
      })
  })
}

// Test 5: Verificar si hay órdenes recientes
async function testRecentOrders() {
  console.log('\n5️⃣ VERIFICANDO ÓRDENES RECIENTES...')
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, created_at, status, seller_id')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (error) {
      console.log('   ❌ Error consultando orders:', error.message)
      return false
    }
    
    console.log('   📋 Últimas 5 órdenes:')
    data.forEach((order, index) => {
      console.log(`   ${index + 1}. ID: ${order.id.slice(0, 8)}... | ${order.created_at} | ${order.status}`)
    })
    
    return data.length > 0
  } catch (err) {
    console.log('   ❌ Error:', err.message)
    return false
  }
}

// Test 6: Probar notificaciones del navegador
async function testBrowserNotifications() {
  console.log('\n6️⃣ PROBANDO NOTIFICACIONES DEL NAVEGADOR...')
  
  if (!('Notification' in window)) {
    console.log('   ❌ Notificaciones no soportadas')
    return false
  }
  
  console.log('   📱 Permiso actual:', Notification.permission)
  
  if (Notification.permission === 'granted') {
    console.log('   🔔 Enviando notificación de prueba...')
    new Notification('🧪 Test de Diagnóstico', {
      body: 'Si ves esta notificación, el sistema funciona',
      icon: '/icon-192x192.png'
    })
    console.log('   ✅ Notificación enviada')
    return true
  } else {
    console.log('   ⚠️ Permisos de notificación no otorgados')
    return false
  }
}

// Ejecutar todos los tests
async function runFullDiagnostic() {
  console.log('🚀 Iniciando diagnóstico completo...\n')
  
  const results = {
    connection: await testConnection(),
    auth: await testAuth(),
    realtime: await testRealtimeConnection(),
    orders: await testOrdersSubscription(),
    recentOrders: await testRecentOrders(),
    browserNotifications: await testBrowserNotifications()
  }
  
  console.log('\n📊 RESUMEN DE DIAGNÓSTICO:')
  console.log('==========================')
  console.log('Conexión:', results.connection ? '✅' : '❌')
  console.log('Auth:', results.auth ? '✅' : '❌')
  console.log('Realtime:', results.realtime ? '✅' : '❌')
  console.log('Orders Sub:', results.orders ? '✅' : '❌')
  console.log('Recent Orders:', results.recentOrders ? '✅' : '❌')
  console.log('Browser Notif:', results.browserNotifications ? '✅' : '❌')
  
  const allGood = Object.values(results).every(r => r)
  console.log('\n🎯 ESTADO GENERAL:', allGood ? '✅ TODO FUNCIONA' : '❌ HAY PROBLEMAS')
  
  if (!allGood) {
    console.log('\n🔧 POSIBLES SOLUCIONES:')
    if (!results.connection) console.log('• Verificar configuración Supabase')
    if (!results.auth) console.log('• Iniciar sesión en la aplicación')
    if (!results.realtime) console.log('• Verificar configuración Realtime en Supabase Dashboard')
    if (!results.orders) console.log('• Verificar políticas RLS y publicación realtime')
    if (!results.browserNotifications) console.log('• Otorgar permisos de notificación en el navegador')
  }
}

// Ejecutar si es el main module
if (typeof window !== 'undefined') {
  window.runDiagnostic = runFullDiagnostic
  runFullDiagnostic()
} else {
  runFullDiagnostic()
}
