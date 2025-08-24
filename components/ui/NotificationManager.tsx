import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { 
  Bell, 
  BellRing,
  Volume2,
  Settings,
  RefreshCw,
  CheckCircle,
  Eye,
  Trash2,
  Play,
  VolumeX
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../hooks/useNotification';
import { useSoundNotifications, NotificationSound } from '../../hooks/useSoundNotifications';
import { SoundNotificationSettings } from '../ui/SoundNotificationSettings';
import { BuyerNotifications } from '../buyer/BuyerNotifications';
import { toast } from 'sonner';

interface NotificationManagerProps {
  onClose?: () => void;
}

export function NotificationManager({ onClose }: NotificationManagerProps) {
  const { user } = useAuth();
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    isTableAvailable 
  } = useNotification();
  
  const { 
    isEnabled: soundEnabled, 
    testSound, 
    config: soundConfig 
  } = useSoundNotifications();
  
  const [activeTab, setActiveTab] = useState('notifications');
  const [showSoundSettings, setShowSoundSettings] = useState(false);

  // Get role-specific greeting and info
  const getRoleInfo = () => {
    switch (user?.role) {
      case 'vendedor':
        return {
          title: 'Panel de Vendedor',
          subtitle: 'Notificaciones de pedidos y entregas',
          primaryColor: 'bg-green-500',
          soundTypes: [NotificationSound.NEW_ORDER, NotificationSound.ORDER_ASSIGNED]
        };
      case 'repartidor':
        return {
          title: 'Panel de Repartidor',
          subtitle: 'Notificaciones de entregas disponibles',
          primaryColor: 'bg-blue-500',
          soundTypes: [NotificationSound.ORDER_READY, NotificationSound.ORDER_ASSIGNED]
        };
      case 'comprador':
        return {
          title: 'Panel de Comprador',
          subtitle: 'Notificaciones de pedidos y productos',
          primaryColor: 'bg-orange-500',
          soundTypes: [NotificationSound.ORDER_READY, NotificationSound.NEW_PRODUCT]
        };
      default:
        return {
          title: 'Centro de Notificaciones',
          subtitle: 'Mantente informado de las actualizaciones importantes',
          primaryColor: 'bg-gray-500',
          soundTypes: [NotificationSound.GENERAL]
        };
    }
  };

  const roleInfo = getRoleInfo();

  const testRoleSpecificSounds = () => {
    roleInfo.soundTypes.forEach((soundType, index) => {
      setTimeout(() => {
        testSound(soundType);
      }, index * 800); // Space out the sounds
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)} h`;
    return `Hace ${Math.floor(diffInMinutes / 1440)} d`;
  };

  if (showSoundSettings) {
    return (
      <div className="h-full">
        <SoundNotificationSettings 
          onClose={() => setShowSoundSettings(false)} 
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-r from-orange-50 to-green-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 ${roleInfo.primaryColor} rounded-lg text-white`}>
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {roleInfo.title}
              </h1>
              <p className="text-sm text-gray-600">
                {roleInfo.subtitle}
              </p>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {/* Sound Status Indicator */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSoundSettings(true)}
              className="h-9"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-green-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-gray-400" />
              )}
            </Button>
            
            {/* Test Sound */}
            <Button
              variant="outline"
              size="sm"
              onClick={testRoleSpecificSounds}
              disabled={!soundEnabled}
              className="h-9"
            >
              <Play className="w-4 h-4 mr-1" />
              Probar
            </Button>
            
            {/* Close Button */}
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ×
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Badge 
              variant={unreadCount > 0 ? "destructive" : "secondary"}
              className="h-6"
            >
              {unreadCount} sin leer
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-6">
              {notifications.length} total
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={soundEnabled ? "default" : "secondary"} 
              className="h-6"
            >
              {soundEnabled ? 'Sonidos ON' : 'Sonidos OFF'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mx-6 mt-4">
            <TabsTrigger value="notifications">
              Notificaciones
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-1" />
              Configuración
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="flex-1 mx-6 mt-4">
            {!isTableAvailable ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Sistema de notificaciones no disponible
                  </h3>
                  <p className="text-gray-600 mb-4">
                    La tabla de notificaciones necesita ser configurada en la base de datos.
                  </p>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    En desarrollo
                  </Badge>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Action Bar */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    {unreadCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={markAllAsRead}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Marcar todas como leídas
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={refreshNotifications}
                      disabled={loading}
                    >
                      <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                      Actualizar
                    </Button>
                  </div>
                </div>

                {/* Notifications List */}
                <ScrollArea className="h-[500px]">
                  {notifications.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          No tienes notificaciones
                        </h3>
                        <p className="text-gray-600">
                          Las notificaciones importantes aparecerán aquí.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <Card 
                          key={notification.id}
                          className={`transition-all hover:shadow-md ${
                            !notification.read 
                              ? 'border-orange-200 bg-orange-50' 
                              : 'border-gray-200'
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-full ${
                                !notification.read 
                                  ? 'bg-orange-100 text-orange-600' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                <Bell className="w-4 h-4" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h4 className={`font-medium text-sm ${
                                      !notification.read ? 'text-gray-900' : 'text-gray-600'
                                    }`}>
                                      {notification.title}
                                    </h4>
                                    <p className={`text-sm mt-1 ${
                                      !notification.read ? 'text-gray-700' : 'text-gray-500'
                                    }`}>
                                      {notification.message}
                                    </p>
                                  </div>
                                  
                                  {!notification.read && (
                                    <Badge variant="destructive" className="h-2 w-2 p-0 flex-shrink-0" />
                                  )}
                                </div>
                                
                                <div className="flex items-center justify-between mt-3">
                                  <span className="text-xs text-gray-500">
                                    {formatTimeAgo(notification.created_at)}
                                  </span>
                                  
                                  <div className="flex gap-1">
                                    {!notification.read && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => markAsRead(notification.id)}
                                        className="h-6 px-2 text-xs"
                                      >
                                        <Eye className="w-3 h-3" />
                                      </Button>
                                    )}
                                    
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteNotification(notification.id)}
                                      className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="flex-1 mx-6 mt-4">
            <ScrollArea className="h-[600px]">
              <SoundNotificationSettings />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
