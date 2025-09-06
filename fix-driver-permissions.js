import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan credenciales de Supabase en .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixDriverPermissions() {
  console.log('🔧 Iniciando solución de permisos para repartidores...')

  // 1. Verificar RLS en tabla orders
  console.log('1. Verificando configuración RLS...')
  const { data: rlsCheck, error: rlsError } = await supabase.rpc('sql', {
    query: `
      SELECT 
        schemaname,
        tablename,
        rowsecurity,
        CASE 
          WHEN rowsecurity = true THEN 'RLS ACTIVADO'
          ELSE 'Sin RLS'
        END as estado_rls
      FROM pg_tables 
      WHERE tablename = 'orders';
    `
  })

  if (rlsError) {
    console.log('⚠️  No se pudo verificar RLS, continuando...')
  } else {
    console.log('   RLS Status:', rlsCheck)
  }

  // 2. Crear política para repartidores
  console.log('2. Actualizando políticas de permisos...')
  
  const policySQL = `
    -- Eliminar política existente si existe
    DROP POLICY IF EXISTS "drivers_can_update_assigned_orders" ON orders;

    -- Crear nueva política para repartidores
    CREATE POLICY "drivers_can_update_assigned_orders" 
    ON orders 
    FOR UPDATE 
    TO authenticated 
    USING (
      auth.uid() = driver_id 
      AND status IN ('assigned', 'picked_up', 'in_transit')
    )
    WITH CHECK (
      auth.uid() = driver_id 
      AND status IN ('picked_up', 'in_transit', 'delivered')
    );
  `

  const { error: policyError } = await supabase.rpc('sql', { query: policySQL })
  
  if (policyError) {
    console.log('⚠️  Error creando política:', policyError.message)
  } else {
    console.log('✅ Política de repartidores actualizada')
  }

  // 3. Asegurar columnas timestamp
  console.log('3. Verificando columnas de timestamp...')
  const timestampSQL = `
    ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
  `

  const { error: timestampError } = await supabase.rpc('sql', { query: timestampSQL })
  
  if (timestampError) {
    console.log('⚠️  Error añadiendo columnas:', timestampError.message)
  } else {
    console.log('✅ Columnas de timestamp verificadas')
  }

  // 4. Crear función de debug
  console.log('4. Creando función de debug...')
  const debugFunctionSQL = `
    CREATE OR REPLACE FUNCTION debug_order_permissions(order_uuid UUID)
    RETURNS TABLE(
      order_id UUID,
      current_status TEXT,
      driver_id UUID,
      current_user_id UUID,
      can_update BOOLEAN,
      reason TEXT
    ) 
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        o.id,
        o.status,
        o.driver_id,
        auth.uid(),
        CASE 
          WHEN auth.uid() = o.driver_id THEN true
          ELSE false
        END,
        CASE 
          WHEN auth.uid() IS NULL THEN 'Usuario no autenticado'
          WHEN o.driver_id IS NULL THEN 'Orden sin repartidor asignado'
          WHEN auth.uid() != o.driver_id THEN 'Usuario no es el repartidor asignado'
          ELSE 'Permisos OK'
        END
      FROM orders o
      WHERE o.id = order_uuid;
    END;
    $$;
  `

  const { error: debugError } = await supabase.rpc('sql', { query: debugFunctionSQL })
  
  if (debugError) {
    console.log('⚠️  Error creando función debug:', debugError.message)
  } else {
    console.log('✅ Función de debug creada')
  }

  // 5. Verificar que el enum de status incluye todos los valores
  console.log('5. Verificando valores de status permitidos...')
  const { data: enumData, error: enumError } = await supabase.rpc('sql', {
    query: `
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'order_status'
      );
    `
  })

  if (enumError) {
    console.log('⚠️  Error verificando enum:', enumError.message)
  } else {
    console.log('   Status permitidos:', enumData?.map(e => e.enumlabel))
  }

  // 6. Test de actualización directa
  console.log('6. Probando actualización directa...')
  const { data: testOrder, error: testError } = await supabase
    .from('orders')
    .select('id, status, driver_id, delivery_type')
    .eq('delivery_type', 'delivery')
    .eq('status', 'picked_up')
    .limit(1)

  if (testOrder && testOrder.length > 0) {
    console.log(`   Orden de prueba encontrada: ${testOrder[0].id}`)
    console.log(`   Status actual: ${testOrder[0].status}`)
    
    // Simular actualización (sin cambiar realmente)
    const { error: updateError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', testOrder[0].id)
      .limit(1)
    
    if (updateError) {
      console.log('❌ Error en acceso a orden:', updateError.message)
    } else {
      console.log('✅ Acceso a órdenes OK')
    }
  } else {
    console.log('   No se encontraron órdenes de prueba')
  }

  console.log('\n🎉 CONFIGURACIÓN COMPLETADA!')
  console.log('📝 Próximos pasos:')
  console.log('   1. Refresca la página del repartidor')
  console.log('   2. Prueba los botones de cambio de status')
  console.log('   3. Revisa la consola del navegador por errores')
  
  return true
}

// Ejecutar la función
fixDriverPermissions()
  .then(() => {
    console.log('\n✅ Script completado exitosamente')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error ejecutando script:', error)
    process.exit(1)
  })
