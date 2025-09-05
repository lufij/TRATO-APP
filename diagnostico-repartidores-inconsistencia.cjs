// 🔍 DIAGNÓSTICO: Inconsistencia en repartidores disponibles
console.log('🔍 DIAGNÓSTICO: Inconsistencia en repartidores disponibles');
console.log('===============================================');

const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://deaddzylotqdckub1fed.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRkenlsb3RxZGNrdWIxZmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3MjU3MjEsImV4cCI6MjA1MDMwMTcyMX0.gkz0LVXdPPupmZMk06yPYP04FvQfGz7KOjOgn6yLIE8';

const supabase = createClient(supabaseUrl, supabaseKey);

const diagnosticarRepartidores = async () => {
  console.log('\n1. 🟢 CONSULTA DEL BOTÓN VERDE (OnlineDriversIndicator):');
  
  try {
    // Esta es la consulta que usa el indicador verde
    const { count: onlineCount, error: onlineError } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .eq('is_online', true);
    
    console.log(`   Resultado: ${onlineCount} repartidores`);
    console.log(`   Criterio: drivers.is_online = true`);
    if (onlineError) console.log(`   Error: ${onlineError.message}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  console.log('\n2. 🔴 CONSULTA DE LAS ALERTAS ROJAS (CriticalNotifications):');
  
  try {
    // Esta es la consulta que usa CriticalNotifications
    const { data: availableDrivers, error: availableError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'repartidor')
      .eq('is_available', true);
    
    console.log(`   Resultado: ${availableDrivers?.length || 0} repartidores`);
    console.log(`   Criterio: users.role = 'repartidor' AND users.is_available = true`);
    if (availableError) console.log(`   Error: ${availableError.message}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  console.log('\n3. 📊 ANÁLISIS DETALLADO:');
  
  try {
    // Verificar drivers tabla completa
    const { data: allDrivers, error: driversError } = await supabase
      .from('drivers')
      .select('*');
    
    console.log(`\n   👥 Tabla 'drivers':`);
    console.log(`   Total registros: ${allDrivers?.length || 0}`);
    
    if (allDrivers) {
      const online = allDrivers.filter(d => d.is_online);
      const active = allDrivers.filter(d => d.is_active);
      const verified = allDrivers.filter(d => d.is_verified);
      
      console.log(`   - is_online = true: ${online.length}`);
      console.log(`   - is_active = true: ${active.length}`);
      console.log(`   - is_verified = true: ${verified.length}`);
      console.log(`   - online + active + verified: ${allDrivers.filter(d => d.is_online && d.is_active && d.is_verified).length}`);
      
      // Mostrar detalles de cada driver
      console.log(`\n   📋 Detalle de cada driver:`);
      allDrivers.forEach((driver, index) => {
        console.log(`   ${index + 1}. ID: ${driver.id.slice(0,8)}`);
        console.log(`      - is_online: ${driver.is_online}`);
        console.log(`      - is_active: ${driver.is_active}`);
        console.log(`      - is_verified: ${driver.is_verified}`);
        console.log(`      - vehicle_type: ${driver.vehicle_type}`);
      });
    }
  } catch (error) {
    console.log(`   Error en drivers: ${error.message}`);
  }

  try {
    // Verificar users tabla - repartidores
    const { data: userDrivers, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'repartidor');
    
    console.log(`\n   👤 Tabla 'users' (role = 'repartidor'):`);
    console.log(`   Total registros: ${userDrivers?.length || 0}`);
    
    if (userDrivers) {
      const available = userDrivers.filter(u => u.is_available);
      const active = userDrivers.filter(u => u.is_active);
      const verified = userDrivers.filter(u => u.is_verified);
      
      console.log(`   - is_available = true: ${available.length}`);
      console.log(`   - is_active = true: ${active.length}`);
      console.log(`   - is_verified = true: ${verified.length}`);
      
      // Mostrar detalles de cada usuario repartidor
      console.log(`\n   📋 Detalle de cada usuario repartidor:`);
      userDrivers.forEach((user, index) => {
        console.log(`   ${index + 1}. ID: ${user.id.slice(0,8)} - ${user.name}`);
        console.log(`      - is_available: ${user.is_available}`);
        console.log(`      - is_active: ${user.is_active}`);
        console.log(`      - is_verified: ${user.is_verified}`);
        console.log(`      - vehicle_type: ${user.vehicle_type}`);
      });
    }
  } catch (error) {
    console.log(`   Error en users: ${error.message}`);
  }

  console.log('\n4. 🎯 PROBLEMA IDENTIFICADO:');
  console.log('   El botón verde consulta tabla "drivers" con criterio "is_online"');
  console.log('   Las alertas rojas consultan tabla "users" con criterio "is_available"');
  console.log('   ¡Son dos tablas y campos diferentes!');
  
  console.log('\n5. 💡 SOLUCIÓN:');
  console.log('   Ambas consultas deben usar los mismos criterios.');
  console.log('   Recomendación: Unificar usando tabla "drivers" con múltiples criterios.');
  
  console.log('\n6. 🔧 CONSULTA UNIFICADA RECOMENDADA:');
  
  try {
    const { count: unifiedCount, error: unifiedError } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .eq('is_online', true)
      .eq('is_active', true)
      .eq('is_verified', true);
    
    console.log(`   drivers WHERE is_online=true AND is_active=true AND is_verified=true`);
    console.log(`   Resultado unificado: ${unifiedCount} repartidores disponibles`);
    
    if (unifiedError) console.log(`   Error: ${unifiedError.message}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n===============================================');
  console.log('🎯 DIAGNÓSTICO COMPLETO');
};

// Ejecutar diagnóstico
diagnosticarRepartidores().catch(console.error);
