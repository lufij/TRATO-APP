export interface BusinessHours {
  monday?: { open: string; close: string };
  tuesday?: { open: string; close: string };
  wednesday?: { open: string; close: string };
  thursday?: { open: string; close: string };
  friday?: { open: string; close: string };
  saturday?: { open: string; close: string };
  sunday?: { open: string; close: string };
}

export function formatBusinessHours(hours: string | null | undefined): string {
  if (!hours) return 'Horario no disponible';

  try {
    const businessHours: BusinessHours = JSON.parse(hours);
    const daysTranslation: { [key: string]: string } = {
      monday: 'Lunes',
      tuesday: 'Martes',
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
      sunday: 'Domingo'
    };

    const formattedHours = Object.entries(businessHours)
      .filter(([_, value]) => value && value.open && value.close)
      .map(([day, value]) => {
        if (!value) return '';
        return `${daysTranslation[day]}: ${value.open} - ${value.close}`;
      })
      .filter(Boolean);

    return formattedHours.length > 0 
      ? formattedHours.join('\n') 
      : 'Horario no disponible';
  } catch (e) {
    console.error('Error parsing business hours:', e);
    return 'Horario no disponible';
  }
}

export function isBusinessOpen(hours: string | null | undefined): boolean {
  if (!hours) return false;

  try {
    const businessHours: BusinessHours = JSON.parse(hours);
    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[now.getDay()];
    const currentTime = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const todayHours = businessHours[currentDay as keyof BusinessHours];
    if (!todayHours || !todayHours.open || !todayHours.close) return false;

    // Convertir horas a minutos para comparación
    const currentMinutes = timeToMinutes(currentTime);
    const openMinutes = timeToMinutes(todayHours.open);
    const closeMinutes = timeToMinutes(todayHours.close);

    // Manejo de horarios que cruzan la medianoche
    if (closeMinutes < openMinutes) {
      return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
    }

    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  } catch (e) {
    console.error('Error checking business hours:', e);
    return false;
  }
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
