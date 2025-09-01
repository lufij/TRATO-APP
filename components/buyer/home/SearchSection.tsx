import { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card, CardContent } from '../../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Search, RefreshCw, Filter, Grid3X3, List } from 'lucide-react';

interface SearchSectionProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  categories: string[];
  onSearch: () => void;
  onRefreshStock: () => void;
  onRefreshAll: () => void;
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: Date;
}

export function SearchSection({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  viewMode,
  setViewMode,
  categories,
  onSearch,
  onRefreshStock,
  onRefreshAll,
  isLoading,
  isRefreshing,
  lastUpdated
}: SearchSectionProps) {
  return (
    <div className="space-y-4">
      {/* Header with Manual Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Explorar Productos</h1>
          <p className="text-sm text-gray-500">
            Última actualización: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Refresco rápido de stock */}
          <Button
            onClick={onRefreshStock}
            disabled={isRefreshing}
            size="sm"
            variant="outline"
            className="gap-2 border-green-300 text-green-600 hover:bg-green-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Stock
          </Button>
          {/* Refresco completo */}
          <Button
            onClick={onRefreshAll}
            disabled={isLoading}
            size="sm"
            variant="outline"
            className="gap-2 border-orange-300 text-orange-600 hover:bg-orange-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Todo
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border-orange-200 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Buscar productos, comercios..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 text-base border-gray-200 focus:border-orange-300"
                  onKeyPress={(e) => e.key === 'Enter' && onSearch()}
                />
              </div>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full lg:w-48 h-12 border-gray-200">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={onSearch} 
              disabled={isLoading}
              className="h-12 px-6 bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600"
            >
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Vista:</span>
            </div>
            <div className="flex items-center border border-gray-200 rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 px-3"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 px-3"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
