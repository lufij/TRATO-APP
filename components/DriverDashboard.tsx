import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Truck, 
  MapPin, 
  Clock, 
  DollarSign, 
  LogOut, 
  Navigation, 
  Package,
  Phone,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  Route,
  Eye,
  Loader2,
  RefreshCw,
  Bell,
  User,
  Settings,
  TrendingUp,
  Calendar,
  Award,
  Activity,
  Map
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface DeliveryOrder {
  id: string;
  order_id: string;
  pickup_address: string;
  delivery_address: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  delivery_fee: number;
  status: 'available' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  created_at: string;
  estimated_delivery: string;
  pickup_notes?: string;
  delivery_notes?: string;
  items_count: number;
  business_name: string;
  distance?: number;
}

interface DriverStats {
  todayDeliveries: number;
  todayEarnings: number;
  activeTime: number;
  averageRating: number;
  totalDeliveries: number;
  totalEarnings: number;
  completionRate: number;
}

interface DriverStatus {
  is_active: boolean;
  is_verified: boolean;
  current_location?: {
    lat: number;
    lng: number;
  };
  status: 'available' | 'busy' | 'offline';
}

type MainView = 'dashboard' | 'deliveries' | 'history' | 'profile';

export function DriverDashboard() {
  const { user, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<MainView>('dashboard');
  const [driverStatus, setDriverStatus] = useState<DriverStatus>({
    is_active: false,
    is_verified: false,
    status: 'offline'
  });
  const [availableOrders, setAvailableOrders] = useState<DeliveryOrder[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<DeliveryOrder[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<DeliveryOrder[]>([]);
  const [stats, setStats] = useState<DriverStats>({
    todayDeliveries: 0,
    todayEarnings: 0,
    activeTime: 0,
    averageRating: 4.5,
    totalDeliveries: 0,
    totalEarnings: 0,
    completionRate: 95
  });
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string>('');
  const [watchId, setWatchId] = useState<number | null>(null);
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadDriverData();
      loadAvailableOrders();
      loadActiveDeliveries();
      loadDriverStats();
      setupOrderNotifications();
    }
  }, [user]);

  // Auto-refresh orders every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (driverStatus.is_active && currentView === 'deliveries') {
        loadAvailableOrders();
        loadActiveDeliveries();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [driverStatus.is_active, currentView]);

  const loadDriverData = async () => {
    try {
      setLoading(true);
      
      const { data: driverData, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) {
        console.error('Error loading driver data:', error);
        // If driver not found, create a basic record
        if (error.code === 'PGRST116') {
          await createDriverRecord();
        }
      } else {
        setDriverStatus({
          is_active: driverData.is_active || false,
          is_verified: driverData.is_verified || false,
          current_location: driverData.current_location,
          status: driverData.is_active ? 'available' : 'offline'
        });
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDriverRecord = async () => {
    try {
      const { error } = await supabase
        .from('drivers')
        .insert({
          id: user?.id,
          vehicle_type: 'motocicleta',
          license_number: 'TEMP-' + Date.now(),
          is_active: false,
          is_verified: false,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error creating driver record:', error);
      }
    } catch (error) {
      console.error('Error creating driver record:', error);
    }
  };

  const loadAvailableOrders = async () => {
    try {
      console.log('Loading available orders using RPC function...');
      
      // Use the RPC function to get real available deliveries
      const { data: ordersData, error } = await supabase
        .rpc('get_available_deliveries');

      if (error) {
        console.error('RPC Error:', error);
        // En caso de error, mostrar estado vacío (NO datos demo)
        setAvailableOrders([]);
        toast.error('Error al cargar pedidos disponibles. Verifica que el script SQL esté ejecutado.');
        return;
      }

      console.log('Available orders from RPC:', ordersData);
      
      // Transform RPC data to component format
      const transformedOrders: DeliveryOrder[] = (ordersData || []).map((order: any) => ({
        id: order.order_id,
        order_id: order.order_id,
        pickup_address: order.seller_address || 'Dirección de recogida',
        delivery_address: order.delivery_address || 'Dirección de entrega',
        customer_name: 'Cliente', // RPC doesn't return customer name for privacy
        customer_phone: 'Sin teléfono',
        total_amount: order.total || 0,
        delivery_fee: Math.round(order.total * 0.15) || 10, // 15% delivery fee
        status: 'available',
        created_at: order.created_at,
        estimated_delivery: new Date(Date.now() + (order.estimated_time * 60000)).toISOString(),
        items_count: 1,
        business_name: order.seller_name || 'Negocio',
        pickup_notes: undefined,
        delivery_notes: undefined,
        distance: order.distance_km
      }));

      setAvailableOrders(transformedOrders);
      console.log('Transformed orders:', transformedOrders);
    } catch (error) {
      console.error('Error loading available orders:', error);
      // En caso de error, mostrar estado vacío (NO datos demo)
      setAvailableOrders([]);
      toast.error('Error al cargar pedidos disponibles');
    }
  };

  const loadActiveDeliveries = async () => {
    try {
      // Try to fetch driver's active deliveries
      const { data: deliveriesData, error } = await supabase
        .from('orders')
        .select(`
          *,
          buyer:users!buyer_id (name, phone),
          seller:users!seller_id (name),
          sellers!seller_id (business_name)
        `)
        .eq('driver_id', user?.id)
        .in('status', ['assigned', 'picked_up', 'in_transit'])
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Active deliveries not available, using mock data');
        setActiveDeliveries([]);
        return;
      }

      // Transform real data
      const transformedDeliveries: DeliveryOrder[] = (deliveriesData || []).map(order => ({
        id: order.id,
        order_id: order.id,
        pickup_address: order.pickup_address || 'Dirección de recogida',
        delivery_address: order.delivery_address || 'Dirección de entrega',
        customer_name: order.buyer?.name || 'Cliente',
        customer_phone: order.buyer?.phone || 'Sin teléfono',
        total_amount: order.total || 0,
        delivery_fee: order.delivery_fee || 10,
        status: order.status,
        created_at: order.created_at,
        estimated_delivery: order.estimated_delivery || new Date(Date.now() + 30 * 60000).toISOString(),
        items_count: 1,
        business_name: order.sellers?.business_name || order.seller?.name || 'Negocio',
        pickup_notes: order.pickup_notes,
        delivery_notes: order.delivery_notes
      }));

      setActiveDeliveries(transformedDeliveries);
    } catch (error) {
      console.error('Error loading active deliveries:', error);
    }
  };

  const loadDriverStats = async () => {
    try {
      // Calculate stats from deliveries
      const today = new Date().toISOString().split('T')[0];
      
      const { data: todayDeliveries, error: todayError } = await supabase
        .from('orders')
        .select('delivery_fee, total')
        .eq('driver_id', user?.id)
        .eq('status', 'delivered')
        .gte('created_at', today);

      const { data: allDeliveries, error: allError } = await supabase
        .from('orders')
        .select('delivery_fee, total, created_at')
        .eq('driver_id', user?.id)
        .eq('status', 'delivered');

      if (!todayError && todayDeliveries) {
        const todayEarnings = todayDeliveries.reduce((sum, order) => sum + (order.delivery_fee || 0), 0);
        const totalDeliveries = allDeliveries?.length || 0;
        const totalEarnings = allDeliveries?.reduce((sum, order) => sum + (order.delivery_fee || 0), 0) || 0;

        setStats(prev => ({
          ...prev,
          todayDeliveries: todayDeliveries.length,
          todayEarnings,
          totalDeliveries,
          totalEarnings,
          activeTime: calculateActiveTime(),
          completionRate: calculateCompletionRate(allDeliveries || [])
        }));
      } else {
        // Use mock data if tables don't exist
        setStats({
          todayDeliveries: 8,
          todayEarnings: 120,
          activeTime: 6.5,
          averageRating: 4.8,
          totalDeliveries: 156,
          totalEarnings: 2340,
          completionRate: 96
        });
      }
    } catch (error) {
      console.error('Error loading driver stats:', error);
    }
  };

  const calculateActiveTime = () => {
    // Mock calculation - in real app would track login/logout times
    return Math.random() * 8 + 2; // 2-10 hours
  };

  const calculateCompletionRate = (deliveries: any[]) => {
    if (deliveries.length === 0) return 95;
    // Mock calculation - in real app would calculate from actual data
    return Math.floor(Math.random() * 10) + 90; // 90-100%
  };

  const setupOrderNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Subscribe to new orders that become available
      const ordersSubscription = supabase
        .channel('driver-orders')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: 'status=eq.ready'
          },
          (payload) => {
            console.log('New order available:', payload);
            setNewOrdersCount(prev => prev + 1);
            
            // Show browser notification
            if (Notification.permission === 'granted') {
              new Notification('¡Nueva entrega disponible!', {
                body: `Pedido de Q${payload.new.total} listo para recoger`,
                icon: '/favicon.ico',
                tag: 'new-delivery'
              });
            }
            
            // Refresh available orders
            loadAvailableOrders();
          }
        )
        .subscribe();

      // Request notification permission
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      return () => {
        ordersSubscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  }, [user?.id]);

  const toggleDriverStatus = async (newStatus: boolean) => {
    try {
      if (newStatus && !driverStatus.is_verified) {
        toast.error('Tu cuenta debe ser verificada antes de activarte');
        return;
      }

      if (newStatus) {
        // Request location permission and get current location
        const location = await getCurrentLocation();
        if (!location) {
          toast.error('Se requiere acceso a la ubicación para activarse');
          return;
        }
      }

      const { error } = await supabase
        .from('drivers')
        .update({ 
          is_active: newStatus,
          current_location: newStatus ? await getCurrentLocation() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) {
        console.error('Error updating driver status:', error);
        toast.error('Error al actualizar estado');
        return;
      }

      setDriverStatus(prev => ({
        ...prev,
        is_active: newStatus,
        status: newStatus ? 'available' : 'offline'
      }));

      if (newStatus) {
        startLocationTracking();
        toast.success('¡Estás en línea! Comenzarás a recibir pedidos');
      } else {
        stopLocationTracking();
        toast.success('Te has desconectado');
      }

    } catch (error) {
      console.error('Error toggling driver status:', error);
      toast.error('Error al cambiar estado');
    }
  };

  const getCurrentLocation = (): Promise<{lat: number, lng: number} | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationError('Geolocalización no soportada');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationError('Error al obtener ubicación');
          resolve(null);
        }
      );
    });
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        // Update location in database
        await supabase
          .from('drivers')
          .update({ current_location: location })
          .eq('id', user?.id);

        setDriverStatus(prev => ({
          ...prev,
          current_location: location
        }));
      },
      (error) => {
        console.error('Error tracking location:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );

    setWatchId(id);
  };

  const stopLocationTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  };

  const acceptOrder = async (orderId: string) => {
    if (!user?.id) {
      toast.error('Usuario no autenticado');
      return;
    }

    try {
      console.log('Accepting order:', orderId, 'for driver:', user.id);
      
      // Use the RPC function to assign the driver
      const { data, error } = await supabase
        .rpc('assign_driver_to_order', {
          p_order_id: orderId,
          p_driver_id: user.id
        });

      if (error) {
        console.error('RPC Error accepting order:', error);
        toast.error('Error al aceptar pedido');
        return;
      }

      console.log('Accept order response:', data);

      if (data?.[0]?.success) {
        toast.success(data[0].message || 'Pedido aceptado exitosamente');
        loadAvailableOrders();
        loadActiveDeliveries();
        setNewOrdersCount(prev => Math.max(0, prev - 1));
      } else {
        toast.error(data?.[0]?.message || 'Error al aceptar pedido');
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('Error al aceptar pedido');
    }
  };

  const updateDeliveryStatus = async (orderId: string, newStatus: string) => {
    if (!user?.id) {
      toast.error('Usuario no autenticado');
      return;
    }

    try {
      console.log('Updating order status:', orderId, 'to:', newStatus, 'by driver:', user.id);
      
      // Use the RPC function to update order status
      const { data, error } = await supabase
        .rpc('update_order_status', {
          p_order_id: orderId,
          p_new_status: newStatus,
          p_user_id: user.id
        });

      if (error) {
        console.error('RPC Error updating status:', error);
        toast.error('Error al actualizar estado');
        return;
      }

      console.log('Update status response:', data);

      if (data?.[0]?.success) {
        const statusMessages: Record<string, string> = {
          'picked-up': 'Pedido recogido',
          'in-transit': 'En camino al destino',
          'delivered': 'Entrega completada'
        };

        toast.success(statusMessages[newStatus] || 'Estado actualizado');
        loadActiveDeliveries();
        loadDriverStats();
      } else {
        toast.error(data?.[0]?.message || 'Error al actualizar estado');
      }
    } catch (error) {
      console.error('Error updating delivery status:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const openInMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(mapsUrl, '_blank');
  };

  // Navigation items
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: Activity,
      description: 'Resumen y estadísticas'
    },
    {
      id: 'deliveries',
      label: 'Entregas',
      icon: Package,
      description: 'Pedidos disponibles y activos',
      hasNotification: newOrdersCount > 0,
      notificationCount: newOrdersCount
    },
    {
      id: 'history',
      label: 'Historial',
      icon: Calendar,
      description: 'Entregas completadas'
    },
    {
      id: 'profile',
      label: 'Perfil',
      icon: User,
      description: 'Configuración del repartidor'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-green-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-orange-500 to-green-500 p-2 rounded-lg">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-green-600 bg-clip-text text-transparent">
                  TRATO Repartidor
                </h1>
                <p className="text-sm text-gray-600">¡Hola, {user?.name}!</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Estado:</span>
                <Switch
                  checked={driverStatus.is_active}
                  onCheckedChange={toggleDriverStatus}
                  disabled={loading}
                />
                <span className={`text-sm font-medium ${
                  driverStatus.is_active ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {driverStatus.is_active ? 'En línea' : 'Desconectado'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant={driverStatus.is_verified ? "default" : "destructive"}>
                  {driverStatus.is_verified ? 'Verificado' : 'Sin verificar'}
                </Badge>
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  Repartidor
                </Badge>
              </div>
              
              <Button variant="outline" onClick={signOut} className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Location Error Alert */}
        {locationError && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span className="text-yellow-800">{locationError}</span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setLocationError('')}
                  className="ml-auto"
                >
                  Cerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Tabs */}
  <Tabs value={currentView} onValueChange={(value: string) => setCurrentView(value as MainView)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-2/3 mx-auto bg-white border border-gray-200">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger 
                  key={item.id} 
                  value={item.id}
                  className="flex flex-col items-center gap-1 p-4 data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 relative"
                  onClick={() => {
                    if (item.id === 'deliveries') {
                      setNewOrdersCount(0); // Clear notification when viewing deliveries
                    }
                  }}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                    {item.hasNotification && item.notificationCount && item.notificationCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                        {item.notificationCount > 9 ? '9+' : item.notificationCount}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium">{item.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Entregas hoy</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.todayDeliveries}</p>
                    </div>
                    <Package className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Ganancias hoy</p>
                      <p className="text-2xl font-bold text-green-600">Q{stats.todayEarnings}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Tiempo activo</p>
                      <p className="text-2xl font-bold text-orange-600">{stats.activeTime.toFixed(1)}h</p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Calificación</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats.averageRating.toFixed(1)}★</p>
                    </div>
                    <Star className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Estado Actual
                </CardTitle>
              </CardHeader>
              <CardContent>
                {driverStatus.is_active ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="font-medium text-green-800">En línea y disponible</span>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => setCurrentView('deliveries')}>
                          Ver Pedidos
                        </Button>
                        {driverStatus.current_location && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openInMaps(`${driverStatus.current_location?.lat},${driverStatus.current_location?.lng}`)}
                          >
                            <Map className="w-4 h-4 mr-1" />
                            Mi Ubicación
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-green-700">
                      Estás visible para recibir nuevos pedidos. Mantén tu ubicación actualizada.
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <span className="font-medium text-gray-600">Desconectado</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Activa tu estado para comenzar a recibir pedidos.
                    </p>
                    {!driverStatus.is_verified && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <p className="text-sm text-yellow-800">
                          ⚠️ Tu cuenta aún no está verificada. Contacta al administrador para completar la verificación.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Overview */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Resumen de Rendimiento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Entregas totales</span>
                    <span className="font-semibold">{stats.totalDeliveries}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Ganancias totales</span>
                    <span className="font-semibold text-green-600">Q{stats.totalEarnings}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tasa de completación</span>
                    <span className="font-semibold">{stats.completionRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Promedio por entrega</span>
                    <span className="font-semibold">Q{stats.totalDeliveries > 0 ? (stats.totalEarnings / stats.totalDeliveries).toFixed(2) : '0.00'}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" />
                    Logros y Metas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Entregas esta semana</span>
                    <Badge variant="outline">{Math.floor(stats.totalDeliveries / 4)} de 50</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Calificación 5★</span>
                    <Badge variant={stats.averageRating >= 4.8 ? "default" : "outline"}>
                      {stats.averageRating >= 4.8 ? '✓ Logrado' : 'En progreso'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Repartidor del mes</span>
                    <Badge variant="outline">Top 10</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Entregas</h2>
                <p className="text-gray-600">Gestiona tus pedidos disponibles y activos</p>
              </div>
              <Button onClick={loadAvailableOrders} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
            </div>

            <Tabs defaultValue="available" className="space-y-6">
              <TabsList>
                <TabsTrigger value="available" className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Disponibles ({availableOrders.length})
                </TabsTrigger>
                <TabsTrigger value="active" className="flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Activas ({activeDeliveries.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="available" className="space-y-4">
                {!driverStatus.is_active ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Actívate para ver pedidos
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Cambia tu estado a "En línea" para comenzar a recibir pedidos disponibles
                      </p>
                      <Button onClick={() => toggleDriverStatus(true)}>
                        Activarse ahora
                      </Button>
                    </CardContent>
                  </Card>
                ) : availableOrders.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No hay pedidos disponibles
                      </h3>
                      <p className="text-gray-600">
                        Los nuevos pedidos aparecerán aquí automáticamente
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {availableOrders.map((order) => (
                      <Card key={order.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="font-semibold text-lg">Pedido #{order.order_id.slice(0, 8)}</h3>
                              <p className="text-sm text-gray-600">{order.business_name}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-green-600">Q{order.delivery_fee}</div>
                              <p className="text-sm text-gray-600">Tarifa de entrega</p>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <h4 className="font-medium mb-2 text-orange-600">Recoger en:</h4>
                              <p className="text-sm text-gray-700">{order.pickup_address}</p>
                              {order.pickup_notes && (
                                <p className="text-xs text-gray-500 mt-1">Nota: {order.pickup_notes}</p>
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium mb-2 text-green-600">Entregar en:</h4>
                              <p className="text-sm text-gray-700">{order.delivery_address}</p>
                              <p className="text-sm text-gray-600">{order.customer_name}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>{order.items_count} productos</span>
                              <span>Total: Q{order.total_amount}</span>
                              {order.distance && <span>{order.distance} km</span>}
                            </div>
                            <Badge variant="outline">
                              {Math.floor((new Date(order.estimated_delivery).getTime() - Date.now()) / 60000)} min
                            </Badge>
                          </div>

                          <div className="flex space-x-2">
                            <Button 
                              onClick={() => acceptOrder(order.id)}
                              className="flex-1 bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Aceptar Pedido
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => openInMaps(order.pickup_address)}
                            >
                              <MapPin className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => window.open(`tel:${order.customer_phone}`, '_self')}
                            >
                              <Phone className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="active" className="space-y-4">
                {activeDeliveries.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No tienes entregas activas
                      </h3>
                      <p className="text-gray-600">
                        Acepta pedidos disponibles para comenzar a trabajar
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {activeDeliveries.map((delivery) => (
                      <Card key={delivery.id} className="border-orange-200 bg-orange-50">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="font-semibold text-lg">Pedido #{delivery.order_id.slice(0, 8)}</h3>
                              <p className="text-sm text-gray-600">{delivery.business_name}</p>
                              <Badge className={`mt-2 ${
                                delivery.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                                delivery.status === 'picked_up' ? 'bg-orange-100 text-orange-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {delivery.status === 'assigned' ? 'Asignado' :
                                 delivery.status === 'picked_up' ? 'Recogido' :
                                 delivery.status === 'in_transit' ? 'En tránsito' : delivery.status}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-green-600">Q{delivery.delivery_fee}</div>
                              <p className="text-sm text-gray-600">Tarifa de entrega</p>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <h4 className="font-medium mb-2 text-orange-600">Recoger en:</h4>
                              <p className="text-sm text-gray-700">{delivery.pickup_address}</p>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="mt-2"
                                onClick={() => openInMaps(delivery.pickup_address)}
                              >
                                <Navigation className="w-3 h-3 mr-1" />
                                Ir a recoger
                              </Button>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2 text-green-600">Entregar en:</h4>
                              <p className="text-sm text-gray-700">{delivery.delivery_address}</p>
                              <p className="text-sm text-gray-600">{delivery.customer_name}</p>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="mt-2"
                                onClick={() => openInMaps(delivery.delivery_address)}
                              >
                                <Navigation className="w-3 h-3 mr-1" />
                                Ir a entregar
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>{delivery.items_count} productos</span>
                              <span>Total: Q{delivery.total_amount}</span>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => window.open(`tel:${delivery.customer_phone}`, '_self')}
                            >
                              <Phone className="w-3 h-3 mr-1" />
                              Llamar cliente
                            </Button>
                          </div>

                          <div className="flex space-x-2">
                            {delivery.status === 'assigned' && (
                              <Button 
                                onClick={() => updateDeliveryStatus(delivery.id, 'picked_up')}
                                className="flex-1 bg-orange-500 hover:bg-orange-600"
                              >
                                <Package className="w-4 h-4 mr-2" />
                                Marcar como Recogido
                              </Button>
                            )}
                            {delivery.status === 'picked_up' && (
                              <Button 
                                onClick={() => updateDeliveryStatus(delivery.id, 'in_transit')}
                                className="flex-1 bg-blue-500 hover:bg-blue-600"
                              >
                                <Truck className="w-4 h-4 mr-2" />
                                En Tránsito
                              </Button>
                            )}
                            {delivery.status === 'in_transit' && (
                              <Button 
                                onClick={() => updateDeliveryStatus(delivery.id, 'delivered')}
                                className="flex-1 bg-green-500 hover:bg-green-600"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Marcar como Entregado
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Historial de Entregas</h2>
              <p className="text-gray-600">Revisa tus entregas completadas y ganancias</p>
            </div>

            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Historial próximamente
                </h3>
                <p className="text-gray-600">
                  Aquí podrás ver todas tus entregas completadas, ganancias detalladas y estadísticas de rendimiento
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Perfil del Repartidor</h2>
              <p className="text-gray-600">Gestiona tu información y configuración</p>
            </div>

            <Card>
              <CardContent className="p-8 text-center">
                <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Configuración de perfil próximamente
                </h3>
                <p className="text-gray-600">
                  Aquí podrás actualizar tu información personal, datos del vehículo, métodos de pago y preferencias
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}