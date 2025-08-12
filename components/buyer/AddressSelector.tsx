import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription } from '../ui/alert';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase/client';
import { LocationManager } from './LocationManager';
import {
  MapPin,
  Plus,
  Star,
  Home,
  Building2,
  CheckCircle,
  AlertTriangle,
  Navigation,
  Clock,
  Users,
  Target
} from 'lucide-react';

interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  country: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number;
  delivery_instructions?: string;
  landmark?: string;
  access_notes?: string;
  is_verified: boolean;
  is_primary: boolean;
  is_active: boolean;
  address_type: 'residential' | 'business' | 'other';
  building_type?: string;
  floor_number?: string;
  apartment_number?: string;
  available_from?: string;
  available_to?: string;
  available_days?: string[];
  times_used: number;
  last_used_at?: string;
  delivery_success_rate: number;
  created_at: string;
  updated_at: string;
}

interface AddressSelectorProps {
  selectedAddressId?: string;
  onAddressSelect: (address: UserAddress | null) => void;
  deliveryType?: 'pickup' | 'dine_in' | 'delivery';
  className?: string;
  showTitle?: boolean;
}

export function AddressSelector({
  selectedAddressId,
  onAddressSelect,
  deliveryType = 'delivery',
  className = '',
  showTitle = true
}: AddressSelectorProps) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLocationManager, setShowLocationManager] = useState(false);

  // Load user addresses
  const loadAddresses = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('times_used', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const addressList = data || [];
      setAddresses(addressList);

      // Auto-select primary address if none is selected
      if (!selectedAddressId && addressList.length > 0) {
        const primaryAddress = addressList.find(addr => addr.is_primary) || addressList[0];
        onAddressSelect(primaryAddress);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedAddressId, onAddressSelect]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Handle address selection
  const handleAddressSelect = useCallback((address: UserAddress) => {
    onAddressSelect(address);
  }, [onAddressSelect]);

  // Handle new address created
  const handleNewAddress = useCallback(async () => {
    await loadAddresses();
    setShowLocationManager(false);
  }, [loadAddresses]);

  // Get icon for address type
  const getAddressIcon = useCallback((address: UserAddress) => {
    if (address.address_type === 'business') return Building2;
    if (address.label.toLowerCase().includes('casa')) return Home;
    if (address.label.toLowerCase().includes('trabajo')) return Building2;
    return MapPin;
  }, []);

  // Get verification badge
  const getVerificationBadge = useCallback((address: UserAddress) => {
    if (address.is_verified) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verificada
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-yellow-200 text-yellow-700">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Sin verificar
      </Badge>
    );
  }, []);

  // Check if address is available for delivery time
  const isAddressAvailable = useCallback((address: UserAddress): boolean => {
    if (!address.available_from || !address.available_to) {
      return true; // No restrictions
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const availableFrom = parseInt(address.available_from.split(':')[0]) * 60 + parseInt(address.available_from.split(':')[1]);
    const availableTo = parseInt(address.available_to.split(':')[0]) * 60 + parseInt(address.available_to.split(':')[1]);

    return currentTime >= availableFrom && currentTime <= availableTo;
  }, []);

  // Get selected address
  const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);

  if (deliveryType !== 'delivery') {
    return null; // Don't show address selector for pickup or dine-in
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-orange-500" />
            Dirección de Entrega
          </CardTitle>
        </CardHeader>
      )}
      
      <CardContent className="space-y-4">
        {addresses.length === 0 ? (
          // No addresses - show add address prompt
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tienes direcciones guardadas
            </h3>
            <p className="text-gray-600 mb-4">
              Agrega una dirección para recibir tus pedidos
            </p>
            
            <Dialog open={showLocationManager} onOpenChange={setShowLocationManager}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Dirección
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Gestión de Direcciones</DialogTitle>
                </DialogHeader>
                <LocationManager />
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          // Show address list
          <div className="space-y-3">
            <RadioGroup 
              value={selectedAddressId || ''} 
              onValueChange={(value) => {
                const address = addresses.find(addr => addr.id === value);
                if (address) {
                  handleAddressSelect(address);
                }
              }}
            >
              {addresses.map((address) => {
                const Icon = getAddressIcon(address);
                const isAvailable = isAddressAvailable(address);
                const isSelected = address.id === selectedAddressId;

                return (
                  <div
                    key={address.id}
                    className={`border rounded-lg p-4 transition-all ${
                      isSelected 
                        ? 'border-orange-300 bg-orange-50 ring-1 ring-orange-200' 
                        : 'border-gray-200 hover:border-gray-300'
                    } ${
                      !isAvailable ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem 
                        value={address.id} 
                        id={address.id}
                        disabled={!isAvailable}
                        className="mt-1"
                      />
                      
                      <div className="flex items-start gap-3 flex-1">
                        <Icon className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Label 
                              htmlFor={address.id}
                              className="font-medium text-gray-900 cursor-pointer"
                            >
                              {address.label}
                            </Label>
                            
                            {address.is_primary && (
                              <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                                <Star className="w-3 h-3 mr-1" />
                                Principal
                              </Badge>
                            )}
                            
                            {getVerificationBadge(address)}

                            {!isAvailable && (
                              <Badge variant="outline" className="border-red-200 text-red-700">
                                <Clock className="w-3 h-3 mr-1" />
                                No disponible ahora
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 break-words">
                            {address.address_line1}
                            {address.address_line2 && `, ${address.address_line2}`}
                          </p>
                          
                          <p className="text-xs text-gray-500 mb-2">
                            {address.city}, {address.state}
                            {address.postal_code && ` ${address.postal_code}`}
                          </p>

                          {/* Additional Info */}
                          <div className="space-y-1">
                            {address.delivery_instructions && (
                              <p className="text-xs text-blue-600">
                                📝 {address.delivery_instructions}
                              </p>
                            )}

                            {address.landmark && (
                              <p className="text-xs text-green-600">
                                🏛️ Cerca de: {address.landmark}
                              </p>
                            )}

                            {address.access_notes && (
                              <p className="text-xs text-purple-600">
                                🚪 {address.access_notes}
                              </p>
                            )}

                            {address.available_from && address.available_to && (
                              <p className="text-xs text-gray-500">
                                🕐 Disponible de {address.available_from} a {address.available_to}
                              </p>
                            )}
                          </div>

                          {/* Usage Stats */}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Usada {address.times_used} veces</span>
                            <span>Éxito: {address.delivery_success_rate.toFixed(0)}%</span>
                            {address.latitude && address.longitude && (
                              <span className="text-green-600 flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                GPS
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>

            {/* Add new address button */}
            <Dialog open={showLocationManager} onOpenChange={setShowLocationManager}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full border-dashed border-2 border-gray-300 hover:border-gray-400"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Nueva Dirección
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Gestión de Direcciones</DialogTitle>
                </DialogHeader>
                <LocationManager />
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Selected address summary */}
        {selectedAddress && (
          <Alert className="border-orange-200 bg-orange-50">
            <Navigation className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700">
              <strong>Entrega en:</strong> {selectedAddress.label}
              <br />
              {selectedAddress.address_line1}
              {selectedAddress.address_line2 && `, ${selectedAddress.address_line2}`}
              {selectedAddress.delivery_instructions && (
                <>
                  <br />
                  <span className="text-sm italic">"{selectedAddress.delivery_instructions}"</span>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}