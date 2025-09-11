import { useState } from 'react';
import { WeeklyHours, DEFAULT_WEEKLY_HOURS, DAYS_OF_WEEK } from '../constants/business';

// Función para convertir tiempo 24h a 12h
const formatTime12Hour = (time24: string): string => {
  if (!time24) return '';
  
  const [hours, minutes] = time24.split(':');
  const hour24 = parseInt(hours, 10);
  
  if (hour24 === 0) {
    return `12:${minutes} AM`;
  } else if (hour24 < 12) {
    return `${hour24}:${minutes} AM`;
  } else if (hour24 === 12) {
    return `12:${minutes} PM`;
  } else {
    return `${hour24 - 12}:${minutes} PM`;
  }
};

export function useWeeklyHours(initialHours?: string) {
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours>(() => {
    if (initialHours) {
      try {
        return JSON.parse(initialHours);
      } catch (e) {
        console.log('Using default weekly hours');
      }
    }
    return DEFAULT_WEEKLY_HOURS;
  });

  const updateWeeklyHours = (day: string, field: string, value: any) => {
    setWeeklyHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  // Nueva función para aplicar horarios a múltiples días
  const applyHoursToAllDays = (openTime: string, closeTime: string, isOpen: boolean = true) => {
    setWeeklyHours(prev => {
      const newHours = { ...prev };
      DAYS_OF_WEEK.forEach(day => {
        newHours[day.key] = {
          isOpen,
          openTime,
          closeTime
        };
      });
      return newHours;
    });
  };

  // Función para aplicar horarios solo a días laborables
  const applyHoursToWeekdays = (openTime: string, closeTime: string, isOpen: boolean = true) => {
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    setWeeklyHours(prev => {
      const newHours = { ...prev };
      weekdays.forEach(day => {
        newHours[day] = {
          isOpen,
          openTime,
          closeTime
        };
      });
      return newHours;
    });
  };

  const generateWeeklyHoursText = () => {
    const openDays = DAYS_OF_WEEK.filter(day => weeklyHours[day.key].isOpen);
    if (openDays.length === 0) return 'Cerrado toda la semana';
    
    // Generar texto optimizado para móvil con formato 12 horas
    return openDays.map(day => {
      const hours = weeklyHours[day.key];
      const openTime12 = formatTime12Hour(hours.openTime);
      const closeTime12 = formatTime12Hour(hours.closeTime);
      return `${day.short}: ${openTime12} - ${closeTime12}`;
    }).join('\n'); // Usar saltos de línea en lugar de comas para móvil
  };

  const getHoursAsJSON = () => JSON.stringify(weeklyHours);

  return {
    weeklyHours,
    setWeeklyHours,
    updateWeeklyHours,
    applyHoursToAllDays,
    applyHoursToWeekdays,
    generateWeeklyHoursText,
    getHoursAsJSON
  };
}