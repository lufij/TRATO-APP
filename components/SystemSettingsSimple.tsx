import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  Users, 
  Store, 
  Settings, 
  Bell, 
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

export function SystemSettingsSimple() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    appName: 'TRATO',
    maintenanceMode: false,
    allowRegistrations: true,
    deliveryFee: 10,
    platformCommission: 5
  });

  const tabs = [
    { id: 'general', name: 'General', icon: Settings },
    { id: 'delivery', name: 'Entrega', icon: Store },
    { id: 'users', name: 'Usuarios', icon: Users },
    { id: 'notifications', name: 'Notificaciones', icon: Bell },
    { id: 'security', name: 'Seguridad', icon: Shield }
  ];

  const handleSave = () => {
    toast.success('Configuración guardada correctamente');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h2>
        <p className="text-muted-foreground">
          Administra todos los aspectos de tu plataforma desde aquí.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                }`}
              >
                <IconComponent className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'general' && (
          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre de la Aplicación</label>
                <Input
                  value={settings.appName}
                  onChange={(e) => setSettings({...settings, appName: e.target.value})}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="maintenance"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings({...settings, maintenanceMode: e.target.checked})}
                />
                <label htmlFor="maintenance" className="text-sm font-medium">
                  Modo Mantenimiento
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="registrations"
                  checked={settings.allowRegistrations}
                  onChange={(e) => setSettings({...settings, allowRegistrations: e.target.checked})}
                />
                <label htmlFor="registrations" className="text-sm font-medium">
                  Permitir Nuevos Registros
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'delivery' && (
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Entrega</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tarifa de Entrega (Bs)</label>
                <Input
                  type="number"
                  value={settings.deliveryFee}
                  onChange={(e) => setSettings({...settings, deliveryFee: parseInt(e.target.value)})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Comisión de Plataforma (%)</label>
                <Input
                  type="number"
                  value={settings.platformCommission}
                  onChange={(e) => setSettings({...settings, platformCommission: parseInt(e.target.value)})}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'users' && (
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">25</div>
                    <div className="text-sm text-muted-foreground">Compradores</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">8</div>
                    <div className="text-sm text-muted-foreground">Vendedores</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">5</div>
                    <div className="text-sm text-muted-foreground">Repartidores</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'notifications' && (
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Notificaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configurar las preferencias de notificación del sistema.
                </p>
                <Badge variant="outline">Próximamente</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'security' && (
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Seguridad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configurar las políticas de seguridad del sistema.
                </p>
                <Badge variant="outline">Próximamente</Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline">Cancelar</Button>
        <Button onClick={handleSave}>Guardar Cambios</Button>
      </div>
    </div>
  );
}
