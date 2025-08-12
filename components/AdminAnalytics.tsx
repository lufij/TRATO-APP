import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Store, 
  ShoppingCart, 
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  Activity,
  MapPin,
  Clock,
  Star,
  Package
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { TRATO_COLORS } from '../constants/colors';

interface AnalyticsData {
  userGrowth: {
    period: string;
    compradores: number;
    vendedores: number;
    repartidores: number;
  }[];
  topBusinesses: {
    id: string;
    name: string;
    orders: number;
    revenue: number;
    rating: number;
  }[];
  orderTrends: {
    date: string;
    orders: number;
    revenue: number;
  }[];
  locationStats: {
    zone: string;
    users: number;
    orders: number;
  }[];
}

// Metric Card Component
function MetricCard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  color 
}: {
  title: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  color: string;
}) {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case 'positive': return TrendingUp;
      case 'negative': return TrendingDown;
      default: return Activity;
    }
  };

  const ChangeIcon = getChangeIcon();

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: color }}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className={`flex items-center space-x-1 ${getChangeColor()}`}>
            <ChangeIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{change}</span>
          </div>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
          <p className="text-sm text-gray-600">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Growth Chart Component
function GrowthChart({ data }: { data: AnalyticsData['userGrowth'] }) {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No hay datos de crecimiento disponibles</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.flatMap(d => [d.compradores, d.vendedores, d.repartidores]));

  return (
    <div className="space-y-4">
      {data.map((period, index) => (
        <div key={index} className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">{period.period}</span>
            <span className="text-sm text-gray-500">
              Total: {period.compradores + period.vendedores + period.repartidores}
            </span>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <span className="text-xs w-20 text-orange-600">Compradores</span>
              <div className="flex-1 bg-orange-100 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(period.compradores / maxValue) * 100}%` }}
                />
              </div>
              <span className="text-xs w-8 text-gray-600">{period.compradores}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-xs w-20 text-green-600">Vendedores</span>
              <div className="flex-1 bg-green-100 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(period.vendedores / maxValue) * 100}%` }}
                />
              </div>
              <span className="text-xs w-8 text-gray-600">{period.vendedores}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-xs w-20 text-blue-600">Repartidores</span>
              <div className="flex-1 bg-blue-100 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(period.repartidores / maxValue) * 100}%` }}
                />
              </div>
              <span className="text-xs w-8 text-gray-600">{period.repartidores}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Top Businesses Component
function TopBusinesses({ businesses }: { businesses: AnalyticsData['topBusinesses'] }) {
  if (!businesses.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Store className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>No hay datos de negocios disponibles</p>
        <p className="text-sm mt-2">Los datos aparecerán cuando se configuren las tablas de negocios</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {businesses.map((business, index) => (
        <div key={business.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-8 h-8 bg-orange-500 text-white rounded-full text-sm font-bold">
              {index + 1}
            </div>
            <div>
              <p className="font-medium text-gray-900">{business.name}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <ShoppingCart className="w-3 h-3 mr-1" />
                  {business.orders} órdenes
                </span>
                <span className="flex items-center">
                  <Star className="w-3 h-3 mr-1" />
                  {business.rating.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-green-600">Q{business.revenue.toFixed(2)}</p>
            <p className="text-sm text-gray-500">ingresos</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    userGrowth: [],
    topBusinesses: [],
    orderTrends: [],
    locationStats: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7days');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch user growth data from users table
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('role, created_at')
        .order('created_at', { ascending: true });

      if (usersError) {
        console.error('Error fetching users analytics:', usersError);
      } else if (usersData) {
        // Process user growth data by role
        const growthData = processUserGrowthData(usersData, timeRange);
        setAnalyticsData(prev => ({ ...prev, userGrowth: growthData }));
      }

      // For now, set mock data for other analytics until tables are configured
      setAnalyticsData(prev => ({
        ...prev,
        topBusinesses: [], // Will be populated when businesses table exists
        orderTrends: [], // Will be populated when orders table exists
        locationStats: [] // Will be populated when location data is available
      }));

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processUserGrowthData = (users: any[], range: string) => {
    const now = new Date();
    const periods = [];
    
    // Generate time periods based on range
    const days = range === '7days' ? 7 : range === '30days' ? 30 : 90;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const periodUsers = users.filter(user => {
        const userDate = new Date(user.created_at);
        return userDate.toDateString() === date.toDateString();
      });
      
      periods.push({
        period: date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        compradores: periodUsers.filter(u => u.role === 'comprador').length,
        vendedores: periodUsers.filter(u => u.role === 'vendedor').length,
        repartidores: periodUsers.filter(u => u.role === 'repartidor').length
      });
    }
    
    return periods;
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Analíticas Avanzadas</h2>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Rango de tiempo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Últimos 7 días</SelectItem>
              <SelectItem value="30days">Últimos 30 días</SelectItem>
              <SelectItem value="90days">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={fetchAnalytics} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Nuevos Usuarios Hoy"
          value="12"
          change="+25%"
          changeType="positive"
          icon={Users}
          color={TRATO_COLORS.orange[500]}
        />
        <MetricCard
          title="Negocios Activos"
          value="8"
          change="+2%"
          changeType="positive"
          icon={Store}
          color={TRATO_COLORS.green[500]}
        />
        <MetricCard
          title="Órdenes Completadas"
          value="45"
          change="+18%"
          changeType="positive"
          icon={ShoppingCart}
          color={TRATO_COLORS.orange[600]}
        />
        <MetricCard
          title="Ingresos del Día"
          value="Q1,250"
          change="+32%"
          changeType="positive"
          icon={DollarSign}
          color={TRATO_COLORS.green[600]}
        />
      </div>

      {/* Charts and Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <span>Crecimiento de Usuarios</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : (
              <GrowthChart data={analyticsData.userGrowth} />
            )}
          </CardContent>
        </Card>

        {/* Top Businesses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-green-500" />
              <span>Mejores Negocios</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TopBusinesses businesses={analyticsData.topBusinesses} />
          </CardContent>
        </Card>
      </div>

      {/* Activity Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <span>Actividad Reciente</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-3 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Nuevo vendedor registrado</p>
                  <p className="text-xs text-gray-500">Restaurante "La Tradición" - hace 2 minutos</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 p-3 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Orden completada</p>
                  <p className="text-xs text-gray-500">Orden #1234 - Q85.50 - hace 5 minutos</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 p-3 bg-orange-50 rounded-lg">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Nuevo repartidor</p>
                  <p className="text-xs text-gray-500">Mario González se registró - hace 10 minutos</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-purple-500" />
              <span>Estado del Sistema</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Rendimiento API</span>
                  <span>98%</span>
                </div>
                <Progress value={98} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Usuarios Activos</span>
                  <span>156</span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Capacidad Server</span>
                  <span>42%</span>
                </div>
                <Progress value={42} className="h-2" />
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex items-center space-x-2 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Todos los servicios operativos</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}