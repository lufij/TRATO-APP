// =====================================================
// CREAR ORDEN DE PRUEBA PARA NOTIFICACIONES
// =====================================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://deaddzyloiqdckublfed.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRkenlsb2lxZGNrdWJsZmVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTc3NTgwMywiZXhwIjoyMDQ3MzUxODAzfQ.TRbQJ6vd0N3tBdnhz7mXPbEZm9XBNjNJ5BEmpM3K5As'

const supabase = createClient(supabaseUrl, supabaseKey)

async function crearOrdenPrueba() {
  console.log('🔄 Creando orden de prueba para notificaciones...')
  
  try {
    // Buscar vendedor activo
    const { data: sellers } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'vendedor')
      .limit(1)
    
    if (!sellers || sellers.length === 0) {
      console.log('❌ No se encontraron vendedores')
      return
    }
    
    const seller = sellers[0]
    console.log('✅ Vendedor encontrado:', seller.name)
    
    // Buscar comprador
    const { data: buyers } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'comprador')
      .limit(1)
    
    if (!buyers || buyers.length === 0) {
      console.log('❌ No se encontraron compradores')
      return
    }
    
    const buyer = buyers[0]
    console.log('✅ Comprador encontrado:', buyer.name)
    
    // Crear orden
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        buyer_id: buyer.id,
        seller_id: seller.id,
        total_amount: 25.50,
        status: 'pending',
        delivery_address: 'Dirección de prueba para notificación',
        notes: 'ORDEN DE PRUEBA PARA NOTIFICACIONES CON SONIDO'
      })
      .select()
    
    if (error) {
      console.log('❌ Error creando orden:', error.message)
      return
    }
    
    console.log('🎉 ¡ORDEN CREADA EXITOSAMENTE!')
    console.log('📦 ID Orden:', order[0].id)
    console.log('💰 Total:', order[0].total_amount)
    console.log('🔔 El vendedor debería recibir notificación CON SONIDO')
    console.log('')
    console.log('⚠️ VERIFICA EN TU MÓVIL:')
    console.log('- Banner naranja debe aparecer')
    console.log('- Sonido debe reproducirse')
    console.log('- Vibración debe activarse')
    console.log('- Debe funcionar con pantalla bloqueada')
    
  } catch (err) {
    console.log('❌ Error:', err.message)
  }
}

crearOrdenPrueba()
