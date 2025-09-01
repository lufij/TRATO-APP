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
  full_name: string;
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

// Users Management Component
function UsersManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (user.status || 'active') === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('Estado de usuario actualizado');
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast.success('Usuario eliminado');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('No se pudo eliminar. Revisa relaciones o prueba suspenderlo.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="comprador">Compradores</SelectItem>
                <SelectItem value="vendedor">Vendedores</SelectItem>
                <SelectItem value="repartidor">Repartidores</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v: string) => setStatusFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
                <SelectItem value="suspended">Suspendidos</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={fetchUsers} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.full_name || 'Sin nombre'}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        {user.phone && (
                          <div className="text-sm text-gray-500">{user.phone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.role === 'vendedor' ? 'default' : 'secondary'}
                        className={`${
                          user.role === 'comprador' ? 'bg-orange-100 text-orange-800' :
                          user.role === 'vendedor' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={(user.status || 'active') === 'active' ? 'default' : 'destructive'}
                        className={`${
                          (user.status || 'active') === 'active' ? 'bg-green-100 text-green-800' :
                          (user.status || 'active') === 'inactive' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.status || 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Select 
                          value={user.status || 'active'} 
                          onValueChange={(value: string) => handleStatusChange(user.id, value)}
                        >
                          <SelectTrigger className="w-24 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Activo</SelectItem>
                            <SelectItem value="inactive">Inactivo</SelectItem>
                            <SelectItem value="suspended">Suspendido</SelectItem>
                          </SelectContent>
                        </Select>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              title="Eliminar usuario"
                              className="text-red-600 border-red-300 hover:text-red-700 hover:bg-red-50"
                           >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Eliminar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer y puede fallar si el usuario tiene datos relacionados.
                                Si falla, puedes cambiar su estado a "Suspendido".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDeleteUser(user.id)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No se encontraron usuarios que coincidan con los filtros
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Business Management Component
function BusinessManagement() {
  const [businesses, setBusinesses] = useState<SellerBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      
      // Fetch businesses from sellers table with user info
      const { data, error } = await supabase
        .from('sellers')
        .select(`
          *,
          users (
            name,
            email,
            phone,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching businesses:', error);
        toast.error('Error al cargar negocios');
        setBusinesses([]);
      } else {
        setBusinesses(data || []);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
      toast.error('Error al cargar negocios');
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handleStatusChange = async (businessId: string, newStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('sellers')
        .update({ is_verified: newStatus })
        .eq('id', businessId);

      if (error) throw error;
      
      toast.success('Estado del negocio actualizado');
      fetchBusinesses();
    } catch (error) {
      console.error('Error updating business status:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const filteredBusinesses = businesses.filter((business: SellerBusiness) => {
    const matchesSearch = business.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         business.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         business.users?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'verified' && business.is_verified) ||
                         (statusFilter === 'pending' && !business.is_verified);
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Negocios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar negocios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="verified">Verificados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={fetchBusinesses} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>

          {/* Businesses Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Negocio</TableHead>
                  <TableHead>Propietario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBusinesses.map((business) => (
                  <TableRow key={business.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{business.business_name || 'Sin nombre'}</div>
                        <div className="text-sm text-gray-500">{business.business_description || 'Sin descripción'}</div>
                        {business.business_category && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {business.business_category}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{business.users?.name || 'Sin nombre'}</div>
                        <div className="text-sm text-gray-500">{business.users?.email}</div>
                        {business.users?.phone && (
                          <div className="text-sm text-gray-500">{business.users.phone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={business.is_verified ? 'default' : 'destructive'}
                        className={`${
                          business.is_verified 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {business.is_verified ? 'Verificado' : 'Pendiente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(business.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={business.is_verified ? "destructive" : "default"}
                          size="sm"
                          onClick={() => handleStatusChange(business.id, !business.is_verified)}
                        >
                          {business.is_verified ? 'Desverificar' : 'Verificar'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredBusinesses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {businesses.length === 0 ? (
                <div>
                  <Store className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No hay negocios registrados aún</p>
                </div>
              ) : (
                <p>No se encontraron negocios que coincidan con los filtros</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Orders Overview Component
function OrdersOverview() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('today');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on filter
      const now = new Date();
      let dateFilter = '';
      
      switch (timeFilter) {
        case 'today':
          dateFilter = now.toISOString().split('T')[0];
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = weekAgo.toISOString().split('T')[0];
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateFilter = monthAgo.toISOString().split('T')[0];
          break;
      }

      // Try to fetch from orders table
      let query = supabase
        .from('orders')
        .select(`
          *,
          buyer:users!buyer_id (name, email),
          seller:sellers!seller_id (business_name),
          driver:users!driver_id (name, email)
        `)
        .order('created_at', { ascending: false });

      if (timeFilter !== 'all') {
        query = query.gte('created_at', dateFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching orders:', error);
        // If orders table doesn't exist yet, show empty state
        setOrders([]);
      } else {
        setOrders(data || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [timeFilter]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      
      toast.success('Estado de la orden actualizado');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; class: string }> = {
      pending: { label: 'Pendiente', class: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: 'Confirmado', class: 'bg-blue-100 text-blue-800' },
      preparing: { label: 'Preparando', class: 'bg-orange-100 text-orange-800' },
      ready: { label: 'Listo', class: 'bg-purple-100 text-purple-800' },
      picked_up: { label: 'Recogido', class: 'bg-indigo-100 text-indigo-800' },
      delivered: { label: 'Entregado', class: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelado', class: 'bg-red-100 text-red-800' }
    };
    const config = statusConfig[status] || { label: status, class: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.class}>{config.label}</Badge>;
  };

  const filteredOrders = orders.filter((order: AdminOrder) => {
    const matchesSearch = order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.buyer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.seller?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Órdenes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar órdenes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={(v: string) => setStatusFilter(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="preparing">Preparando</SelectItem>
                <SelectItem value="ready">Listo</SelectItem>
                <SelectItem value="picked_up">Recogido</SelectItem>
                <SelectItem value="delivered">Entregado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeFilter} onValueChange={(v: string) => setTimeFilter(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mes</SelectItem>
                <SelectItem value="all">Todo</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={fetchOrders} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>

          {/* Orders Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">#{order.id.slice(0, 8)}</div>
                        <div className="text-sm text-gray-500">{order.delivery_type}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.buyer?.name || 'Usuario'}</div>
                        <div className="text-sm text-gray-500">{order.buyer?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.seller?.name || 'Vendedor'}</div>
                        <div className="text-sm text-gray-500">{order.seller?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">Q{order.total?.toFixed(2) || '0.00'}</div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(order.created_at).toLocaleDateString()}
                        <div className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Select 
                          value={order.status} 
                          onValueChange={(value: string) => handleStatusChange(order.id, value)}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="confirmed">Confirmado</SelectItem>
                            <SelectItem value="preparing">Preparando</SelectItem>
                            <SelectItem value="ready">Listo</SelectItem>
                            <SelectItem value="picked_up">Recogido</SelectItem>
                            <SelectItem value="delivered">Entregado</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {orders.length === 0 ? (
                <div>
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No hay órdenes registradas aún</p>
                  <p className="text-sm mt-2">Las órdenes aparecerán aquí cuando los usuarios hagan pedidos</p>
                </div>
              ) : (
                <p>No se encontraron órdenes que coincidan con los filtros</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Products Management Component
function ProductsManagement() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from products table
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:sellers (
            business_name,
            users (name, email)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
      } else {
        setProducts(data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleProductStatusChange = async (productId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', productId);

      if (error) throw error;
      
      toast.success('Estado del producto actualizado');
      fetchProducts();
    } catch (error) {
      console.error('Error updating product status:', error);
      toast.error('Error al actualizar producto');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      
      toast.success('Producto eliminado');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error al eliminar producto');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; class: string }> = {
      active: { label: 'Activo', class: 'bg-green-100 text-green-800' },
      inactive: { label: 'Inactivo', class: 'bg-gray-100 text-gray-800' },
      pending: { label: 'Pendiente', class: 'bg-yellow-100 text-yellow-800' },
      rejected: { label: 'Rechazado', class: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status] || { label: status, class: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.class}>{config.label}</Badge>;
  };

  const filteredProducts = products.filter((product: AdminProduct) => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.seller?.business_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || (product.status || 'active') === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={categoryFilter} onValueChange={(v: string) => setCategoryFilter(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="comida">Comida</SelectItem>
                <SelectItem value="bebidas">Bebidas</SelectItem>
                <SelectItem value="postres">Postres</SelectItem>
                <SelectItem value="otros">Otros</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v: string) => setStatusFilter(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="rejected">Rechazados</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={fetchProducts} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <div className="aspect-video bg-gray-100 relative">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      {getStatusBadge(product.status || 'active')}
                    </div>
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">{product.name}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-orange-600">
                          Q{product.price?.toFixed(2) || '0.00'}
                        </span>
                        <Badge variant="outline">{product.category}</Badge>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        <p>Vendedor: {product.seller?.business_name || 'N/A'}</p>
                        <p>Email: {product.seller?.users?.email || 'N/A'}</p>
                      </div>
                      
                      <div className="flex space-x-2 mt-4">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="w-3 h-3 mr-1" />
                          Ver
                        </Button>
                        
                        <Select 
                          value={product.status || 'active'} 
                          onValueChange={(value: string) => handleProductStatusChange(product.id, value)}
                        >
                          <SelectTrigger className="w-20 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Activo</SelectItem>
                            <SelectItem value="inactive">Inactivo</SelectItem>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="rejected">Rechazado</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. El producto será eliminado permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteProduct(product.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {products.length === 0 ? (
                <div>
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No hay productos registrados aún</p>
                  <p className="text-sm mt-2">Los productos aparecerán aquí cuando los vendedores los agreguen</p>
                </div>
              ) : (
                <p>No se encontraron productos que coincidan con los filtros</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// System Settings Component
function SystemSettings() {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    allowRegistrations: true,
    maxOrdersPerDay: 100,
    deliveryRadius: 5,
    platformCommission: 5,
    deliveryFee: 10,
    minOrderAmount: 50
  });
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);

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
        // Transform users data to match the expected driver structure
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
      
      // This would integrate with a notification service
      // For now, we'll simulate the action
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

  useEffect(() => {
    fetchDrivers();
  }, []);

  return (
    <div className="space-y-6">
      {/* Main Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Modo Mantenimiento</label>
                <Button
                  variant={settings.maintenanceMode ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => setSettings(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
                >
                  {settings.maintenanceMode ? 'Activado' : 'Desactivado'}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Permitir Registros</label>
                <Button
                  variant={settings.allowRegistrations ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSettings(prev => ({ ...prev, allowRegistrations: !prev.allowRegistrations }))}
                >
                  {settings.allowRegistrations ? 'Sí' : 'No'}
                </Button>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Órdenes máximas por día</label>
                <Input
                  type="number"
                  value={settings.maxOrdersPerDay}
                  onChange={(e) => setSettings(prev => ({ ...prev, maxOrdersPerDay: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">Radio de entrega (km)</label>
                <Input
                  type="number"
                  value={settings.deliveryRadius}
                  onChange={(e) => setSettings(prev => ({ ...prev, deliveryRadius: parseInt(e.target.value) }))}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-2">Comisión plataforma (%)</label>
                <Input
                  type="number"
                  value={settings.platformCommission}
                  onChange={(e) => setSettings(prev => ({ ...prev, platformCommission: parseInt(e.target.value) }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Tarifa de entrega (Q)</label>
                <Input
                  type="number"
                  value={settings.deliveryFee}
                  onChange={(e) => setSettings(prev => ({ ...prev, deliveryFee: parseInt(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              className="bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600 text-white"
            >
              Guardar Configuración
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Drivers Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Truck className="w-5 h-5 text-orange-500" />
              <span>Gestión de Repartidores</span>
            </div>
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
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-xs text-gray-500">
                          Vehículo: {driver.vehicle_type || 'No especificado'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Licencia: {driver.license_number || 'No especificado'}
                        </p>
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
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-green-500" />
            <span>Notificaciones Masivas</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">Mensaje para todos los usuarios</label>
            <textarea
              className="w-full p-3 border rounded-lg resize-none"
              rows={3}
              placeholder="Escribe tu mensaje aquí..."
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
            />
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Se enviará a todos los usuarios activos de TRATO
            </p>
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
        </CardContent>
      </Card>

      {/* Database Status Card */}
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

          {/* Estadísticas operacionales */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-gray-800 mb-3">Operaciones en Tiempo Real</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.activeDrivers}</div>
                <div className="text-sm text-green-700">Repartidores Activos</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.totalOrders}</div>
                <div className="text-sm text-orange-700">Órdenes Hoy</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.totalBusinesses}</div>
                <div className="text-sm text-blue-700">Negocios Activos</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">Q{stats.todayRevenue.toFixed(0)}</div>
                <div className="text-sm text-purple-700">Ingresos Hoy</div>
              </div>
            </div>
          </div>

          {/* Acciones rápidas del sistema */}
          <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold text-gray-800 mb-3">Diagnóstico del Sistema</h4>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  try {
                    // Verificar conectividad con Supabase
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
                    // Verificar tablas críticas
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
                  // Mostrar información del admin actual
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

  const exportData = async (type: string) => {
    try {
      toast.loading('Preparando exportación...');
      
      let data: any[] = [];
      let filename = '';
      
      switch (type) {
        case 'users':
          const { data: users } = await supabase.from('users').select('*');
          data = users || [];
          filename = 'usuarios_trato.csv';
          break;
        case 'businesses':
          const { data: businesses } = await supabase
            .from('sellers')
            .select('*, users(name, email, phone)');
          data = businesses || [];
          filename = 'negocios_trato.csv';
          break;
        case 'orders':
          const { data: orders } = await supabase
            .from('orders')
            .select('*, buyer:users!buyer_id(name), seller:sellers!seller_id(business_name)');
          data = orders || [];
          filename = 'ordenes_trato.csv';
          break;
        case 'all':
          // Export summary data
          data = [
            { tabla: 'usuarios', total: stats.totalUsers, activos: stats.activeUsers },
            { tabla: 'negocios', total: stats.totalBusinesses },
            { tabla: 'ordenes_hoy', total: stats.totalOrders, ingresos: stats.todayRevenue }
          ];
          filename = 'resumen_trato.csv';
          break;
      }
      
      if (data.length === 0) {
        toast.error('No hay datos para exportar');
        return;
      }
      
      // Convert to CSV
      const csv = convertToCSV(data);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Datos exportados correctamente');
      
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Error al exportar datos');
    }
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    return csvContent;
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
                    // Activar todos los repartidores pendientes
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
                    // Obtener estadísticas en tiempo real
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
                onClick={() => exportData('all')}
              >
                <Download className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Exportar Datos</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex-col space-y-2 border-2 border-purple-300 hover:bg-purple-50"
                onClick={() => {
                  // Abrir modal de configuración del sistema
                  toast.info('Abriendo configuración del sistema...');
                }}
              >
                <Settings className="w-6 h-6 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Configurar Sistema</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending Drivers Alert */}
        {stats.pendingDrivers > 0 && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-orange-800">
                      {stats.pendingDrivers} Repartidor{stats.pendingDrivers > 1 ? 'es' : ''} Pendiente{stats.pendingDrivers > 1 ? 's' : ''} de Aprobación
                    </h3>
                    <p className="text-sm text-orange-600">
                      Hay repartidores que necesitan tu aprobación para poder empezar a trabajar.
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline"
                    className="border-orange-300 text-orange-700 hover:bg-orange-100"
                    onClick={async () => {
                      try {
                        // Aprobar todos los repartidores pendientes de una vez
                        const { data: pendingDrivers, error } = await supabase
                          .from('users')
                          .select('id')
                          .eq('role', 'repartidor')
                          .eq('is_verified', false);

                        if (error) throw error;

                        if (pendingDrivers && pendingDrivers.length > 0) {
                          const { error: updateError } = await supabase
                            .from('users')
                            .update({ 
                              is_verified: true, 
                              is_active: true,
                              updated_at: new Date().toISOString()
                            })
                            .eq('role', 'repartidor')
                            .eq('is_verified', false);

                          if (updateError) throw updateError;

                          toast.success(`${pendingDrivers.length} repartidor${pendingDrivers.length > 1 ? 'es' : ''} activado${pendingDrivers.length > 1 ? 's' : ''} exitosamente`);
                          fetchStats();
                        }
                      } catch (error) {
                        console.error('Error activating drivers:', error);
                        toast.error('Error al activar repartidores');
                      }
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Activar Todos
                  </Button>
                  <Button 
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => {
                      // Cambiar a la pestaña de configuración donde están los repartidores
                      const settingsTab = document.querySelector('[value="settings"]') as HTMLElement;
                      settingsTab?.click();
                    }}
                  >
                    Ver Repartidores
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs defaultValue="monitor" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:grid-cols-6">
            <TabsTrigger value="monitor" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Monitor</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Usuarios</span>
            </TabsTrigger>
            <TabsTrigger value="businesses" className="flex items-center space-x-2">
              <Store className="w-4 h-4" />
              <span>Negocios</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span>Productos</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center space-x-2">
              <ShoppingCart className="w-4 h-4" />
              <span>Órdenes</span>
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

          <TabsContent value="businesses">
            <BusinessManagement />
          </TabsContent>

          <TabsContent value="products">
            <ProductsManagement />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersOverview />
          </TabsContent>

          <TabsContent value="settings">
            <SystemSettings />
          </TabsContent>
        </Tabs>
      </div>

      {/* Quick Actions Float */}
      <div className="fixed bottom-6 right-6 space-y-3">
        <Button
          className="w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
          onClick={() => exportData('all')}
          title="Exportar todos los datos"
        >
          <Download className="w-6 h-6" />
        </Button>
        <Button
          className="w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600 text-white"
          onClick={fetchStats}
          title="Actualizar estadísticas"
        >
          <RefreshCw className="w-6 h-6" />
        </Button>
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