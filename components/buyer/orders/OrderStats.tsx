import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { 
  TrendingUp,
  ShoppingCart,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Star,
  DollarSign,
  Calendar,
  Package
} from 'lucide-react';

interface OrderStats {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  averageRating: number;
  thisMonthOrders: number;
  deliveryOrders: number;
  pickupOrders: number;
  dineInOrders: number;
}

interface OrderStatsProps {
  stats: OrderStats;
  loading?: boolean;
}

export function OrderStats({ stats, loading = false }: OrderStatsProps) {
  
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="bg-gray-200 h-4 w-20 rounded"></div>
                  <div className="bg-gray-200 h-6 w-16 rounded"></div>
                </div>
                <div className="bg-gray-200 w-8 h-8 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total de Pedidos',
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Pedidos realizados'
    },
    {
      title: 'Pedidos Activos',
      value: stats.activeOrders,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      description: 'En proceso'
    },
    {
      title: 'Completados',
      value: stats.completedOrders,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Exitosos'
    },
    {
      title: 'Total Gastado',
      value: `Q${stats.totalSpent.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Inversión total'
    }
  ];

  const additionalStats = [
    {
      label: 'Promedio por pedido',
      value: `Q${stats.averageOrderValue.toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      label: 'Calificación promedio',
      value: stats.averageRating > 0 ? `${stats.averageRating.toFixed(1)} ★` : 'Sin calificar',
      icon: Star,
      color: 'text-yellow-600'
    },
    {
      label: 'Este mes',
      value: `${stats.thisMonthOrders} pedidos`,
      icon: Calendar,
      color: 'text-indigo-600'
    }
  ];

  const deliveryTypeStats = [
    {
      label: 'A domicilio',
      value: stats.deliveryOrders,
      icon: Truck,
      color: 'text-green-600',
      percentage: stats.totalOrders > 0 ? (stats.deliveryOrders / stats.totalOrders * 100).toFixed(0) : 0
    },
    {
      label: 'Recoger en tienda',
      value: stats.pickupOrders,
      icon: Package,
      color: 'text-blue-600',
      percentage: stats.totalOrders > 0 ? (stats.pickupOrders / stats.totalOrders * 100).toFixed(0) : 0
    },
    {
      label: 'Comer en lugar',
      value: stats.dineInOrders,
      icon: Package,
      color: 'text-purple-600',
      percentage: stats.totalOrders > 0 ? (stats.dineInOrders / stats.totalOrders * 100).toFixed(0) : 0
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-orange-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500">
                      {stat.description}
                    </p>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Stats & Delivery Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Additional Stats */}
        <Card className="border-orange-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Métricas Adicionales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {additionalStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                    <span className="text-sm font-medium text-gray-700">
                      {stat.label}
                    </span>
                  </div>
                  <Badge variant="outline" className="font-medium">
                    {stat.value}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Delivery Type Distribution */}
        <Card className="border-orange-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Truck className="w-5 h-5 text-orange-500" />
              Tipos de Entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deliveryTypeStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${stat.color}`} />
                      <span className="text-sm font-medium text-gray-700">
                        {stat.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">
                        {stat.value}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {stat.percentage}%
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${stat.color.replace('text-', 'bg-')} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${stat.percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Quick insights */}
      {stats.totalOrders > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-green-900 mb-1">
                  Resumen de tu actividad
                </h4>
                <div className="text-sm text-green-700 space-y-1">
                  <p>
                    • Has realizado <strong>{stats.totalOrders}</strong> pedidos con un gasto total de <strong>Q{stats.totalSpent.toFixed(2)}</strong>
                  </p>
                  <p>
                    • Tu pedido promedio es de <strong>Q{stats.averageOrderValue.toFixed(2)}</strong>
                  </p>
                  {stats.cancelledOrders > 0 && (
                    <p>
                      • Tasa de éxito: <strong>{((stats.completedOrders / stats.totalOrders) * 100).toFixed(0)}%</strong> 
                      ({stats.cancelledOrders} cancelados)
                    </p>
                  )}
                  {stats.averageRating > 0 && (
                    <p>
                      • Calificación promedio que das: <strong>{stats.averageRating.toFixed(1)} estrellas</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
