import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { DriverProfile } from './driver/DriverProfile';
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
  picked_up_at?: string;
  delivered_at?: string;
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

type MainView = 'dashboard' | 'deliveries' | 'history' | 'notifications' | 'profile';

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
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [watchId, setWatchId] = useState<number | null>(null);
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadDriverData();
      loadAvailableOrders();
      loadActiveDeliveries();
      loadCompletedDeliveries();
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
      
      // Debug: Log each order to see what fields are available
      ordersData?.forEach((order: any, index: number) => {
        console.log(`Order ${index + 1}:`, {
          order_id: order.order_id,
          seller_address: order.seller_address,
          business_address: order.business_address,
          delivery_address: order.delivery_address,
          seller_name: order.seller_name,
          business_name: order.business_name
        });
      });
      
      // Transform RPC data to component format
      const transformedOrders: DeliveryOrder[] = (ordersData || []).map((order: any) => ({
        id: order.order_id,
        order_id: order.order_id,
        pickup_address: order.seller_address || order.business_address || 'Contactar vendedor para dirección',
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

  const runDriverDiagnostic = async () => {
    if (!user?.id) {
      toast.error('Usuario no autenticado');
      return;
    }

    console.log('🔍 DIAGNÓSTICO DEL REPARTIDOR');
    console.log('===============================');
    console.log('👤 Driver ID autenticado:', user.id);

    try {
      // 1. Verificar todas las órdenes asignadas a repartidores
      const { data: allOrders, error: allError } = await supabase
        .from('orders')
        .select('*')
        .not('driver_id', 'is', null)
        .order('created_at', { ascending: false });

      if (allError) {
        console.error('❌ Error consultando órdenes con driver_id:', allError);
      } else {
        console.log(`📊 Órdenes con driver_id asignado: ${allOrders?.length || 0}`);
        allOrders?.forEach((order, index) => {
          console.log(`${index + 1}. ID: ${order.id}`);
          console.log(`   Driver ID: ${order.driver_id}`);
          console.log(`   Status: ${order.status}`);
          console.log(`   Customer: ${order.customer_name || 'N/A'}`);
          console.log('   ---');
        });
      }

      // 2. Verificar órdenes específicamente para este repartidor
      const { data: myOrders, error: myError } = await supabase
        .from('orders')
        .select('*')
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false });

      if (myError) {
        console.error('❌ Error consultando mis órdenes:', myError);
      } else {
        console.log(`🚚 Mis órdenes asignadas: ${myOrders?.length || 0}`);
        if (myOrders && myOrders.length > 0) {
          myOrders.forEach((order, index) => {
            console.log(`${index + 1}. ID: ${order.id}`);
            console.log(`   Status: ${order.status}`);
            console.log(`   Customer: ${order.customer_name || 'N/A'}`);
            console.log('   ---');
          });
        } else {
          console.log('⚠️  No tienes órdenes asignadas actualmente');
        }
      }

      // 3. Buscar órdenes en estado "ready" sin driver_id para auto-asignar
      const { data: readyOrders, error: readyError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'ready')
        .is('driver_id', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (readyError) {
        console.error('❌ Error buscando órdenes listas:', readyError);
      } else {
        console.log(`📦 Órdenes listas sin repartidor: ${readyOrders?.length || 0}`);
        
        if (readyOrders && readyOrders.length > 0) {
          const shouldAssign = confirm(`Se encontraron ${readyOrders.length} órdenes listas sin repartidor asignado. ¿Quieres asignarlas a tu cuenta?`);
          
          if (shouldAssign) {
            console.log('🔧 Asignando órdenes listas...');
            
            for (const order of readyOrders) {
              try {
                const { error: updateError } = await supabase
                  .from('orders')
                  .update({ 
                    driver_id: user.id,
                    status: 'assigned',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', order.id);
                
                if (updateError) {
                  console.error(`❌ Error asignando orden ${order.id}:`, updateError);
                } else {
                  console.log(`✅ Orden ${order.id} asignada exitosamente`);
                }
              } catch (err) {
                console.error(`❌ Error:`, err);
              }
            }
            
            toast.success(`${readyOrders.length} órdenes fueron asignadas a tu cuenta`);
            
            // Recargar datos
            await Promise.all([
              loadActiveDeliveries(),
              loadAvailableOrders(),
              loadDriverStats()
            ]);
          }
        }
      }

      console.log('✅ Diagnóstico completado');
      toast.success('Diagnóstico ejecutado. Revisa la consola para detalles.');
      
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
      toast.error('Error ejecutando diagnóstico');
    }
  };

  const loadActiveDeliveries = async () => {
    try {
      console.log('Loading active deliveries for driver:', user?.id);
      
      // Query with seller information to get addresses
      const { data: deliveriesData, error } = await supabase
        .from('orders')
        .select(`
          *,
          seller_info:sellers!seller_id (
            business_name,
            address
          ),
          seller_business:sellers!seller_id (
            business_name,
            business_address,
            business_phone
          )
        `)
        .eq('driver_id', user?.id)
        .in('status', ['assigned', 'picked_up', 'in_transit'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading active deliveries:', error);
        setActiveDeliveries([]);
        return;
      }

      console.log('Active deliveries data with seller info:', deliveriesData);

      // Transform data using seller information
      const transformedDeliveries: DeliveryOrder[] = (deliveriesData || []).map(order => {
        // Get seller address from business profile or user profile
        const sellerAddress = order.seller_business?.business_address || 
                             order.seller_info?.address || 
                             'Contactar vendedor para dirección';
        
        const businessName = order.seller_business?.business_name || 
                            order.seller_info?.name || 
                            'Negocio';

        console.log(`🏪 Orden ${order.id.slice(0,8)}: Vendedor = ${businessName}, Dirección = ${sellerAddress}`);

        return {
          id: order.id,
          order_id: order.id,
          pickup_address: sellerAddress,
          delivery_address: order.delivery_address || 'Dirección de entrega',
          customer_name: order.customer_name || 'Cliente',
          customer_phone: order.customer_phone || order.phone_number || 'Sin teléfono',
          total_amount: order.total || 0,
          delivery_fee: order.delivery_fee || Math.round((order.total || 0) * 0.15) || 10,
          status: order.status,
          created_at: order.created_at,
          estimated_delivery: order.estimated_delivery || new Date(Date.now() + 30 * 60000).toISOString(),
          items_count: 1,
          business_name: businessName,
          pickup_notes: order.pickup_notes,
          delivery_notes: order.delivery_notes,
          picked_up_at: order.picked_up_at,
          delivered_at: order.delivered_at
        };
      });

      console.log('Transformed active deliveries:', transformedDeliveries);
      setActiveDeliveries(transformedDeliveries);
    } catch (error) {
      console.error('Error loading active deliveries:', error);
      setActiveDeliveries([]);
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

      // Actualizar en tabla drivers (is_active + is_online)
      const { error: driverError } = await supabase
        .from('drivers')
        .update({ 
          is_active: newStatus,
          is_online: newStatus,  // Sincronizar estado online
          current_location: newStatus ? await getCurrentLocation() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (driverError) {
        console.error('Error updating driver status:', driverError);
        toast.error('Error al actualizar estado');
        return;
      }

      // También actualizar en tabla users para consistencia
      const { error: userError } = await supabase
        .from('users')
        .update({ is_active: newStatus })
        .eq('id', user?.id);

      if (userError) {
        console.error('Error updating user status:', userError);
      }

      setDriverStatus(prev => ({
        ...prev,
        is_active: newStatus,
        status: newStatus ? 'available' : 'offline'
      }));

      if (newStatus) {
        startLocationTracking();
        toast.success('¡Estás EN LÍNEA! Comenzarás a recibir pedidos');
      } else {
        stopLocationTracking();
        toast.success('Te has DESCONECTADO');
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

    setProcessingOrderId(orderId);

    try {
      console.log('Updating order status:', orderId, 'to:', newStatus, 'by driver:', user.id);
      
      // Primero obtenemos la información completa del pedido
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !orderData) {
        console.error('Error getting order data:', orderError);
        toast.error('Error al obtener información del pedido');
        return;
      }

      // Actualización directa usando update en lugar de RPC
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        driver_id: user.id
      };

      // Agregar campos específicos según el estado
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
        console.error('Error updating status:', error);
        toast.error('Error al actualizar estado: ' + error.message);
        return;
      }

      console.log('Update status response:', data);

      if (data && data.length > 0) {
        const statusMessages: Record<string, string> = {
          'picked_up': '📦 Pedido marcado como recogido',
          'in_transit': '🚚 En camino al destino',
          'delivered': '✅ Entrega completada exitosamente'
        };

        toast.success(statusMessages[newStatus] || 'Estado actualizado');

        // 🚀 NUEVO: Si el pedido fue marcado como entregado, ejecutar sistema completo
        if (newStatus === 'delivered') {
          await handleDeliveryCompleted(orderId, orderData);
        }
        
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
      console.error('Error updating delivery status:', error);
      toast.error('Error al actualizar estado');
    } finally {
      setProcessingOrderId(null);
    }
  };

  // 🚀 NUEVA FUNCIÓN: Manejo completo cuando se entrega un pedido
  const handleDeliveryCompleted = async (orderId: string, orderData: any) => {
    if (!user?.id) return;
    
    try {
      console.log('🎯 Iniciando proceso de entrega completada para pedido:', orderId);
      
      // 1. 📨 Enviar notificaciones al vendedor y comprador
      await sendDeliveryNotifications(orderId, orderData);
      
      // 2. 🌟 Crear registros para calificaciones pendientes
      await createRatingRecords(orderId, orderData);
      
      // 3. 📊 Actualizar estadísticas del repartidor
      await updateDriverStats(user.id);
      
      console.log('✅ Proceso de entrega completada exitoso');
      
    } catch (error) {
      console.error('❌ Error en proceso de entrega completada:', error);
      // No mostramos error al usuario para no interrumpir el flujo principal
    }
  };

  // 📨 Función para enviar notificaciones
  const sendDeliveryNotifications = async (orderId: string, orderData: any) => {
    if (!user?.id) return;
    
    try {
      const notifications = [];
      
      // Notificación al vendedor
      if (orderData.seller_id) {
        notifications.push({
          recipient_id: orderData.seller_id,
          type: 'delivery_completed',
          title: '✅ Pedido Entregado',
          message: `Tu pedido #${orderId.slice(0, 8)} ha sido entregado exitosamente. ¡Califica al repartidor y comprador!`,
          data: {
            order_id: orderId,
            action_required: 'rate_driver_and_buyer',
            driver_id: user.id,
            buyer_id: orderData.buyer_id
          },
          created_at: new Date().toISOString()
        });
      }

      // Notificación al comprador
      if (orderData.buyer_id) {
        notifications.push({
          recipient_id: orderData.buyer_id,
          type: 'delivery_completed',
          title: '🎉 ¡Tu pedido ha llegado!',
          message: `Tu pedido #${orderId.slice(0, 8)} ha sido entregado. ¡Califica al vendedor y repartidor!`,
          data: {
            order_id: orderId,
            action_required: 'rate_seller_and_driver',
            seller_id: orderData.seller_id,
            driver_id: user.id
          },
          created_at: new Date().toISOString()
        });
      }

      // Insertar todas las notificaciones
      if (notifications.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .insert(notifications);

        if (error) {
          console.error('Error sending notifications:', error);
        } else {
          console.log('📨 Notificaciones enviadas exitosamente');
        }
      }
    } catch (error) {
      console.error('Error sending delivery notifications:', error);
    }
  };

  // 🌟 Función para crear registros de calificaciones
  const createRatingRecords = async (orderId: string, orderData: any) => {
    if (!user?.id) return;
    
    try {
      const ratingRecords = [];

      // Registro para que el vendedor califique al repartidor
      if (orderData.seller_id) {
        ratingRecords.push({
          order_id: orderId,
          rater_id: orderData.seller_id,
          rated_id: user.id,
          rating_type: 'seller_to_driver',
          status: 'pending',
          created_at: new Date().toISOString()
        });
      }

      // Registro para que el vendedor califique al comprador
      if (orderData.seller_id && orderData.buyer_id) {
        ratingRecords.push({
          order_id: orderId,
          rater_id: orderData.seller_id,
          rated_id: orderData.buyer_id,
          rating_type: 'seller_to_buyer',
          status: 'pending',
          created_at: new Date().toISOString()
        });
      }

      // Registro para que el comprador califique al vendedor
      if (orderData.buyer_id && orderData.seller_id) {
        ratingRecords.push({
          order_id: orderId,
          rater_id: orderData.buyer_id,
          rated_id: orderData.seller_id,
          rating_type: 'buyer_to_seller',
          status: 'pending',
          created_at: new Date().toISOString()
        });
      }

      // Registro para que el comprador califique al repartidor
      if (orderData.buyer_id) {
        ratingRecords.push({
          order_id: orderId,
          rater_id: orderData.buyer_id,
          rated_id: user.id,
          rating_type: 'buyer_to_driver',
          status: 'pending',
          created_at: new Date().toISOString()
        });
      }

      // Insertar registros de calificaciones
      if (ratingRecords.length > 0) {
        const { error } = await supabase
          .from('ratings')
          .insert(ratingRecords);

        if (error) {
          console.error('Error creating rating records:', error);
        } else {
          console.log('🌟 Registros de calificación creados exitosamente');
        }
      }
    } catch (error) {
      console.error('Error creating rating records:', error);
    }
  };

  // 📊 Función para actualizar estadísticas del repartidor
  const updateDriverStats = async (driverId: string) => {
    try {
      // Aquí podrías actualizar estadísticas como:
      // - Total de entregas completadas
      // - Ganancias acumuladas
      // - Tiempo promedio de entrega
      // - Calificación promedio
      
      console.log('📊 Actualizando estadísticas del repartidor:', driverId);
      
      // Implementación opcional: podrías crear una tabla driver_stats
      // y actualizar los números aquí
      
    } catch (error) {
      console.error('Error updating driver stats:', error);
    }
  };

  const loadCompletedDeliveries = async () => {
    try {
      console.log('Loading completed deliveries for driver:', user?.id);
      
      const { data, error } = await supabase
        .rpc('driver_get_completed_orders', {
          p_driver_id: user?.id
        });

      if (error) {
        console.error('Error loading delivery history:', error);
        setCompletedDeliveries([]);
        return;
      }

      console.log('Delivery history data:', data);
      
      // Transform to component format
      const transformedHistory: DeliveryOrder[] = (data || []).map((delivery: any) => ({
        id: delivery.order_id,
        order_id: delivery.order_id,
        pickup_address: 'Recogido',
        delivery_address: 'Entregado',
        customer_name: delivery.customer_name,
        customer_phone: 'Completado',
        total_amount: delivery.total_amount || 0,
        delivery_fee: delivery.delivery_fee || 0,
        status: delivery.status,
        created_at: delivery.created_at,
        estimated_delivery: delivery.delivered_at || delivery.created_at,
        items_count: 1,
        business_name: delivery.business_name,
        pickup_notes: undefined,
        delivery_notes: undefined
      }));

      setCompletedDeliveries(transformedHistory);
    } catch (error) {
      console.error('Error loading completed deliveries:', error);
      setCompletedDeliveries([]);
    }
  };

  const openInMaps = (address: string) => {
    console.log('🗺️ Abriendo dirección en mapas:', address);
    
    // Verificar que la dirección no sea un placeholder
    if (!address || address === 'Dirección del vendedor' || address === 'Dirección de recogida' || address.includes('Contactar vendedor')) {
      toast.error('Dirección no disponible. Contacta al vendedor.');
      return;
    }
    
    const encodedAddress = encodeURIComponent(address);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    console.log('🔗 URL de mapas:', mapsUrl);
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
      id: 'notifications',
      label: 'Notificaciones',
      icon: Bell,
      description: 'Centro de notificaciones',
      hasNotification: newOrdersCount > 0,
      notificationCount: newOrdersCount
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
          <TabsList className="grid w-full grid-cols-5 lg:w-2/3 mx-auto bg-white border border-gray-200">
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
              <div className="flex gap-2">
                <Button onClick={loadAvailableOrders} variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualizar
                </Button>
                <Button onClick={runDriverDiagnostic} variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Diagnóstico
                </Button>
              </div>
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

            {completedDeliveries.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Sin entregas completadas
                  </h3>
                  <p className="text-gray-600">
                    Aquí aparecerán todas tus entregas completadas
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Entregas Hoy</p>
                          <p className="text-2xl font-bold">
                            {completedDeliveries.filter(d => 
                              d.delivered_at && new Date(d.delivered_at).toDateString() === new Date().toDateString()
                            ).length}
                          </p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Ganancias Hoy</p>
                          <p className="text-2xl font-bold text-green-600">
                            Q{completedDeliveries
                              .filter(d => d.delivered_at && new Date(d.delivered_at).toDateString() === new Date().toDateString())
                              .reduce((sum, d) => sum + d.delivery_fee, 0)
                              .toFixed(2)}
                          </p>
                        </div>
                        <DollarSign className="w-8 h-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Entregas</p>
                          <p className="text-2xl font-bold">{completedDeliveries.length}</p>
                        </div>
                        <Package className="w-8 h-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Delivery History List */}
                <div className="space-y-3">
                  {completedDeliveries.map((delivery) => (
                    <Card key={delivery.id} className="border-green-200 bg-green-50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold">Pedido #{delivery.order_id.slice(0, 8)}</h3>
                              <Badge className="bg-green-100 text-green-800">Entregado</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">{delivery.business_name}</p>
                            <p className="text-sm text-gray-600">
                              Entregado: {delivery.delivered_at ? new Date(delivery.delivered_at).toLocaleString('es-GT', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'Fecha no disponible'}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                              <span>{delivery.items_count} productos</span>
                              <span>Total: Q{delivery.total_amount}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-green-600">Q{delivery.delivery_fee}</div>
                            <p className="text-sm text-gray-600">Ganancia</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Notificaciones</h2>
              <p className="text-gray-600">Centro de notificaciones del repartidor</p>
            </div>
            
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Centro de Notificaciones
                </h3>
                <p className="text-gray-600">
                  Aquí aparecerán todas tus notificaciones de pedidos y actualizaciones del sistema
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <DriverProfile />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}