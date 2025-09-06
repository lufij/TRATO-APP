import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Truck, 
  MapPin, 
  DollarSign, 
  LogOut, 
  Navigation, 
  Package,
  Star,
  CheckCircle,
  Bell,
  User,
  Settings,
  History,
  BarChart3,
  Check,
  Loader2
} from 'lucide-react';

interface Order {
  id: string;
  customer_name: string;
  address: string;
  total: number;
  status: string;
  created_at: string;
  delivered_at?: string;
  updated_at: string;
  latitude?: number;
  longitude?: number;
  user_id: string;
  order_items?: OrderItem[];
}

interface OrderItem {
  id: string;
  quantity: number;
  daily_products: {
    name: string;
    price: number;
    seller_id: string;
    users?: {
      user_metadata: any;
    };
  };
}

const DriverDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ========================================
  // 🎯 ESTADOS PRINCIPALES - LIMPIOS
  // ========================================
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentView, setCurrentView] = useState<'dashboard' | 'deliveries' | 'history' | 'notifications' | 'profile'>('dashboard');
  const [activeDeliveries, setActiveDeliveries] = useState<Order[]>([]);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<Order[]>([]);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [notificationSubscription, setNotificationSubscription] = useState<any>(null);

  // Estados para estadísticas
  const [stats, setStats] = useState({
    todayDeliveries: 0,
    todayEarnings: 0,
    activeTime: 0,
    averageRating: 4.8,
    totalDeliveries: 0,
    totalEarnings: 0,
    completionRate: 95
  });

  // ========================================
  // 🔧 FUNCIONES MEMOIZADAS - OPTIMIZADAS
  // ========================================

  // Función principal para cargar datos del driver
  const loadDriverData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      await Promise.all([
        loadActiveDeliveries(),
        loadAvailableOrders(),
        loadDriverStats(),
        loadCompletedDeliveries()
      ]);
    } catch (error) {
      console.error('❌ Error loading driver data:', error);
      toast.error('Error al cargar datos del repartidor');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Función para cargar entregas activas
  const loadActiveDeliveries = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log('🔄 Loading active deliveries for driver:', user.id);
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            daily_products (
              name,
              price,
              seller_id,
              users!seller_id (
                user_metadata
              )
            )
          )
        `)
        .eq('driver_id', user.id)
        .in('status', ['assigned', 'picked_up', 'in_transit'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading active deliveries:', error);
        return;
      }

      console.log('✅ Active deliveries loaded:', data?.length || 0);
      setActiveDeliveries(data || []);
    } catch (error) {
      console.error('❌ Error in loadActiveDeliveries:', error);
    }
  }, [user?.id]);

  // Función para cargar órdenes disponibles
  const loadAvailableOrders = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log('🔄 Loading available orders...');
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            daily_products (
              name,
              price,
              seller_id,
              users!seller_id (
                user_metadata
              )
            )
          )
        `)
        .eq('status', 'ready')
        .is('driver_id', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('❌ Error loading available orders:', error);
        return;
      }

      console.log('✅ Available orders loaded:', data?.length || 0);
      setAvailableOrders(data || []);
    } catch (error) {
      console.error('❌ Error in loadAvailableOrders:', error);
    }
  }, [user?.id]);

  // Función para cargar estadísticas del driver
  const loadDriverStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Aquí podrías cargar estadísticas reales desde la base de datos
      // Por ahora mantenemos valores por defecto
      setStats({
        todayDeliveries: activeDeliveries.length,
        todayEarnings: activeDeliveries.reduce((sum, delivery) => sum + (delivery.total || 0), 0),
        activeTime: 0,
        averageRating: 4.8,
        totalDeliveries: completedDeliveries.length + activeDeliveries.length,
        totalEarnings: 0,
        completionRate: 95
      });
    } catch (error) {
      console.error('❌ Error loading driver stats:', error);
    }
  }, [user?.id, activeDeliveries, completedDeliveries]);

  // Función para cargar entregas completadas
  const loadCompletedDeliveries = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            daily_products (
              name,
              price,
              seller_id,
              users!seller_id (
                user_metadata
              )
            )
          )
        `)
        .eq('driver_id', user.id)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('❌ Error loading completed deliveries:', error);
        return;
      }

      setCompletedDeliveries(data || []);
    } catch (error) {
      console.error('❌ Error in loadCompletedDeliveries:', error);
    }
  }, [user?.id]);

  // Función para setup de notificaciones
  const setupOrderNotifications = useCallback(() => {
    if (!user?.id) return;

    try {
      console.log('🔔 Setting up order notifications for driver:', user.id);

      const channel = supabase
        .channel('driver-orders')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `status=eq.ready`
          },
          (payload) => {
            console.log('New order available:', payload);
            toast.success('Nueva orden disponible!');
            loadAvailableOrders();
            setNewOrdersCount(prev => prev + 1);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `driver_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Driver order updated:', payload);
            loadActiveDeliveries();
            loadAvailableOrders();
          }
        )
        .subscribe();

      setNotificationSubscription(channel);

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error setting up order notifications:', error);
    }
  }, [user?.id, loadAvailableOrders, loadActiveDeliveries]);

  // Función para actualizar estado de entrega
  const updateDeliveryStatus = useCallback(async (orderId: string, newStatus: string) => {
    if (!user?.id) {
      toast.error('Usuario no autenticado');
      return;
    }

    setProcessingOrderId(orderId);

    try {
      console.log('🔄 Updating order status:', orderId, 'to:', newStatus, 'by driver:', user.id);
      
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        driver_id: user.id
      };

      if (newStatus === 'picked_up') {
        updateData.picked_up_at = new Date().toISOString();
      } else if (newStatus === 'in_transit') {
        updateData.in_transit_at = new Date().toISOString();
      } else if (newStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select();

      if (error) {
        console.error('❌ Error updating status:', error);
        toast.error('Error al actualizar estado: ' + error.message);
        return;
      }

      console.log('✅ Update status response:', data);

      if (data && data.length > 0) {
        const statusMessages: Record<string, string> = {
          'picked_up': '📦 Pedido marcado como recogido',
          'in_transit': '🚚 En camino al destino',
          'delivered': '✅ Entrega completada exitosamente'
        };

        toast.success(statusMessages[newStatus] || 'Estado actualizado');
        
        // Refresh data immediately
        await Promise.all([
          loadActiveDeliveries(),
          loadDriverStats(),
          loadCompletedDeliveries()
        ]);
      } else {
        toast.error('No se pudo actualizar el estado');
      }
    } catch (error) {
      console.error('❌ Error updating delivery status:', error);
      toast.error('Error al actualizar estado');
    } finally {
      setProcessingOrderId(null);
    }
  }, [user?.id, loadActiveDeliveries, loadDriverStats, loadCompletedDeliveries]);

  // Función para aceptar órdenes
  const acceptOrder = useCallback(async (orderId: string) => {
    if (!user?.id) {
      toast.error('Usuario no autenticado');
      return;
    }

    try {
      console.log('🎯 Accepting order:', orderId, 'for driver:', user.id);
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          driver_id: user.id,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('❌ Error accepting order:', error);
        toast.error('Error al aceptar pedido');
        return;
      }

      toast.success('Pedido aceptado exitosamente');
      await Promise.all([
        loadAvailableOrders(),
        loadActiveDeliveries()
      ]);
      setNewOrdersCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('❌ Error accepting order:', error);
      toast.error('Error al aceptar pedido');
    }
  }, [user?.id, loadAvailableOrders, loadActiveDeliveries]);

  // Función para formatear fecha
  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `hace ${diffMinutes} min`;
    } else if (diffHours < 24) {
      return `hace ${Math.floor(diffHours)} horas`;
    } else if (diffDays < 7) {
      return `hace ${Math.floor(diffDays)} días`;
    } else {
      return date.toLocaleDateString('es-ES');
    }
  }, []);

  // ========================================
  // 🎯 useEffect OPTIMIZADOS
  // ========================================

  // useEffect principal para cargar datos iniciales
  useEffect(() => {
    if (user?.id && isOnline) {
      loadDriverData();
    }
  }, [user?.id, isOnline, loadDriverData]);

  // useEffect para setup de notificaciones
  useEffect(() => {
    if (user?.id && isOnline) {
      const cleanup = setupOrderNotifications();
      return cleanup;
    }

    return () => {
      if (notificationSubscription) {
        supabase.removeChannel(notificationSubscription);
      }
    };
  }, [user?.id, isOnline, setupOrderNotifications]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ========================================
  // 🎨 COMPONENTES DE RENDERIZADO
  // ========================================

  // Componente de loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard del repartidor...</p>
        </div>
      </div>
    );
  }

  // Función para renderizar el contenido principal
  const renderMainContent = () => {
    switch (currentView) {
      case 'deliveries':
        return (
          <div className="space-y-6">
            {/* Entregas Activas */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Entregas Activas ({activeDeliveries.length})
                  </h2>
                </div>
              </div>
              
              <div className="p-6">
                {activeDeliveries.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Truck className="w-12 h-12 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-4">No tienes entregas activas</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeDeliveries.map((delivery) => (
                      <div key={delivery.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">
                                Pedido #{delivery.id.slice(-6)}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                delivery.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                                delivery.status === 'picked_up' ? 'bg-blue-100 text-blue-800' :
                                delivery.status === 'in_transit' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {delivery.status === 'assigned' ? '📋 Asignado' :
                                 delivery.status === 'picked_up' ? '📦 Recogido' :
                                 delivery.status === 'in_transit' ? '🚚 En tránsito' : delivery.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              👤 {delivery.customer_name}
                            </p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {delivery.address}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">
                              ${delivery.total?.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(delivery.created_at)}
                            </p>
                          </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex gap-2 pt-3 border-t border-gray-100">
                          {delivery.status === 'assigned' && (
                            <button
                              onClick={() => updateDeliveryStatus(delivery.id, 'picked_up')}
                              disabled={processingOrderId === delivery.id}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              {processingOrderId === delivery.id ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Procesando...
                                </div>
                              ) : (
                                '📦 Marcar como recogido'
                              )}
                            </button>
                          )}

                          {delivery.status === 'picked_up' && (
                            <button
                              onClick={() => updateDeliveryStatus(delivery.id, 'in_transit')}
                              disabled={processingOrderId === delivery.id}
                              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              {processingOrderId === delivery.id ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Procesando...
                                </div>
                              ) : (
                                '🚚 En camino'
                              )}
                            </button>
                          )}

                          {delivery.status === 'in_transit' && (
                            <button
                              onClick={() => updateDeliveryStatus(delivery.id, 'delivered')}
                              disabled={processingOrderId === delivery.id}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              {processingOrderId === delivery.id ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Procesando...
                                </div>
                              ) : (
                                '✅ Marcar como entregado'
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Órdenes Disponibles */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Órdenes Disponibles ({availableOrders.length})
                  </h2>
                </div>
              </div>

              <div className="p-6">
                {availableOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="w-12 h-12 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-4">No hay órdenes disponibles</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availableOrders.map((order) => (
                      <div key={order.id} className="border border-green-200 bg-green-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">
                                Pedido #{order.id.slice(-6)}
                              </span>
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                📦 Listo para entrega
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              👤 {order.customer_name}
                            </p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {order.address}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">
                              ${order.total?.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(order.created_at)}
                            </p>
                          </div>
                        </div>

                        {/* Botón para aceptar orden */}
                        <div className="pt-3 border-t border-green-200">
                          <button
                            onClick={() => acceptOrder(order.id)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Aceptar pedido
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default: // dashboard
        return (
          <div className="space-y-6">
            {/* Estadísticas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Entregas Hoy</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.todayDeliveries}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Ganancias Hoy</p>
                    <p className="text-3xl font-bold text-green-600">${stats.todayEarnings.toFixed(2)}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Entregas Activas</p>
                    <p className="text-3xl font-bold text-orange-600">{activeDeliveries.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Truck className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Calificación</p>
                    <p className="text-3xl font-bold text-yellow-600">{stats.averageRating}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Acciones Rápidas</h2>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={() => setCurrentView('deliveries')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Truck className="w-5 h-5" />
                  Ver Mis Entregas ({activeDeliveries.length})
                </button>
                
                <button
                  onClick={() => {
                    loadAvailableOrders();
                    setCurrentView('deliveries');
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Package className="w-5 h-5" />
                  Buscar Órdenes ({availableOrders.length})
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Truck className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Dashboard Repartidor</h1>
                  <p className="text-sm text-gray-500">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Indicador de estado */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {isOnline ? 'En línea' : 'Desconectado'}
                </span>
              </div>

              {/* Botón de logout */}
              <button
                onClick={() => {
                  supabase.auth.signOut();
                  navigate('/');
                }}
                className="text-gray-600 hover:text-gray-900 transition-colors p-2"
                title="Cerrar sesión"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navegación de pestañas */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'deliveries', label: 'Entregas', icon: Truck },
              { id: 'history', label: 'Historial', icon: History },
              { id: 'notifications', label: 'Notificaciones', icon: Bell },
              { id: 'profile', label: 'Perfil', icon: User }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentView(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    currentView === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderMainContent()}
      </main>

      {/* Toast container - usando Sonner */}
      <div id="sonner-toaster" />
    </div>
  );
};

export default DriverDashboard;
