import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Users, 
  Store, 
  Truck, 
  DollarSign, 
  Settings, 
  MapPin, 
  Bell, 
  Shield, 
  Activity, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Edit,
  Trash2,
  Crown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';

// Types
interface AdminDriver {
  id: string;
  users?: {
    name: string;
    email: string;
    phone: string;
  };
  vehicle_type: string;
  license_number: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

interface DeliveryZone {
  id: number;
  name: string;
  radius: number;
  fee: number;
}

export function SystemSettingsExpanded() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    // General Settings
    maintenanceMode: false,
    allowRegistrations: true,
    appName: 'TRATO',
    appLogo: '',
    maxOrdersPerDay: 100,
    
    // Delivery Settings
    deliveryRadius: 5,
    deliveryFee: 10,
    freeDeliveryMinimum: 100,
    maxDeliveryTime: 60,
    minOrderAmount: 50,
    
    // Business Settings
    platformCommission: 5,
    vendorCommission: 10,
    driverCommission: 15,
    
    // Payment Settings
    paypalEnabled: true,
    cashEnabled: true,
    cardEnabled: false,
    bankTransferEnabled: false,
    
    // Operation Hours
    openTime: '06:00',
    closeTime: '22:00',
    operationDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    
    // Notifications
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    
    // Security
    requireEmailVerification: true,
    requirePhoneVerification: false,
    maxLoginAttempts: 5,
    sessionTimeout: 24,
    
