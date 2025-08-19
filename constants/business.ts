export const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunes', short: 'Lun' },
  { key: 'tuesday', label: 'Martes', short: 'Mar' },
  { key: 'wednesday', label: 'Miércoles', short: 'Mié' },
  { key: 'thursday', label: 'Jueves', short: 'Jue' },
  { key: 'friday', label: 'Viernes', short: 'Vie' },
  { key: 'saturday', label: 'Sábado', short: 'Sáb' },
  { key: 'sunday', label: 'Domingo', short: 'Dom' }
];

export const BUSINESS_CATEGORIES = [
  'Restaurante',
  'Comida Rápida',
  'Cafetería',
  'Panadería',
  'Carnicería',
  'Farmacia',
  'Supermercado',
  'Tienda de Conveniencia',
  'Electrónicos',
  'Ropa y Accesorios',
  'Hogar y Decoración',
  'Belleza y Cuidado Personal',
  'Librería y Papelería',
  'Ferretería',
  'Floristería',
  'Otros'
];

export const DEFAULT_WEEKLY_HOURS = {
  monday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
  tuesday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
  wednesday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
  thursday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
  friday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
  saturday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  sunday: { isOpen: false, openTime: '09:00', closeTime: '15:00' }
};

export interface WeeklyHours {
  [key: string]: {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  };
}

// Safe function to check Google Maps configuration
export function checkGoogleMapsConfig(): boolean {
  try {
    return !!(import.meta && (import.meta as any).env && (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY);
  } catch (error) {
    return false;
  }
}