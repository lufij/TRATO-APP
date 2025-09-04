import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ProductForm } from './ProductForm';
import { DailyProductForm } from './DailyProductForm';
import { ProductCard } from './ProductCard';
import { DailyProductCard } from './DailyProductCard';
import { SellerBusinessProfile } from './SellerBusinessProfile';
import { SellerOrderManagement } from './seller/SellerOrderManagement';
import { SellerMarketplace } from './seller/SellerMarketplace';
import { LocationVerification } from './LocationVerification';
import { VerificationAlert } from './VerificationAlert';
import { NotificationPermissionBanner } from './ui/NotificationPermissionBanner';
import { OnlineDriversIndicator } from './OnlineDriversIndicator';
import { useVerificationStatus } from '../hooks/useVerificationStatus';
import { NotificationSystem } from './notifications/NotificationSystem';
import { CriticalNotifications } from './notifications/CriticalNotifications';
import { TimeoutAlerts } from './alerts/TimeoutAlerts';
import { 
  Plus, 
  Package, 
  Clock, 
  Store, 
  TrendingUp, 
  AlertCircle,
  Loader2,
  RefreshCw,
  Home,
  ShoppingBag,
  ClipboardList,
  User,
  BarChart3,
  Calendar,
  DollarSign,
  Users,
  Star,
  Settings,
  LogOut,
  ShoppingCart,
  MapPin
} from 'lucide-react';
import { MobileToastNotifications } from './notifications/MobileToastNotifications';

