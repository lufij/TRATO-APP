import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useAuth } from '../../contexts/AuthContext';
import { useGeolocation, useLocationAccuracy } from '../../hooks/useGeolocation';
import { supabase } from '../../utils/supabase/client';
import { ExactLocationPicker } from '../location/ExactLocationPicker';
import { MapSelector } from '../location/MapSelector';
import { AddressAutocomplete } from '../location/AddressAutocomplete';
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Star,
  Home,
  Building2,
  Navigation,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Crosshair,
  MapIcon,
  Shield,
  Users,
  Calendar,
  Search
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
  google_place_id?: string;
  what3words?: string;
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
  location_source: 'gps' | 'manual' | 'google_maps' | 'what3words';
  verification_method?: string;
  verification_date?: string;
  times_used: number;
  last_used_at?: string;
  delivery_success_rate: number;
  created_at: string;
  updated_at: string;
}

interface LocationManagerProps {
  onAddressSelect?: (address: UserAddress) => void;
  showAddressSelection?: boolean;
  selectedAddressId?: string;
}

export function LocationManager({ 
  onAddressSelect, 
  showAddressSelection = false,
  selectedAddressId 
}: LocationManagerProps) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const inflightRef = useRef(false);

  // Geolocation hook
  const {
    position,
    error: locationError,
    loading: locationLoading,
    supported: locationSupported,
    permissionState,
    getCurrentPosition,
    requestPermission
  } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 300000, // 5 minutes
    immediate: false
  });

  // Location accuracy hook
  const {
    isAccurate,
    accuracy,
    getAccuracyLevel,
    getAccuracyColor,
    getAccuracyText
  } = useLocationAccuracy(position, 50);

  // Form state for new/edit address
  const [addressForm, setAddressForm] = useState({
    label: '',
    address_line1: '',
    address_line2: '',
    city: 'Gualán',
    state: 'Zacapa',
    country: 'Guatemala',
    postal_code: '',
    delivery_instructions: '',
    landmark: '',
    access_notes: '',
    address_type: 'residential' as 'residential' | 'business' | 'other',
    building_type: '',
    floor_number: '',
    apartment_number: '',
    available_from: '',
    available_to: '',
    available_days: [] as string[],
    latitude: null as number | null,
    longitude: null as number | null,
    accuracy_meters: null as number | null,
    location_source: 'manual' as 'gps' | 'manual' | 'google_maps' | 'what3words',
    verification_method: '',
    verification_date: '',
    is_verified: false
  });

  // Load user addresses
  const loadAddresses = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      if (inflightRef.current) return; // single-flight
      inflightRef.current = true;
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('times_used', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
  } catch (error: any) {
      console.error('Error loading addresses:', error);
    } finally {
      setLoading(false);
      inflightRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Request location permission
  const handleRequestLocation = useCallback(async () => {
    if (!locationSupported) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    try {
      setPermissionRequested(true);
      console.log('🌍 Solicitando permisos de ubicación...');
      
      const permissionResult = await requestPermission();
      console.log('🌍 Resultado de permisos:', permissionResult);
      
      if (permissionResult === 'granted') {
        console.log('🌍 Obteniendo posición actual...');
        const position = await getCurrentPosition();
        console.log('🌍 Posición obtenida exitosamente:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      }
  } catch (error: any) {
      console.error('🚨 Error detallado de geolocalización:', {
        error,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        permissionState,
        locationSupported,
        navigator: {
          geolocation: !!navigator.geolocation,
          permissions: !!navigator.permissions,
          userAgent: navigator.userAgent.substring(0, 100)
        }
      });
      
      // Show user-friendly error message
      let userMessage = 'Error al acceder a la ubicación';
      if (error?.message) {
        userMessage = error.message;
      } else if (error?.code === 1) {
        userMessage = 'Permisos de ubicación denegados. Habilita los permisos en tu navegador.';
      } else if (error?.code === 2) {
        userMessage = 'Ubicación no disponible. Verifica tu conexión GPS.';
      } else if (error?.code === 3) {
        userMessage = 'Tiempo de espera agotado. Intenta nuevamente.';
      }
      
      alert(userMessage);
    }
  }, [locationSupported, requestPermission, getCurrentPosition, permissionState]);

  // Reset form
  const resetForm = useCallback(() => {
    setAddressForm({
      label: '',
      address_line1: '',
      address_line2: '',
      city: 'Gualán',
      state: 'Zacapa',
      country: 'Guatemala',
      postal_code: '',
      delivery_instructions: '',
      landmark: '',
      access_notes: '',
      address_type: 'residential',
      building_type: '',
      floor_number: '',
      apartment_number: '',
      available_from: '',
      available_to: '',
      available_days: [],
      latitude: null,
      longitude: null,
      accuracy_meters: null,
      location_source: 'manual',
      verification_method: '',
      verification_date: '',
      is_verified: false
    });
  }, []);

  // Handle form input changes
  const handleFormChange = useCallback((field: string, value: any) => {
    setAddressForm(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Use current GPS location for new address
  const useCurrentLocation = useCallback(async () => {
    if (!position) {
      await handleRequestLocation();
      return;
    }

    if (!isAccurate) {
      const confirm = window.confirm(
        `La precisión de tu ubicación es ${getAccuracyText}. ¿Quieres usarla de todos modos?`
      );
      if (!confirm) return;
    }

    // Use reverse geocoding or manual input with GPS coordinates
    setAddressForm(prev => ({
      ...prev,
      address_line1: prev.address_line1 || `Lat: ${position.coords.latitude.toFixed(6)}, Lng: ${position.coords.longitude.toFixed(6)}`
    }));
  }, [position, isAccurate, getAccuracyText, handleRequestLocation]);

  // Clean address data before saving (fix for time field error)
  const cleanAddressData = useCallback((data: any) => {
    const cleaned = { ...data };
    
    // Fix time fields - convert empty strings to null
    if (cleaned.available_from === '') {
      cleaned.available_from = null;
    }
    if (cleaned.available_to === '') {
      cleaned.available_to = null;
    }
    
    // Ensure times are in correct format (HH:MM:SS or null)
    if (cleaned.available_from && !cleaned.available_from.includes(':')) {
      cleaned.available_from = null;
    }
    if (cleaned.available_to && !cleaned.available_to.includes(':')) {
      cleaned.available_to = null;
    }
    
    // Clean empty strings to null for optional fields
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === '') {
        cleaned[key] = null;
      }
    });
    
    return cleaned;
  }, []);

  // Save address
  const saveAddress = useCallback(async () => {
    if (!user || !addressForm.label || !addressForm.address_line1) {
      alert('Por favor completa al menos el nombre y dirección principal');
      return;
    }

    try {
      setLoading(true);

      const addressData = cleanAddressData({
        ...addressForm,
        user_id: user.id,
        latitude: position?.coords.latitude || null,
        longitude: position?.coords.longitude || null,
        accuracy_meters: position?.coords.accuracy ? Math.round(position.coords.accuracy) : null,
        location_source: position ? 'gps' as const : 'manual' as const,
        is_verified: position && isAccurate,
        verification_method: position && isAccurate ? 'gps' : null,
        verification_date: position && isAccurate ? new Date().toISOString() : null,
        is_primary: addresses.length === 0, // First address is primary
        is_active: true,
        times_used: 0,
        delivery_success_rate: 100
      });

      let result;
      if (editingAddress) {
        // Update existing address
        result = await supabase
          .from('user_addresses')
          .update(addressData)
          .eq('id', editingAddress.id)
          .select()
          .single();
      } else {
        // Create new address
        result = await supabase
          .from('user_addresses')
          .insert([addressData])
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error saving address:', result.error);
        throw result.error;
      }

      // Reload addresses
      await loadAddresses();
      
      // Reset form and close dialog
      resetForm();
      setIsAddingAddress(false);
      setEditingAddress(null);

  } catch (error: any) {
      console.error('Error saving address:', error);
      alert('Error al guardar la dirección. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [user, addressForm, position, isAccurate, editingAddress, loadAddresses, resetForm, addresses.length, cleanAddressData]);

  // Set primary address
  const setPrimaryAddress = useCallback(async (addressId: string) => {
    if (!user) return;

    try {
      // First remove primary from all addresses
      await supabase
        .from('user_addresses')
        .update({ is_primary: false })
        .eq('user_id', user.id);

      // Then set the selected address as primary
      const { error } = await supabase
        .from('user_addresses')
        .update({ is_primary: true })
        .eq('id', addressId);

      if (error) throw error;
      // Optimistic update to avoid extra refetch loops
      setAddresses(prev => prev.map(a => ({ ...a, is_primary: a.id === addressId })));
  } catch (error: any) {
      console.error('Error setting primary address:', error);
      alert('Error al establecer dirección principal');
    }
  }, [user, loadAddresses]);

  // Delete address
  const deleteAddress = useCallback(async (addressId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta dirección?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_addresses')
        .update({ is_active: false })
        .eq('id', addressId);

      if (error) throw error;
      await loadAddresses();
    } catch (error) {
      console.error('Error deleting address:', error);
      alert('Error al eliminar la dirección');
    }
  }, [loadAddresses]);

  // Edit address
  const startEditAddress = useCallback((address: UserAddress) => {
    setEditingAddress(address);
    setAddressForm({
      label: address.label,
      address_line1: address.address_line1,
      address_line2: address.address_line2 || '',
      city: address.city,
      state: address.state,
      country: address.country,
      postal_code: address.postal_code || '',
      delivery_instructions: address.delivery_instructions || '',
      landmark: address.landmark || '',
      access_notes: address.access_notes || '',
      address_type: address.address_type,
      building_type: address.building_type || '',
      floor_number: address.floor_number || '',
      apartment_number: address.apartment_number || '',
      available_from: address.available_from || '',
      available_to: address.available_to || '',
      available_days: address.available_days || [],
      latitude: address.latitude || null,
      longitude: address.longitude || null,
      accuracy_meters: address.accuracy_meters || null,
      location_source: address.location_source || 'manual',
      verification_method: address.verification_method || '',
      verification_date: address.verification_date || '',
      is_verified: address.is_verified || false
    });
  }, []);

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

  if (loading && addresses.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando direcciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with location permission status */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-500" />
            Gestión de Ubicaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location permission status */}
          {!permissionState || permissionState === 'prompt' ? (
            <Alert>
              <Target className="h-4 w-4" />
              <AlertDescription>
                Para obtener direcciones precisas, necesitamos acceso a tu ubicación GPS.
                <Button 
                  onClick={handleRequestLocation}
                  size="sm"
                  className="ml-2"
                  disabled={locationLoading}
                >
                  {locationLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Crosshair className="w-4 h-4 mr-1" />
                  )}
                  Permitir Ubicación
                </Button>
              </AlertDescription>
            </Alert>
          ) : permissionState === 'denied' ? (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                Los permisos de ubicación están denegados. Para habilitar ubicación GPS:
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Haz clic en el ícono de ubicación en la barra de direcciones</li>
                  <li>Selecciona "Permitir" para este sitio</li>
                  <li>Recarga la página</li>
                </ol>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">
                Ubicación habilitada
                {position && (
                  <span className={`ml-2 ${getAccuracyColor}`}>
                    - {getAccuracyText}
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Current location info */}
          {position && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Ubicación Actual</p>
                  <p className="text-xs text-gray-600">
                    {position.coords.latitude.toFixed(6)}, {position.coords.longitude.toFixed(6)}
                  </p>
                  <p className={`text-xs ${getAccuracyColor}`}>
                    {getAccuracyText}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={getCurrentPosition}
                  disabled={locationLoading}
                >
                  {locationLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Target className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saved addresses */}
      <Card className="border-orange-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-500" />
            Mis Direcciones ({addresses.length})
          </CardTitle>
          
          <Dialog open={isAddingAddress} onOpenChange={setIsAddingAddress}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                onClick={() => {
                  resetForm();
                  setEditingAddress(null);
                  setIsAddingAddress(true);
                }}
                className="bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600"
              >
                <Plus className="w-4 h-4 mr-1" />
                Nueva Dirección
              </Button>
            </DialogTrigger>
          </Dialog>
        </CardHeader>

        <CardContent>
          {addresses.length === 0 ? (
            <div className="text-center py-8">
              <MapIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tienes direcciones guardadas
              </h3>
              <p className="text-gray-600 mb-4">
                Agrega tu primera dirección para recibir entregas
              </p>
              <Button
                onClick={() => setIsAddingAddress(true)}
                className="bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Dirección
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((address) => {
                const Icon = getAddressIcon(address);
                const isSelected = selectedAddressId === address.id;
                
                return (
                  <div
                    key={address.id}
                    className={`p-4 border rounded-lg transition-all ${
                      isSelected 
                        ? 'border-orange-300 bg-orange-50 ring-1 ring-orange-200' 
                        : 'border-gray-200 hover:border-gray-300'
                    } ${
                      showAddressSelection 
                        ? 'cursor-pointer hover:bg-gray-50' 
                        : ''
                    }`}
                    onClick={() => {
                      if (showAddressSelection && onAddressSelect) {
                        onAddressSelect(address);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Icon className="w-5 h-5 text-gray-600 mt-1 flex-shrink-0" />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">{address.label}</h4>
                            {address.is_primary && (
                              <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                                <Star className="w-3 h-3 mr-1" />
                                Principal
                              </Badge>
                            )}
                            {getVerificationBadge(address)}
                          </div>
                          
                          <p className="text-sm text-gray-600 break-words">
                            {address.address_line1}
                            {address.address_line2 && `, ${address.address_line2}`}
                          </p>
                          
                          <p className="text-xs text-gray-500">
                            {address.city}, {address.state}
                          </p>

                          {address.delivery_instructions && (
                            <p className="text-xs text-blue-600 mt-1">
                              📝 {address.delivery_instructions}
                            </p>
                          )}

                          {address.landmark && (
                            <p className="text-xs text-green-600 mt-1">
                              🏛️ Cerca de: {address.landmark}
                            </p>
                          )}

                          {/* Usage stats */}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Usada {address.times_used} veces</span>
                            <span>Éxito: {address.delivery_success_rate.toFixed(0)}%</span>
                            {address.latitude && address.longitude && (
                              <span className="text-green-600">📍 GPS</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {!showAddressSelection && (
                        <div className="flex items-center gap-1 ml-2">
                          {!address.is_primary && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                setPrimaryAddress(address.id);
                              }}
                              className="h-8 w-8 p-0"
                              title="Establecer como principal"
                            >
                              <Star className="w-4 h-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              startEditAddress(address);
                              setIsAddingAddress(true);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              deleteAddress(address.id);
                            }}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Address Dialog */}
      <Dialog open={isAddingAddress} onOpenChange={(open) => {
        setIsAddingAddress(open);
        if (!open) {
          setEditingAddress(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh]" description="Formulario para agregar o editar direcciones de entrega">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? 'Editar Dirección' : 'Agregar Nueva Dirección'}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="label">Nombre de la dirección *</Label>
                  <Input
                    id="label"
                    value={addressForm.label}
                    onChange={(e) => handleFormChange('label', e.target.value)}
                    placeholder="Casa, Trabajo, Oficina..."
                  />
                </div>

                <div>
                  <Label htmlFor="address_type">Tipo de dirección</Label>
                  <Select 
                    value={addressForm.address_type} 
                    onValueChange={(value: 'residential' | 'business' | 'other') => handleFormChange('address_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residencial</SelectItem>
                      <SelectItem value="business">Comercial</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Address Lines */}
              <div>
                <Label htmlFor="address_line1">Dirección principal *</Label>
                <div className="flex gap-2">
                  <Input
                    id="address_line1"
                    value={addressForm.address_line1}
                    onChange={(e) => handleFormChange('address_line1', e.target.value)}
                    placeholder="Calle, avenida, colonia..."
                    className="flex-1"
                  />
                  {position && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={useCurrentLocation}
                      className="px-3"
                      title="Usar ubicación actual"
                    >
                      <Target className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="address_line2">Dirección secundaria (opcional)</Label>
                <Input
                  id="address_line2"
                  value={addressForm.address_line2}
                  onChange={(e) => handleFormChange('address_line2', e.target.value)}
                  placeholder="Detalles adicionales..."
                />
              </div>

              {/* Location Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    value={addressForm.city}
                    onChange={(e) => handleFormChange('city', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="state">Departamento</Label>
                  <Input
                    id="state"
                    value={addressForm.state}
                    onChange={(e) => handleFormChange('state', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="postal_code">Código postal</Label>
                  <Input
                    id="postal_code"
                    value={addressForm.postal_code}
                    onChange={(e) => handleFormChange('postal_code', e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              {/* Ubicación Avanzada con Google Maps */}
              <Tabs defaultValue="manual" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="manual" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Manual
                  </TabsTrigger>
                  <TabsTrigger value="search" className="flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Buscar
                  </TabsTrigger>
                  <TabsTrigger value="gps" className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    GPS
                  </TabsTrigger>
                  <TabsTrigger value="map" className="flex items-center gap-2">
                    <MapIcon className="w-4 h-4" />
                    Mapa
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">Ciudad</Label>
                      <Input
                        id="city"
                        value={addressForm.city}
                        onChange={(e) => handleFormChange('city', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="state">Departamento</Label>
                      <Input
                        id="state"
                        value={addressForm.state}
                        onChange={(e) => handleFormChange('state', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="postal_code">Código postal</Label>
                      <Input
                        id="postal_code"
                        value={addressForm.postal_code}
                        onChange={(e) => handleFormChange('postal_code', e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="search" className="space-y-4">
                  <AddressAutocomplete
                    onAddressSelect={(address) => {
                      handleFormChange('address_line1', address.formatted_address);
                      handleFormChange('city', address.city);
                      handleFormChange('state', address.state);
                      handleFormChange('country', address.country);
                      if (address.postal_code) {
                        handleFormChange('postal_code', address.postal_code);
                      }
                      if (address.latitude && address.longitude) {
                        handleFormChange('latitude', address.latitude);
                        handleFormChange('longitude', address.longitude);
                        handleFormChange('location_source', 'google_maps');
                        handleFormChange('verification_method', 'google_places');
                        handleFormChange('verification_date', new Date().toISOString());
                        handleFormChange('is_verified', true);
                      }
                    }}
                    placeholder="Buscar dirección con Google Maps..."
                    label="Buscar tu dirección"
                  />
                </TabsContent>

                <TabsContent value="gps" className="space-y-4">
                  <ExactLocationPicker
                    onLocationConfirm={(location) => {
                      handleFormChange('latitude', location.latitude);
                      handleFormChange('longitude', location.longitude);
                      handleFormChange('location_source', location.source);
                      handleFormChange('accuracy_meters', location.accuracy);
                      handleFormChange('address_line1', location.address);
                      handleFormChange('verification_method', 'gps_google_maps');
                      handleFormChange('verification_date', new Date().toISOString());
                      handleFormChange('is_verified', true);
                    }}
                  />
                </TabsContent>

                <TabsContent value="map" className="space-y-4">
                  <MapSelector
                    onLocationSelect={(location) => {
                      handleFormChange('latitude', location.latitude);
                      handleFormChange('longitude', location.longitude);
                      handleFormChange('location_source', location.source);
                      handleFormChange('accuracy_meters', location.accuracy);
                      handleFormChange('address_line1', location.address);
                      handleFormChange('verification_method', 'google_maps_interactive');
                      handleFormChange('verification_date', new Date().toISOString());
                      handleFormChange('is_verified', true);
                    }}
                    initialLocation={
                      addressForm.latitude && addressForm.longitude 
                        ? { latitude: addressForm.latitude, longitude: addressForm.longitude }
                        : undefined
                    }
                  />
                </TabsContent>
              </Tabs>

              {/* Delivery Instructions */}
              <div>
                <Label htmlFor="delivery_instructions">Instrucciones de entrega</Label>
                <Textarea
                  id="delivery_instructions"
                  value={addressForm.delivery_instructions}
                  onChange={(e) => handleFormChange('delivery_instructions', e.target.value)}
                  placeholder="Ejemplo: Casa color azul, portón negro..."
                  rows={2}
                />
              </div>

              {/* Landmark */}
              <div>
                <Label htmlFor="landmark">Punto de referencia</Label>
                <Input
                  id="landmark"
                  value={addressForm.landmark}
                  onChange={(e) => handleFormChange('landmark', e.target.value)}
                  placeholder="Ejemplo: Cerca del parque central..."
                />
              </div>

              {/* Availability Hours (optional) */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Horarios de Disponibilidad (opcional)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="available_from">Disponible desde</Label>
                    <Input
                      id="available_from"
                      type="time"
                      value={addressForm.available_from}
                      onChange={(e) => handleFormChange('available_from', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="available_to">Disponible hasta</Label>
                    <Input
                      id="available_to"
                      type="time"
                      value={addressForm.available_to}
                      onChange={(e) => handleFormChange('available_to', e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Si no especificas horarios, la dirección estará disponible 24/7
                </p>
              </div>

              {/* Access Notes */}
              <div>
                <Label htmlFor="access_notes">Notas de acceso</Label>
                <Textarea
                  id="access_notes"
                  value={addressForm.access_notes}
                  onChange={(e) => handleFormChange('access_notes', e.target.value)}
                  placeholder="Ejemplo: Tocar timbre, subir al 2do piso..."
                  rows={2}
                />
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingAddress(false);
                    setEditingAddress(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={saveAddress}
                  disabled={loading || !addressForm.label || !addressForm.address_line1}
                  className="bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {editingAddress ? 'Actualizar' : 'Guardar'} Dirección
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}