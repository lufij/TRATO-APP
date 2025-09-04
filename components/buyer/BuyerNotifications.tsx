import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase/client';
import { 
  Bell, 
  CheckCircle, 
  ShoppingCart, 
  Truck, 
  Star,
  Package,
  Clock,
  User,
  Store,
  AlertCircle,
  Trash2,
  Database
} from 'lucide-react';

interface Notification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
  updated_at?: string;
}

interface BuyerNotificationsProps {
  onClose: () => void;
  onNotificationCountChange: (count: number) => void;
}

export function BuyerNotifications({ onClose, onNotificationCountChange }: BuyerNotificationsProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTableAvailable, setIsTableAvailable] = useState<boolean>(false);

  // DEBUG: Log cuando el componente se monta
  useEffect(() => {
    console.log('🔍 DEBUG: BuyerNotifications montado');
    console.log('🔍 DEBUG: Usuario:', user);
    console.log('🔍 DEBUG: Estado inicial notifications:', notifications);
  }, []);

  // DEBUG: Log cuando cambian las notificaciones
  useEffect(() => {
    console.log('🔍 DEBUG: Notificaciones actualizadas:', notifications.length, notifications);
  }, [notifications]);

  // Check if notifications table exists and has the correct schema
  const checkTableAvailability = async (): Promise<boolean> => {
    try {
      // Test the table and required columns
      const { error } = await supabase
        .from('notifications')
        .select('recipient_id, type, title, message, is_read, created_at')
        .limit(1);

      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01' || error.code === '42703') {
          console.log('notifications table is not properly configured:', error.code);
          return false;
        }
        console.warn('notifications table check error:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('notifications table availability check failed:', error);
      return false;
    }
  };

  // Función para auto-eliminar notificaciones después de 5 minutos
  const autoDeleteOldNotifications = async () => {
    if (!isTableAvailable || !user) return;

    try {
      // Calcular la fecha límite (5 minutos atrás)
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
      
      console.log('🧹 Limpiando notificaciones más viejas que:', fiveMinutesAgo.toISOString());

      // Eliminar usando recipient_id únicamente
      const { error, count } = await supabase
        .from('notifications')
        .delete()
        .eq('recipient_id', user.id)
        .lt('created_at', fiveMinutesAgo.toISOString());

      if (error) {
        console.error('Error auto-eliminando notificaciones viejas:', error);
        return;
      }

      if (count && count > 0) {
        console.log(`✅ Auto-eliminadas ${count} notificaciones viejas`);
        // Refrescar la lista local
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error inesperado en auto-eliminación:', error);
    }
  };

  // Función para limpiar notificaciones MUY viejas (más de 1 hora) al cargar
  const cleanupVeryOldNotifications = async () => {
    if (!isTableAvailable || !user) return;

    try {
      // Eliminar solo notificaciones que tengan más de 1 HORA (no 5 minutos)
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      console.log('🧹 LIMPIEZA INTELIGENTE: Eliminando notificaciones con más de 1 hora...');

      // Eliminar usando recipient_id únicamente
      const { error, count } = await supabase
        .from('notifications')
        .delete()
        .eq('recipient_id', user.id)
        .lt('created_at', oneHourAgo.toISOString());

      if (error) {
        console.error('Error en limpieza inteligente:', error);
        return;
      }

      console.log(`✅ LIMPIEZA INTELIGENTE: Eliminadas ${count || 0} notificaciones muy antiguas (> 1 hora)`);
    } catch (error) {
      console.error('Error inesperado en limpieza inteligente:', error);
    }
  };

  // Función para limpiar TODAS las notificaciones viejas (más de 5 minutos) al cargar
  const cleanupAllOldNotifications = async () => {
    if (!isTableAvailable || !user) return;

    try {
      // Eliminar TODAS las notificaciones que tengan más de 5 minutos
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
      
      console.log('🧹 LIMPIEZA INICIAL: Eliminando TODAS las notificaciones viejas...');

      // Intentar eliminar con recipient_id primero
      let { error, count } = await supabase
        .from('notifications')
        .delete()
        .eq('recipient_id', user.id)
        .lt('created_at', fiveMinutesAgo.toISOString());

      // Si falla, intentar con user_id
      if (error) {
        console.log('Intentando eliminar con user_id...', error);
        const result = await supabase
          .from('notifications')
          .delete()
          .eq('user_id', user.id)
          .lt('created_at', fiveMinutesAgo.toISOString());
        
        error = result.error;
        count = result.count;
      }

      if (error) {
        console.error('Error en limpieza inicial:', error);
        return;
      }

      console.log(`✅ LIMPIEZA INICIAL: Eliminadas ${count || 0} notificaciones antiguas`);
    } catch (error) {
      console.error('Error inesperado en limpieza inicial:', error);
    }
  };

  useEffect(() => {
    checkAndFetchNotifications();
    
    // Auto-eliminar notificaciones viejas cada minuto
    const autoCleanupInterval = setInterval(() => {
      autoDeleteOldNotifications();
    }, 60000); // Cada 60 segundos
    
    // Subscribe to real-time notifications only if table is available
    let channel: any = null;
    
    const setupRealtimeSubscription = async () => {
      const available = await checkTableAvailability();
      if (available && user) {
        channel = supabase
          .channel('buyer-notifications')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `recipient_id=eq.${user.id}`
            },
            () => {
              fetchNotifications();
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `recipient_id=eq.${user.id}`
            },
            () => {
              fetchNotifications();
            }
          )
          .subscribe();
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      // Limpiar el intervalo de auto-eliminación
      clearInterval(autoCleanupInterval);
    };
  }, [user?.id]);

  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    onNotificationCountChange(unreadCount);
  }, [notifications, onNotificationCountChange]);

  const checkAndFetchNotifications = async () => {
    const available = await checkTableAvailability();
    setIsTableAvailable(available);
    
    if (available) {
      // PRIMERO: Eliminar solo notificaciones muy antiguas (más de 1 hora)
      await cleanupVeryOldNotifications();
      // SEGUNDO: Cargar las notificaciones restantes
      await fetchNotifications();
    } else {
      setLoading(false);
      setNotifications([]);
    }
  };

  const fetchNotifications = async () => {
    if (!user || !isTableAvailable) return;

    try {
      console.log('🔍 DEBUG: Iniciando fetchNotifications...');
      console.log('🔍 DEBUG: Usuario ID:', user.id);
      
      // Solo obtener notificaciones de los últimos 7 días
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      console.log('🔍 DEBUG: Consultando desde:', sevenDaysAgo.toISOString());

      // Usar únicamente recipient_id
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString()) // Solo últimos 7 días
        .order('created_at', { ascending: false })
        .limit(50);

      console.log('🔍 DEBUG: Respuesta de Supabase:', { data, error });

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      console.log(`📋 Notificaciones cargadas: ${data?.length || 0} (últimos 7 días)`);
      console.log('🔍 DEBUG: Datos completos:', data);
      
      setNotifications(data || []);
    } catch (error) {
      console.error('Unexpected error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!isTableAvailable) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Unexpected error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!isTableAvailable || !user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error('Unexpected error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!isTableAvailable) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        return;
      }
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Unexpected error deleting notification:', error);
    }
  };

  // Función para eliminar TODAS las notificaciones del usuario
  const deleteAllNotifications = async () => {
    if (!isTableAvailable || !user) return;

    try {
      console.log('🗑️ ELIMINANDO TODAS las notificaciones del usuario...');

      // Usar únicamente recipient_id
      const { error, count } = await supabase
        .from('notifications')
        .delete()
        .eq('recipient_id', user.id);

      if (error) {
        console.error('Error eliminando todas las notificaciones:', error);
        return;
      }

      console.log(`✅ TOTAL ELIMINADAS: ${count || 0} notificaciones`);
      
      // Limpiar estado local inmediatamente
      setNotifications([]);
      
    } catch (error) {
      console.error('Error inesperado eliminando todas las notificaciones:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconMap = {
      new_order: ShoppingCart,
      order_accepted: CheckCircle,
      order_ready: Package,
      order_assigned: User,
      order_picked_up: Truck,
      order_in_transit: Truck,
      order_delivered: CheckCircle,
      order_completed: Star,
      order_cancelled: AlertCircle,
      order_rejected: AlertCircle,
      promotion: Store,
      new_product: Package,
      message: Bell,
      system: AlertCircle,
      rating: Star,
      general: Bell
    };
    return iconMap[type as keyof typeof iconMap] || Bell;
  };

  const getNotificationColor = (type: string) => {
    const colorMap = {
      new_order: 'text-blue-600',
      order_accepted: 'text-green-600',
      order_ready: 'text-orange-600',
      order_assigned: 'text-purple-600',
      order_picked_up: 'text-indigo-600',
      order_in_transit: 'text-indigo-600',
      order_delivered: 'text-green-600',
      order_completed: 'text-gray-600',
      order_cancelled: 'text-red-600',
      order_rejected: 'text-red-600',
      promotion: 'text-yellow-600',
      new_product: 'text-pink-600',
      message: 'text-blue-600',
      system: 'text-gray-600',
      rating: 'text-yellow-600',
      general: 'text-gray-600'
    };
    return colorMap[type as keyof typeof colorMap] || 'text-gray-600';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Hace unos segundos';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 604800) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    
    return date.toLocaleDateString();
  };

  // Show error state if table is not available
  if (!isTableAvailable && !loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificaciones
          </h2>
        </div>
        
        <div className="flex-1 p-4">
          <Alert className="mb-4">
            <Database className="h-4 w-4" />
            <AlertDescription>
              El sistema de notificaciones no está disponible actualmente. 
              La tabla de notificaciones necesita ser configurada en la base de datos.
            </AlertDescription>
          </Alert>
          
          <div className="text-center py-8 text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Sistema de notificaciones no disponible</p>
            <p className="text-sm mt-2">Configuración de base de datos requerida</p>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={onClose}
          >
            Cerrar
          </Button>
        </div>
      </div>
    );
  }

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificaciones
          </h2>
          {unreadNotifications.length > 0 && isTableAvailable && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={markAllAsRead}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Marcar todas como leídas
            </Button>
          )}
          
          {/* Botón para limpiar notificaciones viejas manualmente */}
          {notifications.length > 0 && isTableAvailable && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                await cleanupAllOldNotifications();
                await fetchNotifications();
              }}
              className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpiar viejas
            </Button>
          )}
          
          {/* Botón para eliminar TODAS las notificaciones */}
          {notifications.length > 0 && isTableAvailable && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                if (confirm('¿Estás seguro de que quieres eliminar TODAS las notificaciones?')) {
                  await deleteAllNotifications();
                }
              }}
              className="text-red-700 hover:text-red-800 border-red-400 hover:border-red-500 bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar todas
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Badge variant="destructive" className="h-2 w-2 p-0"></Badge>
            <span>{unreadNotifications.length} sin leer</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="h-2 w-2 p-0"></Badge>
            <span>{readNotifications.length} leídas</span>
          </div>
        </div>

        {/* Botones de control */}
        <div className="flex gap-2 flex-wrap mt-3">
          {/* Botón de LIMPIAR CACHE */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={async () => {
              console.log('🧹 LIMPIANDO CACHE COMPLETO...');
              
              // Limpiar estado local
              setNotifications([]);
              
              // Limpiar localStorage
              try {
                localStorage.removeItem('buyer-notifications-cache');
                localStorage.removeItem('notifications-cache');
                console.log('✅ localStorage limpiado');
              } catch (e) {
                console.log('⚠️ Error limpiando localStorage:', e);
              }
              
              // Limpiar sessionStorage
              try {
                sessionStorage.clear();
                console.log('✅ sessionStorage limpiado');
              } catch (e) {
                console.log('⚠️ Error limpiando sessionStorage:', e);
              }
              
              // Forzar recarga desde servidor
              window.location.reload();
            }}
            className="text-purple-600 hover:text-purple-700 border-purple-300 hover:border-purple-400"
          >
            🧹 LIMPIAR CACHE
          </Button>

          {/* Botón de DEBUG */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={async () => {
              console.log('🚨 DEBUG MANUAL INICIADO');
              console.log('🔍 Usuario actual:', user);
              console.log('🔍 Tabla disponible:', isTableAvailable);
              console.log('🔍 Estado notifications:', notifications);
              console.log('🔍 Length notifications:', notifications.length);
              
              // Consulta directa a la base de datos
              if (user && isTableAvailable) {
                try {
                  const { data, error } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('recipient_id', user.id);
                  
                  console.log('🔍 Consulta directa BD:', { data, error });
                  console.log('🔍 Total en BD:', data?.length || 0);
                } catch (err) {
                  console.error('🔍 Error consulta directa:', err);
                }
              }
            }}
            className="text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
          >
            🐛 DEBUG
          </Button>

          {unreadNotifications.length > 0 && isTableAvailable && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={markAllAsRead}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Marcar todas como leídas
            </Button>
          )}
          
          {/* Botón de FORZAR LIMPIEZA INMEDIATA */}
          {isTableAvailable && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                console.log('🚨 FORZANDO LIMPIEZA TOTAL...');
                await deleteAllNotifications();
                await fetchNotifications();
                console.log('✅ Limpieza forzada completada');
              }}
              className="text-red-800 hover:text-red-900 border-red-500 hover:border-red-600 bg-red-100 hover:bg-red-200"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              FORZAR LIMPIEZA
            </Button>
          )}
          
          {/* Botón para limpiar notificaciones viejas manualmente */}
          {notifications.length > 0 && isTableAvailable && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                await cleanupAllOldNotifications();
                await fetchNotifications();
              }}
              className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpiar viejas
            </Button>
          )}
          
          {/* Botón para eliminar TODAS las notificaciones */}
          {notifications.length > 0 && isTableAvailable && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                if (confirm('¿Estás seguro de que quieres eliminar TODAS las notificaciones?')) {
                  await deleteAllNotifications();
                }
              }}
              className="text-red-700 hover:text-red-800 border-red-400 hover:border-red-500 bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar todas
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No tienes notificaciones
              </h3>
              <p className="text-gray-500">
                Las notificaciones de tus pedidos aparecerán aquí
              </p>
            </div>
          ) : (
            <>
              {/* Unread Notifications */}
              {unreadNotifications.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Badge variant="destructive" className="h-2 w-2 p-0"></Badge>
                    Nuevas notificaciones
                  </h3>
                  
                  {unreadNotifications.map((notification) => {
                    const Icon = getNotificationIcon(notification.type);
                    const iconColor = getNotificationColor(notification.type);

                    return (
                      <Card 
                        key={notification.id} 
                        className="border-orange-200 bg-orange-50 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full bg-white ${iconColor}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-semibold text-gray-900 text-sm">
                                    {notification.title}
                                  </h4>
                                  <p className="text-gray-700 text-sm mt-1">
                                    {notification.message}
                                  </p>
                                </div>
                                <Badge variant="destructive" className="h-2 w-2 p-0 flex-shrink-0"></Badge>
                              </div>
                              
                              <div className="flex items-center justify-between mt-3">
                                <span className="text-xs text-gray-500">
                                  {formatTimeAgo(notification.created_at)}
                                </span>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      markAsRead(notification.id);
                                    }}
                                    className="h-6 px-2 text-xs"
                                  >
                                    Marcar como leída
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      deleteNotification(notification.id);
                                    }}
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
                    );
                  })}
                </div>
              )}

              {/* Separator */}
              {unreadNotifications.length > 0 && readNotifications.length > 0 && (
                <Separator className="my-6" />
              )}

              {/* Read Notifications */}
              {readNotifications.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-600 flex items-center gap-2">
                    <Badge variant="outline" className="h-2 w-2 p-0"></Badge>
                    Notificaciones anteriores
                  </h3>
                  
                  {readNotifications.map((notification) => {
                    const Icon = getNotificationIcon(notification.type);
                    const iconColor = getNotificationColor(notification.type);

                    return (
                      <Card 
                        key={notification.id} 
                        className="border-gray-200 hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full bg-gray-100 ${iconColor} opacity-60`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-medium text-gray-700 text-sm">
                                    {notification.title}
                                  </h4>
                                  <p className="text-gray-600 text-sm mt-1">
                                    {notification.message}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between mt-3">
                                <span className="text-xs text-gray-400">
                                  {formatTimeAgo(notification.created_at)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteNotification(notification.id)}
                                  className="h-6 px-2 text-xs text-red-600 hover:text-red-700 opacity-60"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50">
        <Button 
          variant="outline" 
          className="w-full"
          onClick={onClose}
        >
          Cerrar
        </Button>
      </div>
    </div>
  );
}