interface Product {
  id: string;
  seller_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock_quantity: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface DailyProduct {
  id: string;
  seller_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock_quantity: number;
  expires_at: string;
  created_at: string;
}

type MainView = 'dashboard' | 'products' | 'orders' | 'profile' | 'marketplace';
type ProductView = 'list' | 'add-product' | 'add-daily' | 'edit-product' | 'edit-daily';

export function SellerDashboard() {
  const { user, signOut } = useAuth();
  const { canPerformMainAction, refreshStatus } = useVerificationStatus('vendedor');
  const [currentView, setCurrentView] = useState<MainView>('dashboard');
  const [productView, setProductView] = useState<ProductView>('list');
  const [products, setProducts] = useState<Product[]>([]);
  const [dailyProducts, setDailyProducts] = useState<DailyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [lastNotificationTime, setLastNotificationTime] = useState<string>('');
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    type: 'product' | 'order' | 'profile' | 'daily_product';
    message: string;
    timestamp: string;
    color: string;
  }>>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedDailyProduct, setSelectedDailyProduct] = useState<DailyProduct | null>(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);

  // Dashboard stats
  const [stats, setStats] = useState({
    totalProducts: 0,
    dailyProducts: 0,
    totalViews: 0,
    totalSales: 0,
    revenue: 0,
    avgRating: 4.5
  });

  // 🚨 NUEVOS HANDLERS: Notificaciones críticas para vendedores
  const handleStockAlert = (type: string, message: string) => {
    console.log(`🚨 Alerta crítica de stock: ${type} - ${message}`);
    setRecentActivity(prev => [...prev, {
      id: Date.now().toString(),
      message: `⚠️ ${message}`,
      timestamp: new Date().toISOString(),
      type: 'product' as 'profile' | 'order' | 'product' | 'daily_product',
      color: 'red'
    }].slice(0, 10));
  };

  const handleOrderTimeout = (alert: any) => {
    console.log(`⏰ Timeout crítico: Orden ${alert.orderId} - ${alert.timeSinceStatus} min`);
    setRecentActivity(prev => [...prev, {
      id: Date.now().toString(),
      message: `🕒 Orden #${alert.orderId.slice(-6)} lleva ${alert.timeSinceStatus} min en ${alert.status}`,
      timestamp: new Date().toISOString(),
      type: 'order' as 'profile' | 'order' | 'product' | 'daily_product',
      color: 'orange'
    }].slice(0, 10));
  };

  useEffect(() => {
    if (user) {
      loadProducts();
      loadDailyProducts();
      loadStats();
      loadRecentActivity();
      setupOrderNotifications();
    }
  }, [user]);

  // Auto-refresh daily products every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentView === 'dashboard' || currentView === 'products') {
        loadDailyProducts();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [currentView]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Error al cargar productos');
    }
  };

  const loadDailyProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_products')
        .select('*')
        .eq('seller_id', user?.id)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDailyProducts(data || []);
    } catch (error) {
      console.error('Error loading daily products:', error);
      setError('Error al cargar productos del día');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Calculate basic stats from products
      const totalProducts = products.length;
      const dailyProductsCount = dailyProducts.length;
      
      // Initialize stats with defaults
      let totalSales = 0;
      let revenue = 0;
      let avgRating = 4.5;
      
      try {
        // Test if orders table exists first
        const { data: testData, error: testError } = await supabase
          .from('orders')
          .select('id')
          .limit(1);

        if (!testError) {
          // Get orders statistics - only if table exists
          const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('id, total, status, created_at')
            .eq('seller_id', user?.id);

          if (!ordersError && ordersData) {
            totalSales = ordersData.length;
            revenue = ordersData
              .filter(order => order.status === 'delivered')
              .reduce((sum, order) => sum + (order.total || 0), 0);
            
            console.log(`Loaded ${totalSales} orders, revenue: Q${revenue}`);
          }

          // Try to get business rating
          try {
            const { data: sellerData, error: sellerError } = await supabase
              .from('users')
              .select('business_rating, total_reviews')
              .eq('id', user?.id)
              .single();

            if (!sellerError && sellerData?.business_rating) {
              avgRating = sellerData.business_rating || 4.5;
            }
          } catch (ratingError) {
            console.log('Business rating not available, using default');
          }
        } else {
          console.log('Orders table not available yet, using default stats');
        }
      } catch (error) {
        console.log('Orders system not configured yet, using default stats');
      }
      
      setStats({
        totalProducts,
        dailyProducts: dailyProductsCount,
        totalViews: Math.floor(Math.random() * 1000) + 500, // TODO: Implement real view tracking
        totalSales,
        revenue,
        avgRating
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      // Set default stats on error
      setStats({
        totalProducts: products.length,
        dailyProducts: dailyProducts.length,
        totalViews: 0,
        totalSales: 0,
        revenue: 0,
        avgRating: 4.5
      });
    }
  };

  const handleProductCreated = () => {
    loadProducts();
    loadRecentActivity(); // Refresh activity
    setProductView('list');
  };

  const handleDailyProductCreated = () => {
    loadDailyProducts();
    loadRecentActivity(); // Refresh activity
    setProductView('list');
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductView('edit-product');
  };

  const handleEditDailyProduct = (dailyProduct: DailyProduct) => {
    setSelectedDailyProduct(dailyProduct);
    setProductView('edit-daily');
  };

  const handleProductUpdated = () => {
    loadProducts();
    setSelectedProduct(null);
    setProductView('list');
  };

  const handleDailyProductUpdated = () => {
    loadDailyProducts();
    setSelectedDailyProduct(null);
    setProductView('list');
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      setError('Error al eliminar producto');
    }
  };

  const handleDeleteDailyProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('daily_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      loadDailyProducts();
    } catch (error) {
      console.error('Error deleting daily product:', error);
      setError('Error al eliminar producto del día');
    }
  };

  // Setup real-time notifications for new orders
  const setupOrderNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Subscribe to new orders for this seller
      const ordersSubscription = supabase
        .channel('seller-orders')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `seller_id=eq.${user.id}`
          },
          (payload) => {
            console.log('New order received:', payload);
            setNewOrdersCount(prev => prev + 1);
            
            // Show browser notification if permission granted
            if (Notification.permission === 'granted') {
              new Notification('¡Nueva orden en TRATO!', {
                body: `Tienes un nuevo pedido por Q${payload.new.total}`,
                icon: '/favicon.ico',
                tag: 'new-order'
              });
            }
            
            // Update last notification time
            setLastNotificationTime(new Date().toISOString());
          }
        )
        .subscribe();

      // Request notification permission
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
      }

      return () => {
        ordersSubscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up order notifications:', error);
    }
  }, [user?.id]);

  // Check for new orders periodically
  const checkNewOrders = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Test if orders table exists first
      const { data: testData, error: testError } = await supabase
        .from('orders')
        .select('id')
        .limit(1);

      if (!testError) {
        // Only check if we have a baseline time
        if (lastNotificationTime) {
          const { data, error } = await supabase
            .from('orders')
            .select('id, total, created_at, status')
            .eq('seller_id', user.id)
            .gt('created_at', lastNotificationTime)
            .order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            setNewOrdersCount(prev => prev + data.length);
            console.log(`Found ${data.length} new orders since ${lastNotificationTime}`);
          }
        } else {
          // First time - set baseline and check for pending orders
          const { data, error } = await supabase
            .from('orders')
            .select('id, total, created_at, status')
            .eq('seller_id', user.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            setNewOrdersCount(data.length);
            setLastNotificationTime(new Date().toISOString());
            console.log(`Found ${data.length} pending orders`);
          }
        }
      }
    } catch (error) {
      console.log('Orders table not available for notifications');
    }
  }, [user?.id, lastNotificationTime]);

  // Check for new orders every 30 seconds
  useEffect(() => {
    const interval = setInterval(checkNewOrders, 30000);
    return () => clearInterval(interval);
  }, [checkNewOrders]);

  // Load recent activity
  const loadRecentActivity = async () => {
    try {
      const activities = [];
      
      // Get recent products
      if (products.length > 0) {
        const recentProduct = products[0];
        activities.push({
          id: `product-${recentProduct.id}`,
          type: 'product' as const,
          message: `Producto agregado: "${recentProduct.name}"`,
          timestamp: recentProduct.created_at,
          color: 'green'
        });
      }
      
      // Get recent daily products
      if (dailyProducts.length > 0) {
        const recentDaily = dailyProducts[0];
        activities.push({
          id: `daily-${recentDaily.id}`,
          type: 'daily_product' as const,
          message: `Venta del día creada: "${recentDaily.name}"`,
          timestamp: recentDaily.created_at,
          color: 'orange'
        });
      }
      
      try {
        // Test if orders table exists first
        const { data: testData, error: testError } = await supabase
          .from('orders')
          .select('id')
          .limit(1);

        if (!testError) {
          // Try to get recent orders - only if table exists
          const { data: ordersData, error } = await supabase
            .from('orders')
            .select('id, status, created_at, total')
            .eq('seller_id', user?.id)
            .order('created_at', { ascending: false })
            .limit(3);

          if (!error && ordersData && ordersData.length > 0) {
            ordersData.forEach(order => {
              let message = '';
              let color = 'blue';
              
              switch (order.status) {
                case 'pending':
                  message = `Nueva orden recibida (Q${order.total})`;
                  color = 'yellow';
                  break;
                case 'confirmed':
                  message = `Orden confirmada (Q${order.total})`;
                  color = 'blue';
                  break;
                case 'preparing':
                  message = `Orden en preparación (Q${order.total})`;
                  color = 'orange';
                  break;
                case 'ready':
                  message = `Orden lista (Q${order.total})`;
                  color = 'purple';
                  break;
                case 'delivered':
                  message = `Orden entregada (Q${order.total})`;
                  color = 'green';
                  break;
                case 'cancelled':
                  message = `Orden cancelada (Q${order.total})`;
                  color = 'red';
                  break;
                default:
                  message = `Orden ${order.status} (Q${order.total})`;
                  color = 'blue';
              }
              
              activities.push({
                id: `order-${order.id}`,
                type: 'order' as const,
                message,
                timestamp: order.created_at,
                color
              });
            });
          }
        }
      } catch (error) {
        console.log('Orders table not available for activity');
      }
      
      // Sort by timestamp and take the 5 most recent
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);
      
      setRecentActivity(sortedActivities);
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date().getTime();
    const time = new Date(timestamp).getTime();
    const diff = now - time;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) {
      return minutes <= 1 ? 'Hace un momento' : `Hace ${minutes} minutos`;
    } else if (hours < 24) {
      return hours === 1 ? 'Hace 1 hora' : `Hace ${hours} horas`;
    } else if (days === 1) {
      return 'Ayer';
    } else {
      return `Hace ${days} días`;
    }
  };

  const getTimeUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(23, 59, 59, 999);
    const diff = midnight.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Navigation items
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: Home,
      description: 'Resumen y estadísticas'
    },
    {
      id: 'products',
      label: 'Productos',
      icon: ShoppingBag,
      description: 'Gestiona tu menú'
    },
    {
      id: 'orders',
      label: 'Pedidos',
      icon: ClipboardList,
      description: 'Órdenes y analytics',
      hasNotification: newOrdersCount > 0,
      notificationCount: newOrdersCount
    },
    {
      id: 'profile',
      label: 'Perfil',
      icon: User,
      description: 'Configuración del negocio'
    },
    {
      id: 'marketplace',
      label: 'Comprar',
      icon: ShoppingCart,
      description: 'Compra de otros comercios'
    }
  ];

  // Render Dashboard Overview
  const renderDashboard = () => (
    <div className="space-y-4 md:space-y-6">
      {/* Welcome Section - Mobile Optimized */}
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dashboard-welcome" style={{
        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
        color: 'white',
        padding: '24px',
        borderRadius: '16px',
        marginBottom: '16px'
      }}>
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-2 md:p-3 rounded-xl">
              <Store className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg md:text-2xl text-white leading-tight" style={{ color: 'white', fontSize: '20px' }}>
                ¡Bienvenido, Interlano Fernando Interiano! 👋
              </CardTitle>
              <p className="text-sm md:text-base text-white mt-1" style={{ color: 'white', fontSize: '16px' }}>
                Gestiona tu negocio y conecta con más clientes en Gualán
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats - Mobile Grid */}
      <div className="dashboard-stats" style={{
        display: 'grid',
        gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <Card className="stat-card" style={{
          background: 'white',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          border: '1px solid #e5e7eb'
        }}>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label" style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Productos</p>
                <p className="stat-number" style={{ fontSize: '24px', fontWeight: 'bold', color: '#f97316', marginBottom: '8px' }}>{stats.totalProducts}</p>
              </div>
              <Package className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card" style={{
          background: 'white',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          border: '1px solid #e5e7eb'
        }}>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label" style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Ventas del Día</p>
                <p className="stat-number" style={{ fontSize: '24px', fontWeight: 'bold', color: '#f97316', marginBottom: '8px' }}>{stats.dailyProducts}</p>
              </div>
              <Clock className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card" style={{
          background: 'white',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          border: '1px solid #e5e7eb'
        }}>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label" style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Ventas Totales</p>
                <p className="stat-number" style={{ fontSize: '24px', fontWeight: 'bold', color: '#f97316', marginBottom: '8px' }}>{stats.totalSales}</p>
              </div>
              <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card" style={{
          background: 'white',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          border: '1px solid #e5e7eb'
        }}>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label" style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Calificación</p>
                <p className="stat-number" style={{ fontSize: '24px', fontWeight: 'bold', color: '#f97316', marginBottom: '8px' }}>{stats.avgRating.toFixed(1)}</p>
              </div>
              <Star className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue and Performance - Stack on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Ingresos del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 mb-2">
              Q{stats.revenue.toLocaleString()}
            </div>
            <p className="text-sm text-gray-600">
              +12% comparado al mes pasado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Vistas del Perfil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {stats.totalViews.toLocaleString()}
            </div>
            <p className="text-sm text-gray-600">
              Vistas esta semana
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={() => {
                if (!canPerformMainAction()) {
                  setShowVerificationDialog(true);
                  return;
                }
                setCurrentView('products');
                setProductView('add-product');
              }}
              className="h-20 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              <div className="text-center">
                <Plus className="w-6 h-6 mx-auto mb-1" />
                <span className="text-sm">Nuevo Producto</span>
              </div>
            </Button>

            <Button 
              onClick={() => {
                if (!canPerformMainAction()) {
                  setShowVerificationDialog(true);
                  return;
                }
                setCurrentView('products');
                setProductView('add-daily');
              }}
              variant="outline"
              className="h-20 border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              <div className="text-center">
                <Clock className="w-6 h-6 mx-auto mb-1" />
                <span className="text-sm">Venta del Día</span>
              </div>
            </Button>

            <Button 
              onClick={() => setCurrentView('profile')}
              variant="outline"
              className="h-20 border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              <div className="text-center">
                <Store className="w-6 h-6 mx-auto mb-1" />
                <span className="text-sm">Editar Perfil</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No hay actividad reciente</p>
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className={`flex items-center gap-3 p-3 bg-${activity.color}-50 rounded-lg`}>
                  <div className={`w-2 h-2 bg-${activity.color}-500 rounded-full`}></div>
                  <p className="text-sm flex-1">{activity.message}</p>
                  <span className="text-xs text-gray-500">{getRelativeTime(activity.timestamp)}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render Products Section
  const renderProducts = () => {
    // Handle product form views
    if (productView === 'add-product') {
      return (
        <ProductForm
          onSuccess={handleProductCreated}
          onCancel={() => setProductView('list')}
        />
      );
    }

    if (productView === 'add-daily') {
      return (
        <DailyProductForm
          onSuccess={handleDailyProductCreated}
          onCancel={() => setProductView('list')}
        />
      );
    }

    if (productView === 'edit-product' && selectedProduct) {
      return (
        <ProductForm
          product={selectedProduct}
          onSuccess={handleProductUpdated}
          onCancel={() => {
            setSelectedProduct(null);
            setProductView('list');
          }}
        />
      );
    }

    if (productView === 'edit-daily' && selectedDailyProduct) {
      return (
        <DailyProductForm
          dailyProduct={selectedDailyProduct}
          onSuccess={handleDailyProductUpdated}
          onCancel={() => {
            setSelectedDailyProduct(null);
            setProductView('list');
          }}
        />
      );
    }

    // Products list view
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="text-center md:text-left">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
              Gestión de Productos
            </h2>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              Administra tu menú y ofertas especiales
            </p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <Button 
              onClick={() => setProductView('add-product')}
              className="bg-gradient-to-r from-green-500 to-green-600 w-full md:w-auto"
              style={{
                minHeight: '44px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Producto
            </Button>
            <Button 
              onClick={() => setProductView('add-daily')}
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50 w-full md:w-auto"
              style={{
                minHeight: '44px',
                fontSize: '14px',
                fontWeight: '600',
                borderWidth: '2px'
              }}
            >
              <Clock className="w-4 h-4 mr-2" />
              Venta del Día
            </Button>
          </div>
        </div>

        {/* Products Tabs */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-gray-100 rounded-lg">
            <TabsTrigger 
              value="products" 
              className="flex items-center justify-center gap-2 py-3 px-2 text-sm font-medium transition-all"
              style={{
                minHeight: '44px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              <Package className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Productos Normales</span>
              <span className="sm:hidden">Normales</span>
              <span className="ml-1">({products.length})</span>
            </TabsTrigger>
            <TabsTrigger 
              value="daily" 
              className="flex items-center justify-center gap-2 py-3 px-2 text-sm font-medium transition-all"
              style={{
                minHeight: '44px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Productos del Día</span>
              <span className="sm:hidden">Del Día</span>
              <span className="ml-1">({dailyProducts.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : products.length === 0 ? (
              <Card style={{backgroundColor: 'white', border: '1px solid #e5e7eb'}}>
                <CardContent className="p-8 md:p-12 text-center">
                  <Package className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No tienes productos aún
                  </h3>
                  <p className="text-sm md:text-base text-gray-600 mb-6">
                    Comienza agregando tu primer producto para empezar a vender
                  </p>
                  <Button 
                    onClick={() => setProductView('add-product')}
                    className="bg-gradient-to-r from-green-500 to-green-600 w-full md:w-auto"
                    style={{
                      minHeight: '44px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Primer Producto
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="daily" className="space-y-4">
            {dailyProducts.length > 0 && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    <span className="font-medium text-orange-800 text-sm sm:text-base">
                      Tiempo restante:
                    </span>
                  </div>
                  <span className="font-bold text-orange-800 text-sm sm:text-base">
                    {getTimeUntilMidnight()}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-orange-700">
                  Los productos del día se eliminan automáticamente a las 23:59:59
                </p>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : dailyProducts.length === 0 ? (
              <Card style={{backgroundColor: 'white', border: '1px solid #e5e7eb'}}>
                <CardContent className="p-8 md:p-12 text-center">
                  <Clock className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No tienes productos del día
                  </h3>
                  <p className="text-sm md:text-base text-gray-600 mb-6">
                    Crea ofertas especiales que duran solo hasta medianoche
                  </p>
                  <Button 
                    onClick={() => setProductView('add-daily')}
                    variant="outline"
                    className="border-orange-500 text-orange-600 hover:bg-orange-50 w-full md:w-auto"
                    style={{
                      minHeight: '44px',
                      fontSize: '14px',
                      fontWeight: '600',
                      borderWidth: '2px'
                    }}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Crear Venta del Día
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {dailyProducts.map((dailyProduct) => (
                  <DailyProductCard
                    key={dailyProduct.id}
                    dailyProduct={dailyProduct}
                    onEdit={handleEditDailyProduct}
                    onDelete={handleDeleteDailyProduct}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-green-50">
      {/* Sistema de Notificaciones CRÍTICO para Vendedores */}
      <NotificationSystem 
        showBanner={true}
        enableAutoActivation={true}  // Auto-activar para vendedores (CRÍTICO)
        showTester={process.env.NODE_ENV === 'development'}
      />
      
      {/* 🚨 NOTIFICACIONES CRÍTICAS PARA VENDEDORES */}
      <CriticalNotifications onNotification={handleStockAlert} />
      <TimeoutAlerts onAlert={handleOrderTimeout} />
      
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30 mb-2">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-2 rounded-lg">
                <Store className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  TRATO Vendedor
                </h1>
                <p className="text-xs md:text-sm text-gray-600 hidden sm:block">Panel de control empresarial</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={signOut} 
              className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-4 py-2 min-h-[44px]"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
              <span className="sm:hidden">Salir</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content with bottom padding for mobile nav */}
      <div className="main-content container mx-auto px-4 py-4 md:py-6" style={{
        paddingBottom: window.innerWidth <= 768 ? '80px' : '24px'
      }}>
        {error && (
          <Alert variant="destructive" className="mb-4 md:mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm md:text-base">{error}</AlertDescription>
          </Alert>
        )}

        {/* Verification Alert */}
        <VerificationAlert 
          userRole="vendedor"
          onOpenVerification={() => setShowVerificationDialog(true)}
        />

        {/* Notification Permission Banner */}
        <div className="mb-4 md:mb-6">
          <NotificationPermissionBanner />
        </div>

        {/* Mobile Navigation */}
        <div className="block md:hidden">
          <div className="mobile-bottom-nav" style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'white',
            borderTop: '2px solid #e5e7eb',
            padding: '12px',
            zIndex: 50,
            boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div className="grid grid-cols-5 gap-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id as MainView);
                      if (item.id === 'orders') {
                        setNewOrdersCount(0);
                      }
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '8px',
                      borderRadius: '8px',
                      minHeight: '60px',
                      fontSize: '10px',
                      fontWeight: '500',
                      backgroundColor: isActive ? '#fef3c7' : 'transparent',
                      color: isActive ? '#f97316' : '#6b7280',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div className="relative">
                      <Icon className="w-5 h-5" />
                      {item.hasNotification && item.notificationCount && item.notificationCount > 0 && (
                        <span style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          background: '#ef4444',
                          color: 'white',
                          fontSize: '10px',
                          borderRadius: '50%',
                          width: '16px',
                          height: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          animation: 'pulse 2s infinite'
                        }}>
                          {item.notificationCount > 9 ? '9+' : item.notificationCount}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: '500', lineHeight: '1.2' }}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:block">
          <Tabs value={currentView} onValueChange={(value: string) => setCurrentView(value as MainView)} className="space-y-6">
            <TabsList className="grid w-full grid-cols-6 lg:w-2/3 mx-auto bg-white border border-gray-200">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <TabsTrigger 
                    key={item.id} 
                    value={item.id}
                    className="flex flex-col items-center gap-1 p-4 data-[state=active]:bg-green-100 data-[state=active]:text-green-700 relative"
                    onClick={() => {
                      if (item.id === 'orders') {
                        setNewOrdersCount(0);
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

            {/* Desktop Content */}
            <TabsContent value="dashboard" className="space-y-6">
              {renderDashboard()}
            </TabsContent>

            <TabsContent value="products" className="space-y-6">
              {renderProducts()}
            </TabsContent>

            <TabsContent value="orders" className="space-y-6">
              <SellerOrderManagement />
            </TabsContent>

            <TabsContent value="profile" className="space-y-6">
              <SellerBusinessProfile />
            </TabsContent>

            <TabsContent value="marketplace" className="space-y-6">
              <SellerMarketplace />
            </TabsContent>
          </Tabs>
        </div>

        {/* Mobile Content */}
        <div className="block md:hidden mt-4">
          {currentView === 'dashboard' && renderDashboard()}
          {currentView === 'products' && renderProducts()}
          {currentView === 'orders' && <SellerOrderManagement />}
          {currentView === 'profile' && <SellerBusinessProfile />}
          {currentView === 'marketplace' && <SellerMarketplace />}
        </div>
      </div>

      {/* Location Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-green-500" />
              <span>Verificación de Perfil y Ubicación</span>
            </DialogTitle>
          </DialogHeader>
          <LocationVerification 
            userRole="vendedor"
            onVerificationComplete={() => {
              setShowVerificationDialog(false);
              refreshStatus();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Indicador de repartidores online */}
      <OnlineDriversIndicator />

      {/* Mobile Toast Notifications */}
      <MobileToastNotifications 
        onNewOrder={() => {
          // Refresh orders when new order comes in
          if (currentView === 'orders') {
            window.location.reload(); // Simple refresh for now
          }
        }}
      />
    </div>
  );
}