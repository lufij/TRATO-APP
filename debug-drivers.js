// Script de debug para verificar repartidores en línea
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Leer credenciales del .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const envLines = envFile.split('\n');
const env = {};
envLines.forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ No se encontraron las credenciales de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDrivers() {
  try {
    console.log('🔍 DIAGNÓSTICO DE REPARTIDORES EN LÍNEA');
    console.log('=' .repeat(50));

    // 1. Verificar todos los repartidores
    console.log('\n📋 1. TODOS LOS REPARTIDORES:');
    const { data: allDrivers, error: allError } = await supabase
      .from('drivers')
      .select('id, is_online, is_active, created_at, updated_at');

    if (allError) {
      console.error('❌ Error obteniendo todos los drivers:', allError);
    } else {
      console.log(`📊 Total de repartidores en la tabla: ${allDrivers?.length || 0}`);
      allDrivers?.forEach((driver, index) => {
        console.log(`   ${index + 1}. ID: ${driver.id}`);
        console.log(`      - is_online: ${driver.is_online}`);
        console.log(`      - is_active: ${driver.is_active}`);
        console.log(`      - updated_at: ${driver.updated_at}`);
        console.log('');
      });
    }

    // 2. Verificar repartidores en línea
    console.log('\n🟢 2. REPARTIDORES EN LÍNEA:');
    const { data: onlineDrivers, error: onlineError } = await supabase
      .from('drivers')
      .select('id, is_online, is_active, updated_at')
      .eq('is_online', true);

    if (onlineError) {
      console.error('❌ Error obteniendo drivers en línea:', onlineError);
    } else {
      console.log(`✅ Repartidores en línea: ${onlineDrivers?.length || 0}`);
      onlineDrivers?.forEach((driver, index) => {
        console.log(`   ${index + 1}. ID: ${driver.id} - Online: ${driver.is_online} - Active: ${driver.is_active}`);
      });
    }

    // 3. Contar con head (como hace el componente)
    console.log('\n🔢 3. CONTEO CON HEAD (como el componente):');
    const { count, error: countError } = await supabase
      .from('drivers')
      .select('id', { count: 'exact', head: true })
      .eq('is_online', true);

    if (countError) {
      console.error('❌ Error contando con head:', countError);
    } else {
      console.log(`📊 Conteo exacto: ${count}`);
    }

    // 4. Verificar users también
    console.log('\n👤 4. VERIFICAR TABLA USERS:');
    const { data: activeUsers, error: usersError } = await supabase
      .from('users')
      .select('id, name, role, is_active')
      .eq('role', 'repartidor')
      .eq('is_active', true);

    if (usersError) {
      console.error('❌ Error obteniendo users activos:', usersError);
    } else {
      console.log(`👥 Usuarios repartidores activos: ${activeUsers?.length || 0}`);
      activeUsers?.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.id}) - Active: ${user.is_active}`);
      });
    }

    console.log('\n✅ Diagnóstico completado');

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
}

debugDrivers();
