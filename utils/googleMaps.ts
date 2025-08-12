interface GoogleMapsConfig {
  apiKey: string | undefined;
  isConfigured: boolean;
  scriptLoaded: boolean;
}

class GoogleMapsManager {
  private config: GoogleMapsConfig | null = null;

  private getConfig(): GoogleMapsConfig {
    if (this.config === null) {
      // Safely access environment variables with fallback
      let apiKey: string | undefined;
      try {
        apiKey = import.meta?.env?.VITE_GOOGLE_MAPS_API_KEY;
      } catch (error) {
        // Fallback for environments where import.meta.env is not available
        apiKey = undefined;
      }

      this.config = {
        apiKey,
        isConfigured: !!apiKey,
        scriptLoaded: false
      };
    }
    return this.config;
  }

  isConfigured(): boolean {
    return this.getConfig().isConfigured;
  }

  getApiKey(): string | undefined {
    return this.getConfig().apiKey;
  }

  async loadGoogleMapsScript(): Promise<void> {
    const config = this.getConfig();
    
    if (config.scriptLoaded || !config.apiKey) {
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${config.apiKey}&libraries=places&language=es&region=GT`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        config.scriptLoaded = true;
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps script'));
      };
      
      document.head.appendChild(script);
    });
  }

  async geocodeAddress(address: string): Promise<google.maps.GeocoderResult[]> {
    const config = this.getConfig();
    
    if (!config.scriptLoaded) {
      await this.loadGoogleMapsScript();
    }

    return new Promise((resolve, reject) => {
      const geocoder = new google.maps.Geocoder();
      
      geocoder.geocode(
        {
          address: address,
          region: 'GT',
          componentRestrictions: {
            country: 'GT',
            administrativeArea: 'Zacapa'
          }
        },
        (results, status) => {
          if (status === 'OK' && results) {
            resolve(results);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        }
      );
    });
  }

  formatLocationForDrivers(lat: number, lng: number, address: string): string {
    return `${address}\n\nCoordenadas GPS para repartidor:\nLatitud: ${lat.toFixed(6)}\nLongitud: ${lng.toFixed(6)}\n\nLink de Google Maps: https://www.google.com/maps?q=${lat},${lng}`;
  }

  // Reset configuration (useful for testing or re-initialization)
  resetConfig(): void {
    this.config = null;
  }
}

export const googleMapsManager = new GoogleMapsManager();
export type { GoogleMapsConfig };