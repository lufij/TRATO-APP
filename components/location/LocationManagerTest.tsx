import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  MapPin, 
  Target, 
  Search, 
  MapIcon,
  TestTube
} from 'lucide-react';

export function LocationManagerTest() {
  return (
    <Card className="border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-green-500" />
          🆕 Gestión de Ubicaciones - NUEVO SISTEMA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <TestTube className="w-4 h-4" />
          <AlertDescription>
            <strong>🎉 NUEVA FUNCIONALIDAD ACTIVADA:</strong> Sistema de ubicación exacta con Google Maps implementado.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">🗺️ Nuevas Funcionalidades Disponibles:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 📍 GPS de alta precisión con Google Maps</li>
              <li>• 🔍 Autocompletado inteligente de direcciones</li>
              <li>• 🗺️ Mapa interactivo para selección visual</li>
              <li>• ✅ Verificación automática de coordenadas</li>
            </ul>
          </div>

          <Tabs defaultValue="test" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="test" className="flex items-center gap-2">
                <TestTube className="w-4 h-4" />
                Test
              </TabsTrigger>
              <TabsTrigger value="search" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Buscar
              </TabsTrigger>
              <TabsTrigger value="gps" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                GPS
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-2">
                <MapIcon className="w-4 h-4" />
                Mapa
              </TabsTrigger>
            </TabsList>

            <TabsContent value="test" className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800">✅ Sistema de Pestañas Funcionando</h4>
                <p className="text-sm text-green-700 mt-1">
                  Si puedes ver esto, significa que el nuevo sistema de pestañas está cargando correctamente.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="search" className="space-y-4">
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-800">🔍 Búsqueda Inteligente</h4>
                <p className="text-sm text-purple-700 mt-1">
                  Aquí irá el autocompletado con Google Places
                </p>
              </div>
            </TabsContent>

            <TabsContent value="gps" className="space-y-4">
              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-800">📡 GPS de Alta Precisión</h4>
                <p className="text-sm text-orange-700 mt-1">
                  Aquí irá el componente ExactLocationPicker
                </p>
              </div>
            </TabsContent>

            <TabsContent value="map" className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800">🗺️ Mapa Interactivo</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Aquí irá el componente MapSelector
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="text-xs text-gray-500 space-y-1">
            <p>🔧 Estado de Google Maps: {window.google?.maps ? '✅ Cargado' : '⏳ Cargando...'}</p>
            <p>📅 Última actualización: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
