import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://ikdtfwqkqpfxtxzrxnuq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZHRmd3Frcfextxzrxnuq.supabase.co';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSqlFixes() {
  console.log('🔧 Ejecutando SQL mejorado para corregir órdenes...');
  
  try {
    // 1. Eliminar trigger problemático
    console.log('🗑️ Eliminando trigger problemático...');
    await supabase.rpc('execute_sql', { 
      sql_query: 'DROP TRIGGER IF EXISTS sync_order_totals_trigger ON order_items;' 
    });
    
    // 2. Crear función mejorada
    console.log('⚙️ Creando función de sincronización mejorada...');
    const improvedFunction = `
    CREATE OR REPLACE FUNCTION sync_order_totals()
    RETURNS TRIGGER AS $$
    DECLARE
        target_order_id UUID;
    BEGIN
        IF TG_OP = 'DELETE' THEN
            target_order_id := OLD.order_id;
        ELSE
            target_order_id := NEW.order_id;
        END IF;
        
        IF target_order_id IS NOT NULL THEN
            UPDATE orders 
            SET 
                total_amount = (
                    SELECT COALESCE(SUM(subtotal), 0) 
                    FROM order_items 
                    WHERE order_id = target_order_id
                ),
                total = (
                    SELECT COALESCE(SUM(subtotal), 0) 
                    FROM order_items 
                    WHERE order_id = target_order_id
                ),
                updated_at = NOW()
            WHERE id = target_order_id;
        END IF;
        
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END;
    $$ LANGUAGE plpgsql;
    `;
    
    await supabase.rpc('execute_sql', { sql_query: improvedFunction });
    
    // 3. Crear nuevo trigger
    console.log('🔗 Creando trigger mejorado...');
    await supabase.rpc('execute_sql', { 
      sql_query: `CREATE TRIGGER sync_order_totals_trigger
                  AFTER INSERT OR UPDATE OR DELETE ON order_items
                  FOR EACH ROW
                  EXECUTE FUNCTION sync_order_totals();` 
    });
    
    // 4. Función para asignar órdenes huérfanas
    console.log('🎯 Creando función para asignar órdenes huérfanas...');
    const assignOrphanFunction = `
    CREATE OR REPLACE FUNCTION assign_orphan_orders_to_seller(seller_user_id UUID)
    RETURNS TABLE(
        order_id UUID,
        previous_seller_id UUID,
        new_seller_id UUID,
        total_amount DECIMAL,
        created_at TIMESTAMP WITH TIME ZONE
    ) AS $$
    BEGIN
        UPDATE orders 
        SET seller_id = seller_user_id
        WHERE seller_id IS NULL;
        
        RETURN QUERY
        SELECT 
            o.id as order_id,
            NULL::UUID as previous_seller_id,
            o.seller_id as new_seller_id,
            o.total_amount,
            o.created_at
        FROM orders o
        WHERE o.seller_id = seller_user_id
        AND o.updated_at >= NOW() - INTERVAL '1 minute'
        ORDER BY o.created_at DESC;
    END;
    $$ LANGUAGE plpgsql;
    `;
    
    await supabase.rpc('execute_sql', { sql_query: assignOrphanFunction });
    
    // 5. Diagnóstico de problemas
    console.log('🔍 Creando función de diagnóstico...');
    const diagnoseFunction = `
    CREATE OR REPLACE FUNCTION diagnose_order_issues()
    RETURNS TABLE(
        issue_type TEXT,
        order_id UUID,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE
    ) AS $$
    BEGIN
        RETURN QUERY
        SELECT 
            'MISSING_SELLER_ID'::TEXT as issue_type,
            o.id as order_id,
            'Orden sin seller_id asignado'::TEXT as description,
            o.created_at
        FROM orders o
        WHERE o.seller_id IS NULL
        ORDER BY o.created_at DESC;
    END;
    $$ LANGUAGE plpgsql;
    `;
    
    await supabase.rpc('execute_sql', { sql_query: diagnoseFunction });
    
    // 6. Verificar órdenes existentes
    console.log('📊 Verificando órdenes...');
    
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, seller_id, buyer_id, total_amount, total, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (ordersError) {
      console.log('❌ Error al consultar órdenes:', ordersError.message);
    } else {
      console.log('📋 Órdenes recientes:');
      orders.forEach(order => {
        console.log(`  - ID: ${order.id}`);
        console.log(`    Seller ID: ${order.seller_id || 'NULL'}`);
        console.log(`    Buyer ID: ${order.buyer_id || 'NULL'}`);
        console.log(`    Total: ${order.total_amount || order.total || 'NULL'}`);
        console.log(`    Fecha: ${order.created_at}`);
        console.log('    ---');
      });
    }
    
    // 7. Contar órdenes huérfanas
    const { data: orphanOrders, error: orphanError } = await supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .is('seller_id', null);
    
    if (orphanError) {
      console.log('❌ Error al contar órdenes huérfanas:', orphanError.message);
    } else {
      console.log(`🏥 Órdenes huérfanas (sin seller_id): ${orphanOrders?.length || 0}`);
    }
    
    console.log('✅ SQL mejorado ejecutado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error al ejecutar SQL:', error.message);
  }
}

// Ejecutar
executeSqlFixes();
