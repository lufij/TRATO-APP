import { useState } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { RefreshCw, Grid3X3, List, Search } from 'lucide-react';

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
  viewMode,
  setViewMode,
  onRefreshStock,
  onRefreshAll,
  isLoading,
  isRefreshing,
  lastUpdated,
  searchQuery,
  selectedCategory
}: SearchSectionProps) {
  return (
    <div className="space-y-4">
      {/* Header compacto */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Explorar Productos</h1>
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
            <span>Actualizado: {lastUpdated.toLocaleTimeString()}</span>
            
            {/* Mostrar filtros activos */}
            {(searchQuery || selectedCategory !== 'all') && (
              <div className="flex items-center gap-2">
                <Search className="w-3 h-3" />
                <span className="text-orange-600 font-medium">
                  {searchQuery && `"${searchQuery}"`}
                  {searchQuery && selectedCategory !== 'all' && ' • '}
                  {selectedCategory !== 'all' && selectedCategory}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle de vista */}
          <div className="flex items-center border border-gray-200 rounded-lg p-1 bg-white">
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

          {/* Botones de refresh */}
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
    </div>
  );
}
