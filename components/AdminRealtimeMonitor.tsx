import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Activity, 
  Clock, 
  Users, 
  Truck, 
  ShoppingCart, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';

interface SystemStats {
  total_users: number;
  active_users: number;
  total_businesses: number;
  pending_businesses: number;
  total_drivers: number;
  active_drivers: number;
  pending_drivers: number;
  orders_today: number;
  revenue_today: number;
  system_health: {
    database_connection: string;
    last_updated: string;
  };
}

interface RealtimeMetric {
  label: string;
  value: number;
  previousValue: number;
  icon: React.ElementType;
  color: string;
  format?: 'number' | 'currency' | 'percentage';
}

export function AdminRealtimeMonitor() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_admin_stats');
      
      if (error) {
        console.error('Error fetching admin stats:', error);
        toast.error('Error al cargar estadísticas');
        return;
      }

      setStats(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatValue = (value: number, format: 'number' | 'currency' | 'percentage' = 'number') => {
    switch (format) {
      case 'currency':
        return `Q${value.toFixed(2)}`;
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toString();
    }
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getHealthStatus = () => {
    if (!stats) return { status: 'checking', color: 'yellow', label: 'Verificando...' };
    
    const criticalIssues = stats.pending_drivers > 5 || !stats.active_drivers;
    const warnings = stats.pending_businesses > 0 || stats.pending_drivers > 0;
    
    if (criticalIssues) {
      return { status: 'critical', color: 'red', label: 'Requiere Atención' };
    } else if (warnings) {
      return { status: 'warning', color: 'yellow', label: 'Advertencias' };
    } else {
      return { status: 'healthy', color: 'green', label: 'Sistema Saludable' };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <span className="ml-2">Cargando estadísticas...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
            <p>Error al cargar estadísticas del sistema</p>
            <Button onClick={fetchStats} className="mt-4">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const healthStatus = getHealthStatus();
  
  const metrics: RealtimeMetric[] = [
    {
      label: 'Usuarios Activos',
      value: stats.active_users,
      previousValue: stats.total_users,
      icon: Users,
      color: 'blue'
    },
    {
      label: 'Repartidores Activos',
      value: stats.active_drivers,
      previousValue: stats.total_drivers,
      icon: Truck,
      color: 'orange'
    },
    {
      label: 'Órdenes Hoy',
      value: stats.orders_today,
      previousValue: 0, // Se compararía con ayer
      icon: ShoppingCart,
      color: 'purple'
    },
    {
      label: 'Ingresos Hoy',
      value: stats.revenue_today,
      previousValue: 0, // Se compararía con ayer
      icon: DollarSign,
      color: 'green',
      format: 'currency'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header con estado del sistema */}
      <Card className={`border-l-4 ${
        healthStatus.color === 'red' ? 'border-l-red-500 bg-red-50' :
        healthStatus.color === 'yellow' ? 'border-l-yellow-500 bg-yellow-50' :
        'border-l-green-500 bg-green-50'
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className={`w-5 h-5 ${
                healthStatus.color === 'red' ? 'text-red-600' :
                healthStatus.color === 'yellow' ? 'text-yellow-600' :
                'text-green-600'
              }`} />
              <span>Estado del Sistema TRATO</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={healthStatus.status === 'healthy' ? 'default' : 'destructive'}
                className={`${
                  healthStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                  healthStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}
              >
                {healthStatus.label}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'bg-green-50 border-green-300' : ''}
              >
                {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Métricas en tiempo real */}
            {metrics.map((metric, index) => (
              <div key={index} className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <metric.icon className={`w-5 h-5 text-${metric.color}-600`} />
                  <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {formatValue(metric.value, metric.format)}
                </div>
                <div className="flex items-center justify-center space-x-1">
                  {getTrendIcon(metric.value, metric.previousValue)}
                  <span className="text-xs text-gray-500">
                    vs {formatValue(metric.previousValue, metric.format)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Alertas importantes */}
          <div className="mt-6 space-y-2">
            {stats.pending_drivers > 0 && (
              <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-orange-800">
                    {stats.pending_drivers} repartidor{stats.pending_drivers > 1 ? 'es' : ''} pendiente{stats.pending_drivers > 1 ? 's' : ''} de aprobación
                  </span>
                </div>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                  Revisar
                </Button>
              </div>
            )}

            {stats.pending_businesses > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-800">
                    {stats.pending_businesses} negocio{stats.pending_businesses > 1 ? 's' : ''} pendiente{stats.pending_businesses > 1 ? 's' : ''} de verificación
                  </span>
                </div>
                <Button size="sm" variant="outline" className="border-blue-300 text-blue-700">
                  Revisar
                </Button>
              </div>
            )}

            {stats.active_drivers === 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-800">
                    ¡No hay repartidores activos! Las entregas están pausadas.
                  </span>
                </div>
                <Button size="sm" variant="destructive">
                  Activar Repartidores
                </Button>
              </div>
            )}
          </div>

          {/* Info de última actualización */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Última actualización: {lastUpdate.toLocaleTimeString()}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchStats}
              className="text-gray-600 hover:text-gray-900"
            >
              Actualizar ahora
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progreso de salud del sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Salud del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Repartidores Activos</span>
                <span>{stats.active_drivers}/{stats.total_drivers}</span>
              </div>
              <Progress 
                value={stats.total_drivers > 0 ? (stats.active_drivers / stats.total_drivers) * 100 : 0} 
                className="h-2"
              />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Negocios Verificados</span>
                <span>{stats.total_businesses}/{stats.total_businesses + stats.pending_businesses}</span>
              </div>
              <Progress 
                value={
                  (stats.total_businesses + stats.pending_businesses) > 0 
                    ? (stats.total_businesses / (stats.total_businesses + stats.pending_businesses)) * 100 
                    : 0
                } 
                className="h-2"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Usuarios Activos</span>
                <span>{stats.active_users}/{stats.total_users}</span>
              </div>
              <Progress 
                value={stats.total_users > 0 ? (stats.active_users / stats.total_users) * 100 : 0} 
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
