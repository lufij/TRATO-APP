export function copyLocationForDrivers(
  latitude: number, 
  longitude: number, 
  address: string, 
  businessName: string
): Promise<boolean> {
  const driverInfo = `📍 UBICACIÓN DEL NEGOCIO: ${businessName || 'Mi Negocio'}

🏠 Dirección: ${address}

📊 Coordenadas GPS exactas para navegador:
• Latitud: ${latitude.toFixed(6)}
• Longitud: ${longitude.toFixed(6)}

🗺️ Link directo Google Maps:
https://www.google.com/maps?q=${latitude},${longitude}

📱 Instrucciones para repartidor:
1. Toca el link de Google Maps
2. Activa tu GPS
3. Sigue las indicaciones hasta las coordenadas exactas
4. Busca el negocio: ${businessName || 'Mi Negocio'}`;

  if (navigator.clipboard) {
    return navigator.clipboard.writeText(driverInfo).then(() => true).catch(() => {
      // Fallback if clipboard API fails
      alert('Información para repartidor:\n\n' + driverInfo);
      return false;
    });
  } else {
    // Fallback for browsers without clipboard API
    alert('Información para repartidor:\n\n' + driverInfo);
    return Promise.resolve(false);
  }
}

export function openMapsForLocation(latitude: number, longitude: number): void {
  if (latitude && longitude) {
    const url = `https://www.google.com/maps/@${latitude},${longitude},18z`;
    window.open(url, '_blank');
  }
}

export function validateFormData(formData: {
  business_name: string;
  business_category: string;
}): string | null {
  if (!formData.business_name.trim()) {
    return 'El nombre del negocio es requerido';
  }

  if (!formData.business_category) {
    return 'La categoría del negocio es requerida';
  }

  return null;
}