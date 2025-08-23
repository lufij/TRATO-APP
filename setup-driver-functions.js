const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://ikdtfwqkqpfxtxzrxnuq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZHRmd3Frcfextxzrxnuq.supabase.co'; // Service key para operaciones administrativas

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDriverFunctions() {
  try {
    console.log('🚀 Configurando funciones de repartidor...');
    
    // Leer y ejecutar el archivo SQL
    const sqlContent = fs.readFileSync('CREAR_FUNCIONES_REPARTIDOR_COMPLETO.sql', 'utf8');
    
    // Ejecutar el SQL completo
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sqlContent 
    });
    
    if (error) {
      console.error('❌ Error ejecutando SQL:', error);
      
      // Intentar ejecutar las funciones una por una
      console.log('🔄 Intentando ejecutar funciones individualmente...');
      
      // Función update_order_status
      const updateStatusSQL = `
        CREATE OR REPLACE FUNCTION update_order_status(
          p_order_id TEXT,
          p_new_status TEXT,
          p_driver_id UUID DEFAULT NULL,
          p_pickup_notes TEXT DEFAULT NULL,
          p_delivery_notes TEXT DEFAULT NULL
        )
        RETURNS JSON
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          v_order_record RECORD;
          v_result JSON;
        BEGIN
          -- Validar que el estado sea válido
          IF p_new_status NOT IN ('ready', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled') THEN
            RETURN json_build_object(
              'success', false,
              'error', 'Estado no válido: ' || p_new_status
            );
          END IF;
          
          -- Obtener información actual del pedido
          SELECT * INTO v_order_record
          FROM orders 
          WHERE id = p_order_id::UUID;
          
          IF NOT FOUND THEN
            RETURN json_build_object(
              'success', false,
              'error', 'Pedido no encontrado'
            );
          END IF;
          
          -- Actualizar el pedido con el nuevo estado
          UPDATE orders 
          SET 
            status = p_new_status,
            driver_id = COALESCE(p_driver_id, driver_id),
            pickup_notes = COALESCE(p_pickup_notes, pickup_notes),
            delivery_notes = COALESCE(p_delivery_notes, delivery_notes),
            picked_up_at = CASE 
              WHEN p_new_status = 'picked_up' AND picked_up_at IS NULL THEN NOW()
              ELSE picked_up_at
            END,
            delivered_at = CASE 
              WHEN p_new_status = 'delivered' AND delivered_at IS NULL THEN NOW()
              ELSE delivered_at
            END,
            updated_at = NOW()
          WHERE id = p_order_id::UUID;
          
          -- Crear notificación del cambio de estado
          INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            order_id,
            created_at
          ) VALUES (
            v_order_record.user_id,
            'Estado del pedido actualizado',
            'Tu pedido #' || SUBSTRING(p_order_id, 1, 8) || ' ahora está: ' || 
            CASE p_new_status
              WHEN 'assigned' THEN 'Asignado a repartidor'
              WHEN 'picked_up' THEN 'Recogido del restaurante'
              WHEN 'in_transit' THEN 'En camino'
              WHEN 'delivered' THEN 'Entregado'
              WHEN 'cancelled' THEN 'Cancelado'
              ELSE p_new_status
            END,
            'order_update',
            p_order_id::UUID,
            NOW()
          );
          
          RETURN json_build_object(
            'success', true,
            'message', 'Estado actualizado correctamente',
            'order_id', p_order_id,
            'new_status', p_new_status
          );
          
        EXCEPTION WHEN OTHERS THEN
          RETURN json_build_object(
            'success', false,
            'error', 'Error interno: ' || SQLERRM
          );
        END;
        $$;
      `;
      
      const { error: updateError } = await supabase.rpc('exec_sql', { 
        sql_query: updateStatusSQL 
      });
      
      if (updateError) {
        console.error('❌ Error creando función update_order_status:', updateError);
      } else {
        console.log('✅ Función update_order_status creada exitosamente');
      }
      
      // Función get_driver_delivery_history
      const historySQL = `
        CREATE OR REPLACE FUNCTION get_driver_delivery_history(p_driver_id UUID)
        RETURNS TABLE (
          id UUID,
          order_id TEXT,
          pickup_address TEXT,
          delivery_address TEXT,
          customer_name TEXT,
          customer_phone TEXT,
          total_amount NUMERIC,
          delivery_fee NUMERIC,
          status TEXT,
          created_at TIMESTAMPTZ,
          picked_up_at TIMESTAMPTZ,
          delivered_at TIMESTAMPTZ,
          pickup_notes TEXT,
          delivery_notes TEXT,
          items_count INTEGER,
          business_name TEXT
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            o.id,
            o.id::TEXT as order_id,
            o.pickup_address,
            o.delivery_address,
            o.customer_name,
            o.customer_phone,
            o.total_amount,
            o.delivery_fee,
            o.status,
            o.created_at,
            o.picked_up_at,
            o.delivered_at,
            o.pickup_notes,
            o.delivery_notes,
            (SELECT COUNT(*)::INTEGER FROM order_items oi WHERE oi.order_id = o.id) as items_count,
            COALESCE(b.name, 'Restaurante') as business_name
          FROM orders o
          LEFT JOIN businesses b ON o.business_id = b.id
          WHERE o.driver_id = p_driver_id
            AND o.status = 'delivered'
          ORDER BY o.delivered_at DESC;
        END;
        $$;
      `;
      
      const { error: historyError } = await supabase.rpc('exec_sql', { 
        sql_query: historySQL 
      });
      
      if (historyError) {
        console.error('❌ Error creando función get_driver_delivery_history:', historyError);
      } else {
        console.log('✅ Función get_driver_delivery_history creada exitosamente');
      }
      
    } else {
      console.log('✅ Todas las funciones de repartidor configuradas exitosamente');
    }
    
    // Verificar que las funciones existen
    console.log('🔍 Verificando funciones creadas...');
    const { data: functions } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .in('routine_name', ['update_order_status', 'get_driver_delivery_history']);
      
    console.log('Funciones encontradas:', functions);
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar setup
setupDriverFunctions();
