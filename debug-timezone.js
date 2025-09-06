// Script de debugging para verificar zonas horarias
// Ejecutar en consola del navegador (F12 -> Console)

console.log('🕐 DIAGNÓSTICO DE TIEMPO - PRODUCTOS DEL DÍA');
console.log('='.repeat(50));

// 1. Verificar fecha/hora actual
const now = new Date();
console.log('📅 Fecha/hora actual (local):', now.toString());
console.log('📅 Fecha/hora actual (UTC):', now.toISOString());
console.log('📅 Zona horaria:', Intl.DateTimeFormat().resolvedOptions().timeZone);

// 2. Verificar productos del día y sus fechas de expiración
supabase.from('daily_products').select('name, expires_at, created_at').then(({ data, error }) => {
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('\n📦 PRODUCTOS DEL DÍA Y SUS FECHAS:');
  data?.forEach(product => {
    const expiresAt = new Date(product.expires_at);
    const createdAt = new Date(product.created_at);
    const diff = expiresAt.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    console.log(`\n--- ${product.name} ---`);
    console.log(`   Creado: ${createdAt.toString()}`);
    console.log(`   Expira: ${expiresAt.toString()}`);
    console.log(`   Expira UTC: ${product.expires_at}`);
    console.log(`   Tiempo restante: ${hours}h ${minutes}m`);
    console.log(`   ¿Es hoy?: ${createdAt.toDateString() === now.toDateString()}`);
  });
});

// 3. Simular cálculo de medianoche
const midnight = new Date();
midnight.setHours(23, 59, 59, 999);
console.log('\n🌙 MEDIANOCHE DE HOY:');
console.log('   Local:', midnight.toString()); 
console.log('   UTC:', midnight.toISOString());

const diffToMidnight = midnight.getTime() - now.getTime();
const hoursToMidnight = Math.floor(diffToMidnight / (1000 * 60 * 60));
const minutesToMidnight = Math.floor((diffToMidnight % (1000 * 60 * 60)) / (1000 * 60));
console.log(`   Faltan: ${hoursToMidnight}h ${minutesToMidnight}m para medianoche`);
