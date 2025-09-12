/**
 * Sistema de gestión de estados de negocio
 * Maneja apertura/cierre individual por vendedor
 */

// Tipos para el estado del negocio
export interface BusinessStatus {
  isOpen: boolean;
  reason: 'open' | 'closed-manual' | 'closed-schedule' | 'closed-both';
  message: string;
  canOrder: boolean;
}

export interface SellerInfo {
  id: string;
  business_name: string;
  is_open_now?: boolean;
  weekly_hours?: any;
}

/**
 * Determina si un negocio está abierto según horarios programados
 * @param weeklyHours - Objeto JSON con horarios por día de la semana
 * @returns true si está abierto por horario, false si está cerrado
 */
function isOpenBySchedule(weeklyHours: any): boolean {
  console.log('🕐 CHECKING SCHEDULE FOR:', weeklyHours);
  
  if (!weeklyHours || typeof weeklyHours !== 'object') {
    console.log('📅 NO SCHEDULE DATA - defaulting to OPEN');
    return true; // Sin horarios = siempre abierto
  }

  // Si weeklyHours es un string JSON, parsearlo
  let parsedHours;
  if (typeof weeklyHours === 'string') {
    try {
      parsedHours = JSON.parse(weeklyHours);
      console.log('📊 PARSED HOURS FROM JSON:', parsedHours);
    } catch (e) {
      console.log('❌ FAILED TO PARSE JSON - defaulting to OPEN');
      return true;
    }
  } else {
    parsedHours = weeklyHours;
  }

  // Si es un objeto vacío, significa siempre abierto
  if (Object.keys(parsedHours).length === 0) {
    console.log('📅 EMPTY SCHEDULE - defaulting to OPEN');
    return true;
  }

  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutos desde medianoche

  console.log('🗓️ TODAY IS:', currentDay, 'CURRENT TIME:', now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0'));

  const todaySchedule = parsedHours[currentDay];
  console.log('📋 TODAY SCHEDULE:', todaySchedule);
  
  if (!todaySchedule || todaySchedule === null) {
    console.log('❌ NO SCHEDULE FOR TODAY - CLOSED');
    return false; // Sin horario para hoy = cerrado
  }

  // Manejar diferentes formatos de horarios
  let openTime: string, closeTime: string, isOpen: boolean;
  
  if (typeof todaySchedule === 'object') {
    // Formato nuevo: {isOpen: true, openTime: "08:00", closeTime: "18:00"}
    if ('isOpen' in todaySchedule && 'openTime' in todaySchedule && 'closeTime' in todaySchedule) {
      if (!todaySchedule.isOpen) {
        console.log('❌ MARKED AS CLOSED FOR TODAY - CLOSED');
        return false; // Cerrado todo el día
      }
      openTime = todaySchedule.openTime;
      closeTime = todaySchedule.closeTime;
      console.log(`⏰ BUSINESS HOURS TODAY: ${openTime} - ${closeTime}`);
    }
    // Formato anterior: {open: "09:00", close: "18:00"}
    else if ('open' in todaySchedule && 'close' in todaySchedule) {
      openTime = todaySchedule.open;
      closeTime = todaySchedule.close;
      console.log(`⏰ BUSINESS HOURS TODAY (old format): ${openTime} - ${closeTime}`);
    } else {
      console.log('📅 INVALID FORMAT - defaulting to OPEN');
      return true; // Formato inválido = abierto por defecto
    }

    const [openHour, openMin] = openTime.split(':').map(Number);
    const [closeHour, closeMin] = closeTime.split(':').map(Number);
    
    const openTimeMin = openHour * 60 + openMin;
    const closeTimeMin = closeHour * 60 + closeMin;
    
    const isWithinHours = currentTime >= openTimeMin && currentTime <= closeTimeMin;
    
    console.log(`🕒 TIME CHECK: Current ${currentTime}min vs Open ${openTimeMin}min-${closeTimeMin}min = ${isWithinHours ? 'OPEN' : 'CLOSED'}`);
    
    return isWithinHours;
  }

  console.log('📅 UNEXPECTED FORMAT - defaulting to OPEN');
  return true; // Formato inválido = abierto por defecto
}

/**
 * Evalúa el estado completo de un negocio
 * Combina estado manual (is_open_now) + horarios programados (weekly_hours)
 */
export function getBusinessStatus(seller: SellerInfo): BusinessStatus {
  const manuallyOpen = seller.is_open_now ?? true; // Default abierto si no existe
  const openBySchedule = isOpenBySchedule(seller.weekly_hours);

  console.log('🏪 BUSINESS STATUS DEBUG:', {
    sellerId: seller.id,
    businessName: seller.business_name,
    manuallyOpen,
    openBySchedule,
    weeklyHours: seller.weekly_hours
  });

  // Lógica profesional: ambas condiciones deben cumplirse
  if (manuallyOpen && openBySchedule) {
    console.log('✅ RESULT: OPEN (both conditions true)');
    return {
      isOpen: true,
      reason: 'open',
      message: 'Negocio abierto',
      canOrder: true
    };
  }

  if (!manuallyOpen && !openBySchedule) {
    console.log('❌ RESULT: CLOSED (both conditions false)');
    return {
      isOpen: false,
      reason: 'closed-both',
      message: 'Cerrado hoy',
      canOrder: false
    };
  }

  if (!manuallyOpen) {
    console.log('❌ RESULT: CLOSED (manual toggle off)');
    return {
      isOpen: false,
      reason: 'closed-manual', 
      message: 'Cerrado hoy',
      canOrder: false
    };
  }

  // !openBySchedule
  console.log('❌ RESULT: CLOSED (schedule closed)');
  return {
    isOpen: false,
    reason: 'closed-schedule',
    message: 'Cerrado hoy', 
    canOrder: false
  };
}

/**
 * Determina el mensaje y comportamiento del botón "Agregar al carrito"
 */
export function getAddToCartButtonInfo(businessStatus: BusinessStatus) {
  if (businessStatus.canOrder) {
    return {
      canAdd: true,
      buttonText: 'Agregar al carrito',
      alertMessage: null,
      buttonClass: 'bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600 text-white'
    };
  }

  return {
    canAdd: false,
    buttonText: 'Cerrado hoy',
    alertMessage: `${businessStatus.message}. Este negocio no está disponible para pedidos en este momento.`,
    buttonClass: 'bg-gray-400 hover:bg-gray-400 text-gray-600 cursor-not-allowed'
  };
}