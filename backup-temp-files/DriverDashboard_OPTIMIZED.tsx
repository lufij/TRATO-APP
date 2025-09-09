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
import { NotificationSystem } from './notifications/NotificationSystem';
import { CriticalNotifications } from './notifications/CriticalNotifications';
import { DeliveryTracking } from './delivery/DeliveryTracking';
// import { MobileNotificationButton } from './ui/MobileNotificationButton';
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
  items_count: number;
  business_name?: string;
  pickup_notes?: string;
  delivery_notes?: string;
  picked_up_at?: string;
  delivered_at?: string;
}

interface DriverStats {
  total_deliveries: number;
  today_deliveries: number;
  today_earnings: number;
  average_rating: number;
  completion_rate: number;
  active_hours: number;
  pending_orders: number;
  in_progress_orders: number;
}

export default function DriverDashboard() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [availableOrders, setAvailableOrders] = useState<DeliveryOrder[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<DeliveryOrder[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<DeliveryOrder[]>([]);
  const [currentView, setCurrentView] = useState('deliveries');
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  
  // Driver status state
  const [driverStatus, setDriverStatus] = useState({
    is_active: false,
    is_online: false,
    current_location: { lat: 0, lng: 0 }
  });

  const [driverStats, setDriverStats] = useState<DriverStats>({
    total_deliveries: 0,
    today_deliveries: 0,
    today_earnings: 0,
    average_rating: 0,
    completion_rate: 0,
    active_hours: 0,
    pending_orders: 0,
    in_progress_orders: 0
  });

  // Driver profile state
  const [showProfile, setShowProfile] = useState(false);

  // Estado para notificaciones críticas
  const [criticalNotifications, setCriticalNotifications] = useState<any[]>([]);
  const [showCriticalNotifications, setShowCriticalNotifications] = useState(false);

  // Función para manejar alertas críticas específicas del repartidor
  const handleDriverAlert = (type: string, message: string) => {
    console.log(`🚨 Alerta crítica para repartidor: ${type} - ${message}`);
    // Aquí se pueden agregar acciones específicas para repartidores
  };

  // ========================================
  // 🔧 FUNCIONES MEMOIZADAS CON useCallback
  // ========================================
  
  const loadDriverData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      const { data: driverData, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading driver data:', error);
        return;
      }

      if (driverData) {
        setDriverStatus({
          is_active: driverData.is_active || false,
          is_online: driverData.is_online || false,
          current_location: driverData.current_location || { lat: 0, lng: 0 }
        });
      }
    } catch (error) {
      console.error('Error in loadDriverData:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const loadAvailableOrders = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      console.log('Loading available orders...');
      
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          seller_info:sellers!seller_id (
            business_name,
            business_address,
            business_phone
          )
        `)
        .eq('status', 'ready')
        .eq('delivery_type', 'delivery')
        .is('driver_id', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading available orders:', error);
        setAvailableOrders([]);
        return;
      }

      const transformedOrders: DeliveryOrder[] = (ordersData || []).map(order => ({
        id: order.id,
        order_id: order.id,
        pickup_address: order.seller_info?.business_address || 'Contactar vendedor',
        delivery_address: order.delivery_address || 'Dirección de entrega',
        customer_name: order.customer_name || 'Cliente',
        customer_phone: order.customer_phone || order.phone_number || 'Sin teléfono',
        total_amount: order.total || 0,
        delivery_fee: order.delivery_fee || Math.round((order.total || 0) * 0.15) || 10,
        status: order.status,
        created_at: order.created_at,
        estimated_delivery: order.estimated_delivery || new Date(Date.now() + 30 * 60000).toISOString(),
        items_count: 1,
        business_name: order.seller_info?.business_name || 'Negocio'
      }));

      console.log('Available orders transformed:', transformedOrders);
      setAvailableOrders(transformedOrders);
    } catch (error) {
      console.error('Error in loadAvailableOrders:', error);
      setAvailableOrders([]);
    }
  }, [user?.id]);

  const loadActiveDeliveries = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      console.log('Loading active deliveries for driver:', user.id);
      
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
        .eq('driver_id', user.id)
        .in('status', ['assigned', 'picked_up', 'in_transit'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading active deliveries:', error);
        setActiveDeliveries([]);
        return;
      }

      console.log('Active deliveries data with seller info:', deliveriesData);

      const transformedDeliveries: DeliveryOrder[] = (deliveriesData || []).map(order => {
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
      console.error('Error in loadActiveDeliveries:', error);
      setActiveDeliveries([]);
    }
  }, [user?.id]);

  const loadDriverStats = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: statsData, error } = await supabase
        .from('orders')
        .select('status, total, delivery_fee, delivered_at')
        .eq('driver_id', user.id);

      if (error) {
        console.error('Error loading driver stats:', error);
        return;
      }

      const todayDeliveries = statsData?.filter(order => 
        order.delivered_at && order.delivered_at.startsWith(today)
      ) || [];

      const completedOrders = statsData?.filter(order => order.status === 'delivered') || [];
      
      const todayEarnings = todayDeliveries.reduce((sum, order) => 
        sum + (order.delivery_fee || 0), 0
      );

      const totalEarnings = completedOrders.reduce((sum, order) => 
        sum + (order.delivery_fee || 0), 0
      );

      setDriverStats({
        total_deliveries: completedOrders.length,
        today_deliveries: todayDeliveries.length,
        today_earnings: todayEarnings,
        average_rating: 4.8, // Placeholder
        completion_rate: 95, // Placeholder
        active_hours: 8, // Placeholder
        pending_orders: availableOrders.length,
        in_progress_orders: activeDeliveries.length
      });
    } catch (error) {
      console.error('Error in loadDriverStats:', error);
    }
  }, [user?.id, availableOrders.length, activeDeliveries.length]);

  const loadCompletedDeliveries = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data: completedData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('driver_id', user.id)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading completed deliveries:', error);
        return;
      }

      const { data: todayCompletedData, error: todayError } = await supabase
        .from('orders')
        .select('*')
        .eq('driver_id', user.id)
        .eq('status', 'delivered');

      if (todayError) {
        console.error('Error loading today completed deliveries:', todayError);
        setCompletedDeliveries([]);
        return;
      }

      const transformedCompleted: DeliveryOrder[] = (completedData || []).map(order => ({
        id: order.id,
        order_id: order.id,
        pickup_address: 'Recolectado',
        delivery_address: order.delivery_address || 'Entregado',
        customer_name: order.customer_name || 'Cliente',
        customer_phone: order.customer_phone || 'N/A',
        total_amount: order.total || 0,
        delivery_fee: order.delivery_fee || 0,
        status: order.status,
        created_at: order.created_at,
        estimated_delivery: order.delivered_at || order.created_at,
        items_count: 1,
        business_name: 'Completada',
        delivered_at: order.delivered_at
      }));

      setCompletedDeliveries(transformedCompleted);
    } catch (error) {
      console.error('Error in loadCompletedDeliveries:', error);
      setCompletedDeliveries([]);
    }
  }, [user?.id]);

  const setupOrderNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    try {
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

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error setting up order notifications:', error);
    }
  }, [user?.id, loadAvailableOrders, loadActiveDeliveries]);

  // Estados adicionales que faltaban
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [stats, setStats] = useState({
    todayDeliveries: 0,
    todayEarnings: 0,
    activeTime: 0,
    averageRating: 4.8,
    totalDeliveries: 0,
    totalEarnings: 0,
    completionRate: 95
  });
  const [locationError, setLocationError] = useState('');
  const [watchId, setWatchId] = useState<number | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  // Tipos para las vistas
  type MainView = 'dashboard' | 'deliveries' | 'history' | 'notifications' | 'profile';

  // Función de diagnóstico del repartidor
  const runDriverDiagnostic = useCallback(async () => {
    if (!user?.id) {
      toast.error('Usuario no autenticado');
      return;
    }

    try {
      console.log('🔍 Iniciando diagnóstico del repartidor...');
      toast.info('Ejecutando diagnóstico...');
      
      // 1. Verificar todas las órdenes existentes con driver_id
      console.log('📊 Verificando órdenes generales...');
      const { data: allOrders, error: allError } = await supabase
        .from('orders')
        .select('*')
        .not('driver_id', 'is', null)
        .order('created_at', { ascending: false });

      if (allError) {
        console.error('❌ Error consultando órdenes:', allError);
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
  }, [user?.id, loadActiveDeliveries, loadAvailableOrders, loadDriverStats]);

  // Función para aceptar órdenes
  const acceptOrder = useCallback(async (orderId: string) => {
    if (!user?.id) {
      toast.error('Usuario no autenticado');
      return;
    }

    try {
      console.log('🎯 Accepting order:', orderId, 'for driver:', user.id);
      
      // Use the RPC function to assign the driver
      const { data, error } = await supabase
        .rpc('assign_driver_to_order', {
          p_order_id: orderId,
          p_driver_id: user.id
        });

      if (error) {
        console.error('❌ RPC Error accepting order:', error);
        toast.error('Error al aceptar pedido');
        return;
      }

      console.log('✅ Accept order response:', data);

      if (data?.[0]?.success) {
        toast.success(data[0].message || 'Pedido aceptado exitosamente');
        await Promise.all([
          loadAvailableOrders(),
          loadActiveDeliveries()
        ]);
        setNewOrdersCount(prev => Math.max(0, prev - 1));
      } else {
        toast.error(data?.[0]?.message || 'Error al aceptar pedido');
      }
    } catch (error) {
      console.error('❌ Error accepting order:', error);
      toast.error('Error al aceptar pedido');
    }
  }, [user?.id, loadAvailableOrders, loadActiveDeliveries]);

  // Función para manejar notificaciones de en tránsito
  const sendInTransitNotification = useCallback(async (orderId: string, orderData: any) => {
    try {
      // Create in-transit notification for customer
      const notificationData = {
        user_id: orderData.user_id,
        title: '🚚 Pedido en camino',
        body: `Tu pedido #${orderId.slice(-6)} está en camino. El repartidor se dirige a tu ubicación.`,
        type: 'order_update',
        data: JSON.stringify({
          orderId: orderId,
          status: 'in_transit',
          driverId: user?.id,
          driverName: user?.user_metadata?.full_name || 'Repartidor'
        })
      };

      await supabase.from('notifications').insert([notificationData]);
      console.log('📱 Notificación de en tránsito enviada');
    } catch (error) {
      console.error('❌ Error enviando notificación de en tránsito:', error);
    }
  }, [user?.id, user?.user_metadata?.full_name]);

  // Función para manejar entrega completada
  const handleDeliveryCompleted = useCallback(async (orderId: string, orderData: any) => {
    try {
      // Create delivery completion notification
      const notificationData = {
        user_id: orderData.user_id,
        title: '✅ Entrega completada',
        body: `Tu pedido #${orderId.slice(-6)} ha sido entregado exitosamente. ¡Esperamos que disfrutes tu compra!`,
        type: 'delivery_completed',
        data: JSON.stringify({
          orderId: orderId,
          status: 'delivered',
          driverId: user?.id,
          driverName: user?.user_metadata?.full_name || 'Repartidor',
          completedAt: new Date().toISOString()
        })
      };

      await supabase.from('notifications').insert([notificationData]);
      console.log('📱 Notificación de entrega completada enviada');
    } catch (error) {
      console.error('❌ Error enviando notificación de entrega:', error);
    }
  }, [user?.id, user?.user_metadata?.full_name]);

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

  // Función para obtener posición del usuario
  const getCurrentPosition = useCallback(() => {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }, []);

  // Función para abrir maps con dirección
  const openMapsWithDirection = useCallback(async (order: any) => {
    try {
      let currentLat = 0;
      let currentLng = 0;

      try {
        const position = await getCurrentPosition();
        currentLat = position.coords.latitude;
        currentLng = position.coords.longitude;
      } catch (error) {
        console.warn('No se pudo obtener ubicación actual:', error);
        // Continuamos con coordenadas por defecto
        currentLat = 13.6929;
        currentLng = -89.2182;
      }

      const destination = `${order.latitude},${order.longitude}`;
      const origin = `${currentLat},${currentLng}`;
      
      // URL para Google Maps con direcciones
      const mapsUrl = `https://www.google.com/maps/dir/${origin}/${destination}`;
      
      window.open(mapsUrl, '_blank');
      
      toast.success('Abriendo Google Maps...');
    } catch (error) {
      console.error('Error abriendo mapa:', error);
      toast.error('Error al abrir el mapa');
    }
  }, [getCurrentPosition]);

  // Función para formatear tiempo
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, []);

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

  // Cargar datos iniciales solo cuando el usuario cambia
  useEffect(() => {
    if (user?.id) {
      loadDriverData();
      loadAvailableOrders();
      loadActiveDeliveries();
      loadCompletedDeliveries();
      loadDriverStats();
      setupOrderNotifications();
    }
  }, [user?.id]); // Solo depende del ID del usuario

  // Auto-refresh controlado - solo cuando está activo
  useEffect(() => {
    if (!driverStatus.is_active || currentView !== 'deliveries') {
      return;
    }

    const interval = setInterval(() => {
      loadAvailableOrders();
      loadActiveDeliveries();
    }, 30000);

    return () => clearInterval(interval);
  }, [driverStatus.is_active, currentView, loadAvailableOrders, loadActiveDeliveries]);

  // Estados adicionales que faltaban
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [stats, setStats] = useState({
    todayDeliveries: 0,
    todayEarnings: 0,
    activeTime: 0,
    averageRating: 4.8,
    totalDeliveries: 0,
    totalEarnings: 0,
    completionRate: 95
  });
  const [locationError, setLocationError] = useState('');
  const [watchId, setWatchId] = useState<number | null>(null);

  // Tipos para las vistas
  type MainView = 'dashboard' | 'deliveries' | 'history' | 'notifications' | 'profile';

  // Función de diagnóstico del repartidor
  const runDriverDiagnostic = useCallback(async () => {
    if (!user?.id) {
      toast.error('Usuario no autenticado');
      return;
    }

    try {
      console.log('🔍 Iniciando diagnóstico del repartidor...');
      toast.info('Ejecutando diagnóstico...');
      
      // 1. Verificar todas las órdenes existentes con driver_id
      console.log('📊 Verificando órdenes generales...');
      const { data: allOrders, error: allError } = await supabase
        .from('orders')
        .select('*')
        .not('driver_id', 'is', null)
        .order('created_at', { ascending: false });

      if (allError) {
        console.error('❌ Error consultando órdenes:', allError);
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
  }, [user?.id, loadActiveDeliveries, loadAvailableOrders, loadDriverStats]);

  // Actualizar función updateDeliveryStatus con mejor manejo
  const updateDeliveryStatus = useCallback(async (orderId: string, newStatus: string) => {
    if (!user?.id) {
      toast.error('Usuario no autenticado');
      return;
    }

    setProcessingOrderId(orderId);

    try {
      console.log('🔄 Updating order status:', orderId, 'to:', newStatus, 'by driver:', user.id);
      
      // Primero obtenemos la información completa del pedido
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !orderData) {
        console.error('❌ Error getting order data:', orderError);
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

      console.log('📊 Update data:', updateData);

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

        // 🚀 Enviar notificaciones según el estado
        if (newStatus === 'in_transit') {
          await sendInTransitNotification(orderId, orderData);
        } else if (newStatus === 'delivered') {
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
      
      // Use the RPC function to assign the driver
      const { data, error } = await supabase
        .rpc('assign_driver_to_order', {
          p_order_id: orderId,
          p_driver_id: user.id
        });

      if (error) {
        console.error('❌ RPC Error accepting order:', error);
        toast.error('Error al aceptar pedido');
        return;
      }

      console.log('✅ Accept order response:', data);

      if (data?.[0]?.success) {
        toast.success(data[0].message || 'Pedido aceptado exitosamente');
        await Promise.all([
          loadAvailableOrders(),
          loadActiveDeliveries()
        ]);
        setNewOrdersCount(prev => Math.max(0, prev - 1));
      } else {
        toast.error(data?.[0]?.message || 'Error al aceptar pedido');
      }
    } catch (error) {
      console.error('❌ Error accepting order:', error);
      toast.error('Error al aceptar pedido');
    }
  }, [user?.id, loadAvailableOrders, loadActiveDeliveries]);
  
  // useEffect principal para cargar datos iniciales - OPTIMIZADO
  useEffect(() => {
    if (user?.id && isOnline) {
      loadDriverData();
    }
  }, [user?.id, isOnline, loadDriverData]);

  // useEffect para setup de notificaciones - OPTIMIZADO
  useEffect(() => {
    if (user?.id && isOnline) {
      setupOrderNotifications();
    }

    return () => {
      if (notificationSubscription) {
        notificationSubscription.unsubscribe();
      }
    };
  }, [user?.id, isOnline, setupOrderNotifications]);

  // useEffect para limpiar watch de geolocalización
  useEffect(() => {
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

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

  // Función para renderizar el contenido principal según la vista
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
                  {activeDeliveries.length > 0 && (
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {activeDeliveries.length} pendientes
                    </span>
                  )}
                </div>
              </div>
              
              <div className="p-6">
                {activeDeliveries.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Truck className="w-12 h-12 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-4">No tienes entregas activas</p>
                    <p className="text-sm text-gray-400">
                      Las nuevas órdenes aparecerán aquí cuando sean asignadas
                    </p>
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

                        {/* Productos del pedido */}
                        {delivery.order_items && delivery.order_items.length > 0 && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Productos:</h4>
                            <div className="space-y-1">
                              {delivery.order_items.slice(0, 3).map((item: any, index: number) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span className="text-gray-600">
                                    {item.quantity}x {item.daily_products?.name || 'Producto'}
                                  </span>
                                  <span className="text-gray-500">
                                    ${(item.daily_products?.price * item.quantity).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                              {delivery.order_items.length > 3 && (
                                <p className="text-xs text-gray-500 italic">
                                  +{delivery.order_items.length - 3} productos más
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Botones de acción */}
                        <div className="flex gap-2 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => openMapsWithDirection(delivery)}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                          >
                            <Navigation className="w-4 h-4" />
                            Ir al destino
                          </button>

                          {delivery.status === 'assigned' && (
                            <button
                              onClick={() => updateDeliveryStatus(delivery.id, 'picked_up')}
                              disabled={processingOrderId === delivery.id}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              {processingOrderId === delivery.id ? (
                                <div className="flex items-center justify-center gap-1">
                                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
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
                                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
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
                                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
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
                  {newOrdersCount > 0 && (
                    <span className="bg-green-500 text-white text-xs font-medium px-2.5 py-0.5 rounded-full animate-pulse">
                      {newOrdersCount} nuevas
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6">
                {availableOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="w-12 h-12 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-4">No hay órdenes disponibles</p>
                    <p className="text-sm text-gray-400">
                      Las nuevas órdenes aparecerán aquí cuando estén listas para entrega
                    </p>
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

                        {/* Productos del pedido */}
                        {order.order_items && order.order_items.length > 0 && (
                          <div className="mb-4 p-3 bg-white rounded-lg">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Productos:</h4>
                            <div className="space-y-1">
                              {order.order_items.slice(0, 3).map((item: any, index: number) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span className="text-gray-600">
                                    {item.quantity}x {item.daily_products?.name || 'Producto'}
                                  </span>
                                  <span className="text-gray-500">
                                    ${(item.daily_products?.price * item.quantity).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                              {order.order_items.length > 3 && (
                                <p className="text-xs text-gray-500 italic">
                                  +{order.order_items.length - 3} productos más
                                </p>
                              )}
                            </div>
                          </div>
                        )}

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

      case 'history':
        return (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Historial de Entregas ({completedDeliveries.length})
              </h2>
            </div>
            <div className="p-6">
              {completedDeliveries.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="w-12 h-12 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-4">No hay entregas completadas</p>
                  <p className="text-sm text-gray-400">
                    Tus entregas completadas aparecerán aquí
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {completedDeliveries.map((delivery) => (
                    <div key={delivery.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">
                              Pedido #{delivery.id.slice(-6)}
                            </span>
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                              ✅ Entregado
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            👤 {delivery.customer_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            📅 {formatDate(delivery.delivered_at || delivery.updated_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            ${delivery.total?.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Notificaciones</h2>
            </div>
            <div className="p-6">
              <div className="text-center py-12">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Panel de notificaciones</p>
                <p className="text-sm text-gray-400 mt-2">
                  Las notificaciones de nuevos pedidos aparecerán aquí
                </p>
              </div>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Mi Perfil</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {user?.user_metadata?.full_name || 'Repartidor'}
                  </h3>
                  <p className="text-gray-500">{user?.email}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600">{stats.averageRating} / 5.0</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Estadísticas Generales</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total de entregas:</span>
                      <span className="font-semibold">{stats.totalDeliveries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ganancias totales:</span>
                      <span className="font-semibold text-green-600">${stats.totalEarnings.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tasa de completación:</span>
                      <span className="font-semibold">{stats.completionRate}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Estado</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm text-gray-600">
                        {isOnline ? 'En línea' : 'Desconectado'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Entregas activas:</span>
                      <span className="font-semibold">{activeDeliveries.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón de diagnóstico */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={runDriverDiagnostic}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Settings className="w-5 h-5" />
                  Ejecutar Diagnóstico de Sistema
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Verifica el estado de tus órdenes y asigna pedidos pendientes
                </p>
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

            {/* Estado actual y acciones rápidas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Estado actual */}
              <div className="bg-white rounded-xl shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Estado Actual</h2>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-600">Estado de conexión:</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                        {isOnline ? 'En línea' : 'Desconectado'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-600">Órdenes disponibles:</span>
                    <span className="font-semibold text-blue-600">{availableOrders.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Entregas pendientes:</span>
                    <span className="font-semibold text-orange-600">{activeDeliveries.length}</span>
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
                  
                  <button
                    onClick={runDriverDiagnostic}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Settings className="w-5 h-5" />
                    Diagnóstico de Sistema
                  </button>
                </div>
              </div>
            </div>

            {/* Resumen de entregas activas */}
            {activeDeliveries.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Entregas en Curso</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {activeDeliveries.slice(0, 3).map((delivery) => (
                      <div key={delivery.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">
                            Pedido #{delivery.id.slice(-6)} - {delivery.customer_name}
                          </p>
                          <p className="text-sm text-gray-500">{delivery.address}</p>
                        </div>
                        <div className="text-right">
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
                          <p className="text-sm font-semibold text-green-600 mt-1">
                            ${delivery.total?.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {activeDeliveries.length > 3 && (
                      <div className="text-center pt-2">
                        <button
                          onClick={() => setCurrentView('deliveries')}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Ver todas las entregas ({activeDeliveries.length})
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
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
                    {user?.user_metadata?.full_name || user?.email}
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

              {/* Contador de nuevas órdenes */}
              {newOrdersCount > 0 && (
                <div className="relative">
                  <Bell className="h-6 w-6 text-gray-600" />
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {newOrdersCount}
                  </span>
                </div>
              )}

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
                  onClick={() => setCurrentView(tab.id as MainView)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    currentView === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                  {tab.id === 'deliveries' && (activeDeliveries.length > 0 || availableOrders.length > 0) && (
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                      {tab.id === 'deliveries' ? activeDeliveries.length + availableOrders.length : 0}
                    </span>
                  )}
                  {tab.id === 'notifications' && newOrdersCount > 0 && (
                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                      {newOrdersCount}
                    </span>
                  )}
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

      {/* Toast container */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  );
};

export default DriverDashboard;
