import React from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { 
  Search,
  Filter,
  RefreshCw,
  ShoppingCart,
  SlidersHorizontal,
  Calendar,
  X
} from 'lucide-react';

interface OrderFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  deliveryTypeFilter: string;
  setDeliveryTypeFilter: (type: string) => void;
  dateFilter: string;
  setDateFilter: (date: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  activeOrdersCount: number;
  historyOrdersCount: number;
  filteredCount?: number;
}

export function OrderFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  deliveryTypeFilter,
  setDeliveryTypeFilter,
  dateFilter,
  setDateFilter,
  onRefresh,
  isRefreshing,
  activeOrdersCount,
  historyOrdersCount,
  filteredCount
}: OrderFiltersProps) {

  const statusOptions = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'accepted', label: 'Aceptado' },
    { value: 'ready', label: 'Listo' },
    { value: 'assigned', label: 'Repartidor asignado' },
    { value: 'picked_up', label: 'En camino' },
    { value: 'in-transit', label: 'En tránsito' },
    { value: 'delivered', label: 'Entregado' },
    { value: 'completed', label: 'Completado' },
    { value: 'cancelled', label: 'Cancelado' },
    { value: 'rejected', label: 'Rechazado' }
  ];

  const deliveryOptions = [
    { value: 'all', label: 'Todos los tipos' },
    { value: 'delivery', label: 'Servicio a domicilio' },
    { value: 'pickup', label: 'Recoger en tienda' },
    { value: 'dine-in', label: 'Comer dentro' }
  ];

  const dateOptions = [
    { value: 'all', label: 'Todas las fechas' },
    { value: 'today', label: 'Hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
    { value: '3months', label: 'Últimos 3 meses' }
  ];

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDeliveryTypeFilter('all');
    setDateFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || deliveryTypeFilter !== 'all' || dateFilter !== 'all';

  return (
    <Card className="border-orange-200 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            Mis Pedidos
            {filteredCount !== undefined && (
              <Badge variant="outline" className="ml-2">
                {filteredCount} {filteredCount === 1 ? 'resultado' : 'resultados'}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4 mr-1" />
                Limpiar filtros
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={onRefresh} 
              disabled={isRefreshing}
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por vendedor, producto o número de pedido..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-orange-200 focus:border-orange-400"
          />
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Estado
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-orange-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Delivery Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Tipo de entrega
            </label>
            <Select value={deliveryTypeFilter} onValueChange={setDeliveryTypeFilter}>
              <SelectTrigger className="border-orange-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {deliveryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Fecha
            </label>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="border-orange-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary Stats */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Resumen
            </label>
            <div className="flex flex-col gap-1">
              <Badge variant="outline" className="justify-center">
                {activeOrdersCount} activos
              </Badge>
              <Badge variant="secondary" className="justify-center">
                {historyOrdersCount} completados
              </Badge>
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <span className="text-sm text-gray-600">Filtros activos:</span>
            {searchQuery && (
              <Badge variant="outline" className="gap-1">
                Búsqueda: "{searchQuery}"
                <X 
                  className="w-3 h-3 cursor-pointer hover:text-red-500" 
                  onClick={() => setSearchQuery('')}
                />
              </Badge>
            )}
            {statusFilter !== 'all' && (
              <Badge variant="outline" className="gap-1">
                Estado: {statusOptions.find(s => s.value === statusFilter)?.label}
                <X 
                  className="w-3 h-3 cursor-pointer hover:text-red-500" 
                  onClick={() => setStatusFilter('all')}
                />
              </Badge>
            )}
            {deliveryTypeFilter !== 'all' && (
              <Badge variant="outline" className="gap-1">
                Entrega: {deliveryOptions.find(d => d.value === deliveryTypeFilter)?.label}
                <X 
                  className="w-3 h-3 cursor-pointer hover:text-red-500" 
                  onClick={() => setDeliveryTypeFilter('all')}
                />
              </Badge>
            )}
            {dateFilter !== 'all' && (
              <Badge variant="outline" className="gap-1">
                Fecha: {dateOptions.find(d => d.value === dateFilter)?.label}
                <X 
                  className="w-3 h-3 cursor-pointer hover:text-red-500" 
                  onClick={() => setDateFilter('all')}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
