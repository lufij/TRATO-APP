import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { GPSErrorRecovery } from './GPSErrorRecovery';
import { 
  Satellite, 
  Shield, 
  Target, 
  CheckCircle, 
  Loader2, 
  Map, 
  Navigation 
} from 'lucide-react';

interface LocationSectionProps {
  locationVerified: boolean;
  locationDetails: string;
  formData: {
    address: string;
    latitude: number;
    longitude: number;
    business_name: string;
  };
  setFormData: (updater: (prev: any) => any) => void;
  isEditing: boolean;
  showGPSError: boolean;
  gpsError: string | null;
  gpsLoading: boolean;
  permissionState: PermissionState | null;
  detectLocationProfessional: () => void;
  handleGPSErrorRetry: () => void;
  handleGPSErrorDismiss: () => void;
  openMapsForLocation: () => void;
  copyLocationForDrivers: () => void;
}

export function LocationSection({
  locationVerified,
  locationDetails,
  formData,
  setFormData,
  isEditing,
  showGPSError,
  gpsError,
  gpsLoading,
  permissionState,
  detectLocationProfessional,
  handleGPSErrorRetry,
  handleGPSErrorDismiss,
  openMapsForLocation,
  copyLocationForDrivers
}: LocationSectionProps) {
  return (
    <Card className={`border-2 ${!locationVerified ? 'border-orange-400 bg-gradient-to-r from-orange-50 to-red-50' : 'border-green-400 bg-gradient-to-r from-green-50 to-blue-50'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Satellite className="w-5 h-5 text-red-500" />
            Ubicación GPS del Negocio
          </CardTitle>
          {locationVerified && (
            <Badge className="bg-green-500 text-white flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Verificada GPS
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* GPS Error Recovery Component */}
        {showGPSError && gpsError && (
          <GPSErrorRecovery
            error={gpsError}
            onRetry={handleGPSErrorRetry}
            onDismiss={handleGPSErrorDismiss}
            loading={gpsLoading}
            permissionState={permissionState}
          />
        )}

        {/* Location Status Alert */}
        {!locationVerified ? (
          <Alert className="border-red-300 bg-red-50">
            <Target className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>🚨 UBICACIÓN GPS REQUERIDA</strong><br />
              Los repartidores necesitan tu ubicación GPS exacta para encontrar tu negocio.
              Sin esto, no podrán realizar entregas correctamente.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-300 bg-green-100">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>✅ Ubicación GPS Verificada</strong><br />
              📍 <strong>Coordenadas:</strong> {locationDetails}<br />
              Los repartidores podrán encontrar tu negocio sin problemas.
            </AlertDescription>
          </Alert>
        )}

        <div>
          <Label htmlFor="address">Dirección Completa</Label>
          <div className="flex gap-2">
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              disabled={!isEditing}
              placeholder="Calle, colonia, referencias..."
              className="flex-1"
            />
          </div>
        </div>

        {/* PROFESSIONAL GPS VERIFICATION SECTION */}
        {isEditing && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
            <div className="text-center space-y-4">
              <div className="bg-white bg-opacity-20 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                <Satellite className="w-10 h-10 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-xl mb-2">Verificación GPS Profesional</h4>
                <p className="text-blue-100 mb-4">
                  Sistema de geolocalización de alta precisión.
                  <br />
                  <strong>¡IMPORTANTE!</strong> Esta ubicación será utilizada por los repartidores para encontrar tu negocio.
                </p>
              </div>
              
              <Button
                type="button"
                onClick={detectLocationProfessional}
                disabled={gpsLoading}
                size="lg"
                className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold py-4 text-lg shadow-lg"
              >
                {gpsLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    Detectando ubicación GPS...
                  </>
                ) : (
                  <>
                    <Target className="w-6 h-6 mr-3" />
                    {locationVerified ? 'ACTUALIZAR UBICACIÓN GPS' : 'VERIFICAR UBICACIÓN GPS AHORA'}
                  </>
                )}
              </Button>

              <div className="text-xs text-blue-200 space-y-1">
                <p>✓ Detección automática con GPS</p>
                <p>✓ Validación para área de Gualán</p>
                <p>✓ Información optimizada para repartidores</p>
                <p>✓ Funciona sin configuración adicional</p>
              </div>
            </div>
          </div>
        )}

        {/* GPS Results Display */}
        {formData.latitude && formData.longitude && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-green-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Coordenadas GPS Verificadas
              </span>
            </div>
            
            <div className="bg-white rounded p-3 border border-green-200">
              <div className="text-sm text-green-700 space-y-1">
                <p><strong>Latitud:</strong> {formData.latitude.toFixed(6)}</p>
                <p><strong>Longitud:</strong> {formData.longitude.toFixed(6)}</p>
                <p><strong>Dirección:</strong> {formData.address}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openMapsForLocation}
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                <Map className="w-4 h-4 mr-1" />
                Ver en Google Maps
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={copyLocationForDrivers}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                <Navigation className="w-4 h-4 mr-1" />
                Copiar para Repartidores
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}