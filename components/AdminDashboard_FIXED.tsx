import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { 
  Users, 
  Store, 
  Truck, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign, 
  Star, 
  MapPin, 
  Settings, 
  BarChart3, 
  Package, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  Shield, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Activity,
  Crown,
  Bell,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';
import { TRATO_COLORS, TRATO_GRADIENTS } from '../constants/colors';
import { AdminRealtimeMonitor } from './AdminRealtimeMonitor';

// Types
interface AdminUser {
  id: string;
  email: string;
  role: string;
  name: string;
  phone: string;
  created_at: string;
  status: 'active' | 'inactive' | 'suspended';
  last_login?: string;
}

interface BusinessStats {
  total_businesses: number;
  active_businesses: number;
  pending_approval: number;
  total_products: number;
  total_orders: number;
  total_revenue: number;
}

interface OrderStats {
  today_orders: number;
  pending_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  average_order_value: number;
  total_revenue_today: number;
}

// Local types for admin views
type SellerBusiness = {
  id: string;
  business_name?: string;
  business_description?: string;
  business_category?: string;
  is_verified: boolean;
  created_at: string;
  users?: { name?: string; email?: string; phone?: string };
};

type AdminOrder = {
  id: string;
  delivery_type?: string;
  buyer?: { name?: string; email?: string };
  seller?: { name?: string; email?: string };
  status: string;
  total?: number;
  total_amount?: number;
  created_at: string;
};

type AdminProduct = {
  id: string;
  name?: string;
  description?: string;
  image_url?: string;
  price?: number;
  category?: string;
  status?: string;
  seller?: { business_name?: string; users?: { email?: string } };
};

type AdminDriver = {
  id: string;
  users?: { name?: string; email?: string; phone?: string };
  vehicle_type?: string;
  license_number?: string;
  is_verified?: boolean;
  is_active?: boolean;
  created_at: string;
};

// Quick Stats Card Component
function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color,
  subtitle 
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  color: string;
  subtitle?: string;
}) {
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: color }}
          >
            <Icon className="w-8 h-8 text-white" />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600 font-medium">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simple Users Management Component
function UsersManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, phone, status, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Usuarios</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">{user.name || 'Sin nombre'}</h3>
                <p className="text-sm text-gray-500">{user.email}</p>
                <Badge variant="outline">{user.role}</Badge>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">Ver</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Simple System Settings Component
