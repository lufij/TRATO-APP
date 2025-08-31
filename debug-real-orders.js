import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pjjtayrqhjqdmgjmfcvy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqanRheXJxaGpxZG1nam1mY3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ0NDEwMjAsImV4cCI6MjAzOTAxNzAyMH0.AhGXxmlD7XZ3F9ky1dKVLJr5UHqeJdWVWf3FqaLt3do'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugRealOrders() {
  try {
    console.log('🔍 Obteniendo órdenes reales de Supabase...')
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        delivery_method,
        created_at,
        buyer_id,
        total_amount,
        delivery_address,
        order_items (
          id,
          quantity,
          price,
          products (
            name
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('❌ Error al obtener órdenes:', error)
      return
    }

    console.log(`📋 Total de órdenes encontradas: ${orders.length}`)
    
    orders.forEach((order, index) => {
      console.log(`\n--- ORDEN ${index + 1} ---`)
      console.log(`ID: ${order.id}`)
      console.log(`Status: ${order.status}`)
      console.log(`Delivery Method: ${order.delivery_method}`)
      console.log(`Fecha: ${order.created_at}`)
      console.log(`Dirección: ${order.delivery_address || 'No especificada'}`)
      console.log(`Total: Q${order.total_amount}`)
      
      if (order.order_items && order.order_items.length > 0) {
        console.log(`Productos:`)
        order.order_items.forEach(item => {
          console.log(`  - ${item.products?.name || 'Producto sin nombre'} (${item.quantity}x) - Q${item.price}`)
        })
      }
      
      // Verificar condiciones para mostrar botón rechazar
      const shouldShowRejectButton = order.status === 'pending'
      console.log(`¿Debería mostrar botón rechazar? ${shouldShowRejectButton ? 'SÍ' : 'NO'}`)
      
      // Verificar condiciones para mostrar texto delivery
      const shouldShowDeliveryText = order.delivery_method === 'delivery'
      console.log(`¿Debería mostrar "Servicio a Domicilio"? ${shouldShowDeliveryText ? 'SÍ' : 'NO'}`)
    })

  } catch (err) {
    console.error('💥 Error inesperado:', err)
  }
}

debugRealOrders()
