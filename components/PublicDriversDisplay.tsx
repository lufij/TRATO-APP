import React from 'react';
import { Users, Car, Star, MapPin, Clock, Shield } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useDrivers } from '../contexts/DriverContext';

export function PublicDriversDisplay() {
  const { availableDrivers, onlineDriversCount, isLoading } = useDrivers();

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <span className="ml-2 text-gray-600">Cargando repartidores...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Estadísticas generales */}
      <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8" />
              <div>
                <h3 className="text-2xl font-bold">{onlineDriversCount}</h3>
                <p className="opacity-90">Repartidores en línea</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">
                {onlineDriversCount > 0 ? 'Entregas disponibles' : 'No hay repartidores'}
              </p>
              <p className="text-sm opacity-90">
                {onlineDriversCount > 0 ? 'Pedidos se entregan rápidamente' : 'Intenta más tarde'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de repartidores disponibles */}
      {onlineDriversCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Repartidores Disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableDrivers
                .filter(driver => driver.is_online)
                .slice(0, 6) // Mostrar máximo 6 repartidores
                .map((driver) => (
                  <div
                    key={driver.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={driver.profile_image} />
                      <AvatarFallback className="bg-orange-100 text-orange-600">
                        {driver.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{driver.name}</h4>
                        {driver.is_verified && (
                          <Shield className="w-4 h-4 text-green-600" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Car className="w-4 h-4" />
                        <span>{driver.vehicle_type}</span>
                      </div>

                      <div className="flex items-center gap-3 text-sm">
                        {driver.rating && driver.rating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span>{driver.rating.toFixed(1)}</span>
                          </div>
                        )}

                        <Badge variant="outline" className="text-xs">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                          En línea
                        </Badge>
                      </div>

                      {driver.total_deliveries && driver.total_deliveries > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {driver.total_deliveries} entregas completadas
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {availableDrivers.filter(d => d.is_online).length > 6 && (
              <p className="text-center text-sm text-gray-500 mt-4">
                Y {availableDrivers.filter(d => d.is_online).length - 6} repartidores más disponibles
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estado cuando no hay repartidores */}
      {onlineDriversCount === 0 && (
        <Card className="border-gray-200">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                No hay repartidores en línea
              </h3>
              <p className="text-gray-500 mb-4">
                Actualmente no hay repartidores disponibles en tu área.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                <span>Intenta hacer tu pedido más tarde</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información adicional */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-800 mb-1">
                Entregas en tiempo real
              </h4>
              <p className="text-sm text-blue-700">
                Nuestros repartidores están verificados y equipados con GPS para que puedas 
                seguir tu pedido en tiempo real desde que sale del negocio hasta tu puerta.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
