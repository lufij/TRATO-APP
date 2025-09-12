// Test directo de la funcionalidad
// Simular que hoy es viernes para el test

console.log('='.repeat(60));
console.log('🧪 TEST DE ESTADO DE NEGOCIO - VIERNES CERRADO');
console.log('='.repeat(60));

// Simular datos como los que vienen de la base de datos
const testSeller = {
  id: 'test-seller-123',
  business_name: 'Mi Restaurante',
  is_open_now: true, // Toggle manual ABIERTO
  // business_hours como string JSON (como viene de Supabase)
  business_hours: JSON.stringify({
    monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },  
    wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    friday: { isOpen: false, openTime: '09:00', closeTime: '18:00' }, // ❌ CERRADO VIERNES
    saturday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    sunday: { isOpen: true, openTime: '09:00', closeTime: '18:00' }
  })
};

// Simular producto con estado de negocio
const testProduct = {
  id: 'producto-123',
  name: 'Pizza Hawaiana',
  price: 85.00,
  seller: {
    id: testSeller.id,
    business_name: testSeller.business_name,
    is_open_now: testSeller.is_open_now,
    business_hours: testSeller.business_hours
  },
  businessStatus: null // Se asignará después
};

console.log('📊 Datos de prueba:');
console.log('- Seller ID:', testSeller.id);
console.log('- Toggle manual (is_open_now):', testSeller.is_open_now);
console.log('- Horario viernes:', JSON.parse(testSeller.business_hours).friday);
console.log('- Día actual:', ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][new Date().getDay()]);

// Test esperado: Debería estar CERRADO porque:
// - Toggle manual = true (ABIERTO) ✅
// - Horario viernes = false (CERRADO) ❌  
// Resultado = CERRADO (ambas condiciones deben cumplirse)

export { testSeller, testProduct };