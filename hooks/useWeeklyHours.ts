import { useState } from 'react';
import { WeeklyHours, DEFAULT_WEEKLY_HOURS, DAYS_OF_WEEK } from '../constants/business';

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

  const generateWeeklyHoursText = () => {
    const openDays = DAYS_OF_WEEK.filter(day => weeklyHours[day.key].isOpen);
    if (openDays.length === 0) return 'Cerrado toda la semana';
    
    return openDays.map(day => {
      const hours = weeklyHours[day.key];
      return `${day.short}: ${hours.openTime}-${hours.closeTime}`;
    }).join(', ');
  };

  const getHoursAsJSON = () => JSON.stringify(weeklyHours);

  return {
    weeklyHours,
    setWeeklyHours,
    updateWeeklyHours,
    generateWeeklyHoursText,
    getHoursAsJSON
  };
}