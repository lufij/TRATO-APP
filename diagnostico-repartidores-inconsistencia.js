// 🔍 DIAGNÓSTICO: Inconsistencia en repartidores disponibles
// Este script identifica por qué hay dos resultados diferentes
console.log('🔍 DIAGNÓSTICO: Inconsistencia en repartidores disponibles');
console.log('===============================================');

import { supabase } from './utils/supabase/client.js';

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
