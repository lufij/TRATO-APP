import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.deaddzyloiqdckublfed',
  password: 'TRAMPolin123*',
});

async function checkRatingsSystem() {
  try {
    await client.connect();
    console.log('🔗 Conectado a Supabase\n');

    // 1. Verificar si existe la función complete_rating
    console.log('📊 VERIFICANDO FUNCIÓN complete_rating:');
    const functionQuery = `
      SELECT 
        proname as name,
        prosrc as source
      FROM pg_proc 
      WHERE proname = 'complete_rating'
    `;
    
    const funcResult = await client.query(functionQuery);
    console.log('Funciones encontradas:', funcResult.rows.length);
    if (funcResult.rows.length > 0) {
      console.log('✅ Función complete_rating existe');
    } else {
      console.log('❌ Función complete_rating NO existe');
    }
    
    // 2. Verificar estructura de la tabla ratings
    console.log('\n🏗️ ESTRUCTURA DE LA TABLA RATINGS:');
    const ratingsStructure = `
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ratings'
      ORDER BY ordinal_position
    `;
    
    const structResult = await client.query(ratingsStructure);
    console.table(structResult.rows);
    
    // 3. Verificar datos de ejemplo en ratings
    console.log('\n📊 DATOS EN TABLA RATINGS:');
    const ratingsData = `
      SELECT 
        id,
        order_id,
        rater_id,
        rated_id,
        rating_type,
        rating,
        status,
        created_at
      FROM ratings
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    const dataResult = await client.query(ratingsData);
    console.log('Total ratings encontradas:', dataResult.rows.length);
    console.table(dataResult.rows);
    
    // 4. Verificar órdenes con calificaciones
    console.log('\n📦 ÓRDENES CON INFORMACIÓN DE CALIFICACIONES:');
    const ordersWithRatings = `
      SELECT 
        id,
        buyer_id,
        seller_id,
        driver_id,
        status,
        seller_rating,
        driver_rating,
        delivery_type,
        created_at::date
      FROM orders
      WHERE status IN ('delivered', 'completed')
      ORDER BY created_at DESC
      LIMIT 5
    `;
    
    const ordersResult = await client.query(ordersWithRatings);
    console.log('Órdenes completadas:', ordersResult.rows.length);
    console.table(ordersResult.rows);

    // 5. Verificar si hay órdenes que puedan ser calificadas
    console.log('\n🎯 ÓRDENES LISTAS PARA CALIFICAR:');
    const ratableOrders = `
      SELECT 
        o.id,
        o.buyer_id,
        o.seller_id,
        o.driver_id,
        o.status,
        o.seller_rating,
        o.driver_rating,
        o.delivery_type,
        u.name as buyer_name
      FROM orders o
      LEFT JOIN users u ON o.buyer_id = u.id
      WHERE o.status = 'delivered'
      AND (o.seller_rating IS NULL OR o.driver_rating IS NULL)
      ORDER BY o.created_at DESC
      LIMIT 5
    `;
    
    const ratableResult = await client.query(ratableOrders);
    console.log('Órdenes sin calificar:', ratableResult.rows.length);
    console.table(ratableResult.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkRatingsSystem();