function SystemSettings() {
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);

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

  useEffect(() => {
    fetchDrivers();
  }, []);

  return (
    <div className="space-y-6">
      {/* Drivers Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Truck className="w-5 h-5 text-orange-500" />
            <span>Gestión de Repartidores</span>
            <Badge variant="secondary" className="ml-2">
              {drivers.filter(d => d.is_active).length} activos
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                          <Badge variant="destructive" className="text-xs">
                            Pendiente
                          </Badge>
                        )}
                        {driver.is_verified && !driver.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            Verificado
                          </Badge>
                        )}
                        {driver.is_verified && driver.is_active && (
                          <Badge variant="default" className="text-xs bg-green-500">
                            Activo
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{driver.users?.email}</p>
                      <p className="text-sm text-gray-500">{driver.users?.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={driver.is_verified ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleDriverStatusChange(driver.id, 'is_verified', !driver.is_verified)}
                    >
                      {driver.is_verified ? 'Verificado' : 'Verificar'}
                    </Button>
                    <Button
                      variant={driver.is_active ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleDriverStatusChange(driver.id, 'is_active', !driver.is_active)}
                      disabled={!driver.is_verified}
                    >
                      {driver.is_active ? 'Activo' : 'Activar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminDashboard() {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalBusinesses: 0,
    totalOrders: 0,
    todayRevenue: 0,
    totalDrivers: 0,
    activeDrivers: 0,
    pendingDrivers: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const today = new Date().toISOString().split('T')[0];

      // Run light-weight count queries in parallel to reduce TTFB
      const [
        totalUsersRes,
        activeUsersRes,
        totalBusinessesRes,
        totalOrdersTodayRes,
        deliveredTodayRes,
        totalDriversRes,
        activeDriversRes,
        pendingDriversRes
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('sellers').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', today),
        supabase
          .from('orders')
          .select('total,status,created_at')
          .gte('created_at', today)
          .eq('status', 'delivered'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'repartidor'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'repartidor').eq('is_active', true),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'repartidor').eq('is_verified', false)
      ]);

      const totalUsers = totalUsersRes.count ?? 0;
      const activeUsers = activeUsersRes.count ?? 0;
      const totalBusinesses = totalBusinessesRes.count ?? 0;
      const totalOrdersToday = totalOrdersTodayRes.count ?? 0;
      const todayRevenue = (deliveredTodayRes.data || []).reduce(
        (sum: number, o: any) => sum + (o.total || 0),
        0
      );
      const totalDrivers = totalDriversRes.count ?? 0;
      const activeDrivers = activeDriversRes.count ?? 0;
      const pendingDrivers = pendingDriversRes.count ?? 0;

      setStats(prev => ({
        ...prev,
        totalUsers,
        activeUsers,
        totalBusinesses,
        totalOrders: totalOrdersToday,
        todayRevenue,
        totalDrivers,
        activeDrivers,
        pendingDrivers
      }));

    } catch (error) {
      console.error('Error fetching admin stats:', error);
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Sesión cerrada');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: TRATO_GRADIENTS.primary }}
              >
                <Crown className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-green-600 bg-clip-text text-transparent">
                  TRATO Admin
                </h1>
                <p className="text-sm text-gray-600">Panel de Administración</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                <Shield className="w-3 h-3 mr-1" />
                Administrador
              </Badge>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'Administrador'}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatsCard
            title="Total Usuarios"
            value={loading ? "..." : stats.totalUsers}
            icon={Users}
            color={TRATO_COLORS.orange[500]}
            trend="+12% esta semana"
            subtitle={`${stats.activeUsers} activos`}
          />
          <StatsCard
            title="Negocios"
            value={loading ? "..." : stats.totalBusinesses}
            icon={Store}
            color={TRATO_COLORS.green[500]}
            trend="+5% este mes"
          />
          <StatsCard
            title="Repartidores"
            value={loading ? "..." : stats.totalDrivers}
            icon={Truck}
            color={TRATO_COLORS.orange[400]}
            trend={stats.pendingDrivers > 0 ? `${stats.pendingDrivers} pendientes` : "Todos verificados"}
            subtitle={`${stats.activeDrivers} activos`}
          />
          <StatsCard
            title="Órdenes Hoy"
            value={loading ? "..." : stats.totalOrders}
            icon={ShoppingCart}
            color={TRATO_COLORS.orange[600]}
            trend="+18% vs ayer"
          />
          <StatsCard
            title="Ingresos Hoy"
            value={loading ? "..." : `Q${stats.todayRevenue.toFixed(2)}`}
            icon={DollarSign}
            color={TRATO_COLORS.green[600]}
            trend="+25% vs ayer"
          />
        </div>

        {/* Quick Actions Panel */}
        <Card className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Crown className="w-5 h-5 text-purple-600" />
              <span>Control Operacional TRATO</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button
                className="h-20 flex-col space-y-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                onClick={async () => {
                  try {
                    const { data, error } = await supabase
                      .from('users')
                      .update({ 
                        is_verified: true, 
                        is_active: true,
                        updated_at: new Date().toISOString()
                      })
                      .eq('role', 'repartidor')
                      .eq('is_verified', false);

                    if (error) throw error;
                    
                    toast.success('Todos los repartidores han sido activados');
                    fetchStats();
                  } catch (error) {
                    console.error('Error:', error);
                    toast.error('Error al activar repartidores');
                  }
                }}
              >
                <CheckCircle className="w-6 h-6" />
                <span className="text-sm font-medium">Activar Repartidores</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex-col space-y-2 border-2 border-orange-300 hover:bg-orange-50"
                onClick={async () => {
                  try {
                    await fetchStats();
                    toast.success('Estadísticas actualizadas');
                  } catch (error) {
                    console.error('Error:', error);
                    toast.error('Error al actualizar');
                  }
                }}
              >
                <RefreshCw className="w-6 h-6 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">Actualizar Sistema</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex-col space-y-2 border-2 border-blue-300 hover:bg-blue-50"
                onClick={() => toast.info('Función de exportación disponible')}
              >
                <Download className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Exportar Datos</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex-col space-y-2 border-2 border-purple-300 hover:bg-purple-50"
                onClick={() => toast.info('Abriendo configuración del sistema...')}
              >
                <Settings className="w-6 h-6 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Configurar Sistema</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="monitor" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
            <TabsTrigger value="monitor" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Monitor</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Usuarios</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Configuración</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monitor">
            <AdminRealtimeMonitor />
          </TabsContent>

          <TabsContent value="users">
            <UsersManagement />
          </TabsContent>

          <TabsContent value="settings">
            <SystemSettings />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              © 2025 TRATO - Panel de Administración
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Gualán, Guatemala</span>
              <span>•</span>
              <span>Sistema Administrativo</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
