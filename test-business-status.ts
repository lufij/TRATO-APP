import { getBusinessStatus } from './utils/businessStatus';

// Test con datos simulados de un negocio cerrado los viernes
const testSellerCerradoViernes = {
  id: 'test-seller-1',
  business_name: 'Test Restaurant',
  is_open_now: true, // Toggle manual ABIERTO
  weekly_hours: JSON.stringify({
    monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    friday: { isOpen: false, openTime: '09:00', closeTime: '18:00' }, // CERRADO VIERNES
    saturday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    sunday: { isOpen: true, openTime: '09:00', closeTime: '18:00' }
  })
};

console.log('🧪 TEST 1: Vendedor con toggle ABIERTO pero viernes CERRADO por horario');
console.log('Datos del seller:', testSellerCerradoViernes);

const result1 = getBusinessStatus(testSellerCerradoViernes);
console.log('Resultado:', result1);

console.log('\n' + '='.repeat(50) + '\n');

// Test con datos simulados de un negocio con toggle cerrado
const testSellerToggleCerrado = {
  id: 'test-seller-2', 
  business_name: 'Test Restaurant 2',
  is_open_now: false, // Toggle manual CERRADO
  weekly_hours: JSON.stringify({
    monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' }, // ABIERTO VIERNES
    saturday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    sunday: { isOpen: true, openTime: '09:00', closeTime: '18:00' }
  })
};

console.log('🧪 TEST 2: Vendedor con toggle CERRADO pero viernes ABIERTO por horario');
console.log('Datos del seller:', testSellerToggleCerrado);

const result2 = getBusinessStatus(testSellerToggleCerrado);
console.log('Resultado:', result2);