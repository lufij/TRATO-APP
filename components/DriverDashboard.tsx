import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Truck, Package, Clock, DollarSign } from 'lucide-react';

export function DriverDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Truck className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Dashboard del Repartidor</h1>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <Package className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Entregas Hoy</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <DollarSign className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ganancias</p>
              <p className="text-2xl font-bold">$0</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <Clock className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tiempo Activo</p>
              <p className="text-2xl font-bold">0h</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <Package className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Completadas</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Entregas Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No hay entregas disponibles en este momento.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entregas Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No tienes entregas activas.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DriverDashboard;
