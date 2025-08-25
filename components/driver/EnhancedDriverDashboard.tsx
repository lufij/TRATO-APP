import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Truck, 
  User, 
  MapPin, 
  Package,
  Settings,
  Users
} from 'lucide-react';
import { DriverProfile } from './DriverProfile';
import { PublicDriversDisplay } from '../PublicDriversDisplay';

// Importar el dashboard original para las entregas
import { DriverDashboard as OriginalDriverDashboard } from './DriverDashboard';

type TabType = 'deliveries' | 'profile' | 'drivers' | 'settings';

export function EnhancedDriverDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('deliveries');

  if (!user || user.role !== 'repartidor') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">
              Esta sección es solo para repartidores verificados
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    {
      id: 'deliveries' as TabType,
      label: 'Entregas',
      icon: Package,
      description: 'Gestiona tus entregas activas y disponibles'
    },
    {
      id: 'profile' as TabType,
      label: 'Mi Perfil',
      icon: User,
      description: 'Configura tu perfil, foto y estado'
    },
    {
      id: 'drivers' as TabType,
      label: 'Repartidores',
      icon: Users,
      description: 'Ve otros repartidores activos'
    },
    {
      id: 'settings' as TabType,
      label: 'Configuración',
      icon: Settings,
      description: 'Ajustes y preferencias'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'deliveries':
        return <OriginalDriverDashboard />;
      case 'profile':
        return <DriverProfile />;
      case 'drivers':
        return (
          <div className="max-w-4xl mx-auto p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Repartidores Activos</h2>
              <p className="text-gray-600">Ve otros repartidores que están en línea</p>
            </div>
            <PublicDriversDisplay />
          </div>
        );
      case 'settings':
        return (
          <div className="max-w-4xl mx-auto p-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configuración
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Configuraciones adicionales disponibles próximamente.</p>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return <OriginalDriverDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con navegación */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Truck className="w-8 h-8 text-orange-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Dashboard Repartidor</h1>
                  <p className="text-sm text-gray-500">¡Hola, {user.name}!</p>
                </div>
              </div>
            </div>

            <Badge variant="outline" className="text-orange-600 border-orange-600">
              Repartidor
            </Badge>
          </div>
        </div>
      </div>

      {/* Navegación por tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido de las tabs */}
      <div className="flex-1">
        {renderTabContent()}
      </div>
    </div>
  );
}
