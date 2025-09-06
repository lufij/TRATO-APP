// Utilidad para manejar fechas y horas en zona horaria de Guatemala (UTC-6)

/**
 * Convierte una fecha/hora UTC a la zona horaria de Guatemala (UTC-6)
 * @param utcDateString - String de fecha en formato ISO desde la base de datos
 * @returns Date object ajustado a Guatemala
 */
export function toGuatemalaTime(utcDateString: string): Date {
  const utcDate = new Date(utcDateString);
  // Guatemala está en UTC-6, así que restamos 6 horas
  const guatemalaOffset = -6; // UTC-6
  return new Date(utcDate.getTime() + (guatemalaOffset * 60 * 60 * 1000));
}

/**
 * Formatea una fecha/hora UTC como hora local de Guatemala
 * @param utcDateString - String de fecha en formato ISO desde la base de datos
 * @returns String formateado como "2:30 p.m."
 */
export function formatGuatemalaTime(utcDateString: string): string {
  const guatemalaTime = toGuatemalaTime(utcDateString);
  
  return guatemalaTime.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Formatea una fecha/hora UTC como fecha y hora completa de Guatemala
 * @param utcDateString - String de fecha en formato ISO desde la base de datos
 * @returns String formateado como "5 de septiembre, 2:30 p.m."
 */
export function formatGuatemalaDateTime(utcDateString: string): string {
  const guatemalaTime = toGuatemalaTime(utcDateString);
  
  return guatemalaTime.toLocaleString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Calcula el tiempo restante hasta una fecha de expiración en Guatemala
 * @param expiresAtUtc - String de fecha de expiración en UTC
 * @returns Object con información del tiempo restante
 */
export function getTimeUntilExpiration(expiresAtUtc: string) {
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
