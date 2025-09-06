// Script de prueba para verificar las funciones de tiempo de Guatemala
// Ejecutar en la consola del navegador

console.log('🇬🇹 PRUEBA DE FUNCIONES DE TIEMPO DE GUATEMALA');
console.log('================================================');

// Importar las funciones (simulación para el navegador)
function toGuatemalaTime(utcDateString) {
  const utcDate = new Date(utcDateString);
  const guatemalaOffset = -6; // UTC-6
  return new Date(utcDate.getTime() + (guatemalaOffset * 60 * 60 * 1000));
}

function formatGuatemalaTime(utcDateString) {
  const guatemalaTime = toGuatemalaTime(utcDateString);
  
  return guatemalaTime.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function getTimeUntilExpiration(expiresAtUtc) {
  const now = new Date();
  const expirationTime = new Date(expiresAtUtc);
  
  const difference = expirationTime.getTime() - now.getTime();

  if (difference <= 0) {
    return {
      isExpired: true,
      formattedTime: 'Expirado',
      hours: 0,
      minutes: 0
    };
  }

  const hours = Math.floor(difference / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

  return {
    isExpired: false,
    formattedTime: `${hours}h ${minutes}m`,
    hours,
    minutes
  };
}

// Fecha/hora actual
const now = new Date();
console.log('⏰ Fecha/hora actual:', now.toString());
console.log('🌐 UTC actual:', now.toISOString());

// Simular fecha de creación UTC (como viene de la base de datos)
// Ejemplo: si se creó hoy a las 12:03 PM hora de Guatemala
const guatemalaNoon = new Date();
guatemalaNoon.setHours(12, 3, 0, 0); // 12:03 PM Guatemala
const utcCreationTime = new Date(guatemalaNoon.getTime() + (6 * 60 * 60 * 1000)); // Convertir a UTC (+6 horas)

console.log('\n📝 PRUEBA DE CREACIÓN:');
console.log('⏰ Hora creación Guatemala (real):', guatemalaNoon.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true }));
console.log('🌐 Hora creación UTC (base datos):', utcCreationTime.toISOString());
console.log('✨ Resultado función:', formatGuatemalaTime(utcCreationTime.toISOString()));

// Simular fecha de expiración (hoy a las 11:59 PM Guatemala)
const guatemalaExpiration = new Date();
guatemalaExpiration.setHours(23, 59, 0, 0); // 11:59 PM Guatemala
const utcExpirationTime = new Date(guatemalaExpiration.getTime() + (6 * 60 * 60 * 1000)); // Convertir a UTC (+6 horas)

console.log('\n⏰ PRUEBA DE EXPIRACIÓN:');
console.log('🎯 Expira Guatemala (real):', guatemalaExpiration.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true }));
console.log('🌐 Expira UTC (base datos):', utcExpirationTime.toISOString());
console.log('⌛ Tiempo restante:', getTimeUntilExpiration(utcExpirationTime.toISOString()));

console.log('\n✅ Si los resultados muestran las horas correctas de Guatemala, ¡el problema está solucionado!');