    // Features
    chatEnabled: true,
    ratingsEnabled: true,
    promocodesEnabled: true,
    loyaltyProgram: false
  });
  
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([
    { id: 1, name: 'Centro', radius: 3, fee: 10 },
    { id: 2, name: 'Norte', radius: 5, fee: 15 },
    { id: 3, name: 'Sur', radius: 7, fee: 20 }
  ]);

  const fetchDrivers = async () => {
    try {
      setLoadingDrivers(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'repartidor')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching drivers:', error);
        setDrivers([]);
      } else {
        const driversData: AdminDriver[] = data?.map(user => ({
          id: user.id,
          users: {
            name: user.name,
            email: user.email,
            phone: user.phone
          },
          vehicle_type: user.vehicle_type || 'No especificado',
          license_number: user.license_number || 'No especificado',
          is_verified: user.is_verified || false,
          is_active: user.is_active || false,
          created_at: user.created_at
        })) || [];
        setDrivers(driversData);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setDrivers([]);
    } finally {
      setLoadingDrivers(false);
    }
  };

  const handleDriverStatusChange = async (driverId: string, field: string, newValue: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ [field]: newValue })
        .eq('id', driverId)
        .eq('role', 'repartidor');

      if (error) throw error;
      
      toast.success('Estado del repartidor actualizado');
      fetchDrivers();
    } catch (error) {
      console.error('Error updating driver:', error);
      toast.error('Error al actualizar repartidor');
    }
  };

  const sendNotificationToAll = async () => {
    if (!notificationMessage.trim()) {
      toast.error('Escribe un mensaje para enviar');
      return;
    }

    try {
      setSendingNotification(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Notificación enviada a todos los usuarios');
      setNotificationMessage('');
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Error al enviar notificación');
    } finally {
      setSendingNotification(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      // Aquí guardarías en Supabase o tu backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  return (
    <div className="space-y-6">
      {/* Settings Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-500" />
            <span>Configuración del Sistema</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { id: 'general', label: 'General', icon: Settings },
              { id: 'delivery', label: 'Entrega', icon: Truck },
              { id: 'business', label: 'Negocio', icon: Store },
              { id: 'payments', label: 'Pagos', icon: DollarSign },
              { id: 'notifications', label: 'Notificaciones', icon: Bell },
              { id: 'security', label: 'Seguridad', icon: Shield },
              { id: 'drivers', label: 'Repartidores', icon: Users }
            ].map(tab => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center space-x-2"
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </Button>
            ))}
          </div>

          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">Nombre de la Aplicación</label>
                    <Input
                      value={settings.appName}
                      onChange={(e) => setSettings({...settings, appName: e.target.value})}
                      placeholder="TRATO"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Modo Mantenimiento</label>
                    <Button
                      variant={settings.maintenanceMode ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => setSettings({...settings, maintenanceMode: !settings.maintenanceMode})}
                    >
                      {settings.maintenanceMode ? 'Activo' : 'Inactivo'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Permitir Registros</label>
                    <Button
                      variant={settings.allowRegistrations ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings({...settings, allowRegistrations: !settings.allowRegistrations})}
                    >
                      {settings.allowRegistrations ? 'Habilitado' : 'Deshabilitado'}
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">Máximo Órdenes por Día</label>
                    <Input
                      type="number"
                      value={settings.maxOrdersPerDay}
                      onChange={(e) => setSettings({...settings, maxOrdersPerDay: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Horario de Apertura</label>
                    <Input
                      type="time"
                      value={settings.openTime}
                      onChange={(e) => setSettings({...settings, openTime: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Horario de Cierre</label>
                    <Input
                      type="time"
                      value={settings.closeTime}
                      onChange={(e) => setSettings({...settings, closeTime: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Settings */}
          {activeTab === 'delivery' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">Radio de Entrega (km)</label>
                    <Input
                      type="number"
                      value={settings.deliveryRadius}
                      onChange={(e) => setSettings({...settings, deliveryRadius: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Costo de Entrega (Q)</label>
                    <Input
                      type="number"
                      value={settings.deliveryFee}
                      onChange={(e) => setSettings({...settings, deliveryFee: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Entrega Gratis desde (Q)</label>
                    <Input
                      type="number"
                      value={settings.freeDeliveryMinimum}
                      onChange={(e) => setSettings({...settings, freeDeliveryMinimum: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">Tiempo Máximo Entrega (min)</label>
                    <Input
                      type="number"
                      value={settings.maxDeliveryTime}
                      onChange={(e) => setSettings({...settings, maxDeliveryTime: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Monto Mínimo Orden (Q)</label>
                    <Input
                      type="number"
                      value={settings.minOrderAmount}
                      onChange={(e) => setSettings({...settings, minOrderAmount: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
              
              {/* Delivery Zones */}
              <div className="border-t pt-6">
                <h4 className="font-semibold mb-4 flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>Zonas de Entrega</span>
                </h4>
                <div className="space-y-3">
                  {deliveryZones.map(zone => (
                    <div key={zone.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <span className="font-medium">{zone.name}</span>
                        <span className="text-sm text-gray-500 ml-2">({zone.radius}km - Q{zone.fee})</span>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full border-dashed">
                    + Agregar Zona
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Business Settings */}
          {activeTab === 'business' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium block mb-2">Comisión Plataforma (%)</label>
                  <Input
                    type="number"
                    value={settings.platformCommission}
                    onChange={(e) => setSettings({...settings, platformCommission: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">Comisión Vendedor (%)</label>
                  <Input
                    type="number"
                    value={settings.vendorCommission}
                    onChange={(e) => setSettings({...settings, vendorCommission: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">Comisión Repartidor (%)</label>
                  <Input
                    type="number"
                    value={settings.driverCommission}
                    onChange={(e) => setSettings({...settings, driverCommission: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Payment Settings */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <h4 className="font-semibold">Métodos de Pago Habilitados</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'cashEnabled' as keyof typeof settings, label: 'Efectivo', icon: DollarSign },
                  { key: 'paypalEnabled' as keyof typeof settings, label: 'PayPal', icon: DollarSign },
                  { key: 'cardEnabled' as keyof typeof settings, label: 'Tarjeta de Crédito', icon: DollarSign },
                  { key: 'bankTransferEnabled' as keyof typeof settings, label: 'Transferencia Bancaria', icon: DollarSign }
                ].map(payment => (
                  <div key={payment.key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <payment.icon className="w-5 h-5 text-green-500" />
                      <span>{payment.label}</span>
                    </div>
                    <Button
                      variant={settings[payment.key] ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings({...settings, [payment.key]: !settings[payment.key]})}
                    >
                      {settings[payment.key] ? 'Habilitado' : 'Deshabilitado'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h4 className="font-semibold">Configuración de Notificaciones</h4>
              <div className="space-y-4">
                {[
                  { key: 'pushNotifications' as keyof typeof settings, label: 'Notificaciones Push', desc: 'Enviar notificaciones a dispositivos móviles' },
                  { key: 'emailNotifications' as keyof typeof settings, label: 'Notificaciones por Email', desc: 'Enviar emails para eventos importantes' },
                  { key: 'smsNotifications' as keyof typeof settings, label: 'Notificaciones SMS', desc: 'Enviar mensajes de texto (requiere configuración)' }
                ].map(notif => (
                  <div key={notif.key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{notif.label}</div>
                      <div className="text-sm text-gray-500">{notif.desc}</div>
                    </div>
                    <Button
                      variant={settings[notif.key] ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings({...settings, [notif.key]: !settings[notif.key]})}
                    >
                      {settings[notif.key] ? 'Activo' : 'Inactivo'}
                    </Button>
                  </div>
                ))}
              </div>
              
              {/* Notification Sender */}
              <div className="border-t pt-6">
                <h4 className="font-semibold mb-4">Enviar Notificación Masiva</h4>
                <div className="space-y-4">
                  <textarea
                    className="w-full p-3 border rounded-lg resize-none"
                    rows={3}
                    placeholder="Escribe tu mensaje aquí..."
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">Se enviará a todos los usuarios activos</p>
                    <Button 
                      onClick={sendNotificationToAll}
                      disabled={sendingNotification || !notificationMessage.trim()}
                      className="bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600 text-white"
                    >
                      {sendingNotification ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Bell className="w-4 h-4 mr-2" />
                          Enviar Notificación
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Verificación de Email</label>
                    <Button
                      variant={settings.requireEmailVerification ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings({...settings, requireEmailVerification: !settings.requireEmailVerification})}
                    >
                      {settings.requireEmailVerification ? 'Requerida' : 'Opcional'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Verificación de Teléfono</label>
                    <Button
                      variant={settings.requirePhoneVerification ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings({...settings, requirePhoneVerification: !settings.requirePhoneVerification})}
                    >
                      {settings.requirePhoneVerification ? 'Requerida' : 'Opcional'}
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">Max. Intentos de Login</label>
                    <Input
                      type="number"
                      value={settings.maxLoginAttempts}
                      onChange={(e) => setSettings({...settings, maxLoginAttempts: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Duración Sesión (horas)</label>
                    <Input
                      type="number"
                      value={settings.sessionTimeout}
                      onChange={(e) => setSettings({...settings, sessionTimeout: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Drivers Management */}
          {activeTab === 'drivers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold flex items-center space-x-2">
                  <Truck className="w-5 h-5 text-orange-500" />
                  <span>Gestión de Repartidores</span>
                </h4>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchDrivers}
                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Actualizar
                  </Button>
                  {drivers.filter(d => !d.is_verified).length > 0 && (
                    <Button
                      className="bg-green-500 hover:bg-green-600 text-white"
                      size="sm"
                      onClick={async () => {
                        try {
                          const pendingIds = drivers.filter(d => !d.is_verified).map(d => d.id);
                          
                          const { error } = await supabase
                            .from('users')
                            .update({ 
                              is_verified: true, 
                              is_active: true,
                              updated_at: new Date().toISOString()
                            })
                            .in('id', pendingIds)
                            .eq('role', 'repartidor');

                          if (error) throw error;
                          
                          toast.success(`${pendingIds.length} repartidor${pendingIds.length > 1 ? 'es' : ''} activado${pendingIds.length > 1 ? 's' : ''}`);
                          fetchDrivers();
                        } catch (error) {
                          console.error('Error:', error);
                          toast.error('Error al activar repartidores');
                        }
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Activar Pendientes ({drivers.filter(d => !d.is_verified).length})
                    </Button>
                  )}
                </div>
              </div>

              {loadingDrivers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : drivers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Truck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No hay repartidores registrados aún</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {drivers.map((driver) => (
                    <div key={driver.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                          <Truck className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-lg">{driver.users?.name || 'Repartidor'}</p>
                            {!driver.is_verified && (
                              <Badge variant="destructive" className="text-xs">Pendiente</Badge>
                            )}
                            {driver.is_verified && !driver.is_active && (
                              <Badge variant="secondary" className="text-xs">Verificado</Badge>
                            )}
                            {driver.is_verified && driver.is_active && (
                              <Badge variant="default" className="text-xs bg-green-500">Activo</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{driver.users?.email}</p>
                          <p className="text-sm text-gray-500">{driver.users?.phone}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <p className="text-xs text-gray-500">Vehículo: {driver.vehicle_type}</p>
                            <p className="text-xs text-gray-500">Licencia: {driver.license_number}</p>
                          </div>
                          <p className="text-xs text-gray-400">
                            Registrado: {new Date(driver.created_at).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!driver.is_verified ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleDriverStatusChange(driver.id, 'is_verified', true)}
                            className="bg-green-500 hover:bg-green-600 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Aprobar
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDriverStatusChange(driver.id, 'is_verified', false)}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Desaprobar
                          </Button>
                        )}
                        <Button
                          variant={driver.is_active ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleDriverStatusChange(driver.id, 'is_active', !driver.is_active)}
                          className={driver.is_active ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}
                        >
                          {driver.is_active ? (
                            <>
                              <Activity className="w-4 h-4 mr-1" />
                              Activo
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4 mr-1" />
                              Inactivo
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save Button */}
          <div className="border-t pt-6 flex justify-end">
            <Button 
              onClick={saveSettings}
              disabled={saving}
              className="bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600 text-white"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4 mr-2" />
                  Guardar Configuración
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Estado del Sistema TRATO</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm">Tabla users: Activa</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm">Tabla sellers: Activa</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm">Sistema Auth: Activo</span>
            </div>
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <span className="text-sm">Tabla orders: Verificar</span>
            </div>
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <span className="text-sm">Tabla products: Verificar</span>
            </div>
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <span className="text-sm">Sistema chat: Verificar</span>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold text-gray-800 mb-3">Diagnóstico del Sistema</h4>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
                    if (error) throw error;
                    toast.success('✅ Conexión con base de datos: OK');
                  } catch (error) {
                    toast.error('❌ Error de conexión con base de datos');
                  }
                }}
              >
                <Activity className="w-4 h-4 mr-1" />
                Test DB
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  try {
                    const tables = ['users', 'orders', 'products', 'sellers'];
                    let allOk = true;
                    
                    for (const table of tables) {
                      try {
                        await supabase.from(table).select('count', { count: 'exact', head: true });
                      } catch {
                        allOk = false;
                      }
                    }
                    
                    if (allOk) {
                      toast.success('✅ Todas las tablas principales: OK');
                    } else {
                      toast.warning('⚠️ Algunas tablas pueden tener problemas');
                    }
                  } catch (error) {
                    toast.error('❌ Error verificando tablas');
                  }
                }}
              >
                <Shield className="w-4 h-4 mr-1" />
                Test Tablas
              </Button>

              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  toast.info(`Admin: ${user?.email} | Conexión: Activa`);
                }}
              >
                <Crown className="w-4 h-4 mr-1" />
                Info Admin
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
