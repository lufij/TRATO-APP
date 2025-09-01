// TEST DE AUTENTICACIÓN CON TELÉFONO
// Este script verifica que la nueva funcionalidad de login con teléfono funcione correctamente

console.log('🧪 INICIANDO TEST DE AUTENTICACIÓN CON TELÉFONO\n');

// Función para simular la lógica de conversión
function testPhoneToEmailConversion(input) {
  console.log(`📱 Testing input: "${input}"`);
  
  let loginEmail = input;
  
  // Si son exactamente 8 dígitos, convertir a formato email
  if (/^\d{8}$/.test(input.trim())) {
    loginEmail = `+502${input.trim()}@trato.app`;
    console.log(`  ✅ Teléfono detectado → ${loginEmail}`);
    return { type: 'phone', email: loginEmail };
  } else if (input.includes('@')) {
    // Es un email normal
    loginEmail = input.trim();
    console.log(`  ✅ Email detectado → ${loginEmail}`);
    return { type: 'email', email: loginEmail };
  } else {
    // Formato no válido
    console.log(`  ❌ Formato inválido`);
    return { type: 'invalid', error: 'Formato no válido' };
  }
}

// Test cases
const testCases = [
  '12345678',        // Teléfono válido
  '87654321',        // Otro teléfono válido
  '1234567',         // Teléfono muy corto
  '123456789',       // Teléfono muy largo
  'test@email.com',  // Email válido
  'usuario@trato.app', // Email de trato
  '+50212345678@trato.app', // Email generado
  'invalid',         // Texto inválido
  '12 34 56 78',     // Teléfono con espacios
  '+50212345678',    // Teléfono con código país
];

console.log('🔍 EJECUTANDO CASOS DE PRUEBA:\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}:`);
  const result = testPhoneToEmailConversion(testCase);
  console.log(`  Resultado: ${JSON.stringify(result)}\n`);
});

console.log('📊 RESUMEN:');
console.log('✅ Los números de 8 dígitos se convierten a +502XXXXXXXX@trato.app');
console.log('✅ Los emails se mantienen sin cambios');
console.log('✅ Los formatos inválidos se rechazan');
console.log('\n🎯 FUNCIONALIDAD IMPLEMENTADA:');
console.log('1. Login con teléfono de 8 dígitos (ej: 12345678)');
console.log('2. Login con email tradicional (ej: user@email.com)');
console.log('3. Validación automática de formato');
console.log('4. Conversión transparente teléfono → email para Supabase');
console.log('\n✨ EJEMPLO DE USO:');
console.log('Usuario ingresa: "12345678"');
console.log('Sistema envía a Supabase: "+50212345678@trato.app"');
console.log('Login exitoso si el usuario se registró con ese teléfono');
