import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { 
  MapPin, 
  Search, 
  Loader2, 
  CheckCircle,
  Navigation,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface AddressAutocompleteProps {
  onAddressSelect: (address: {
    formatted_address: string;
    latitude?: number;
    longitude?: number;
    place_id?: string;
    city: string;
    state: string;
    country: string;
    postal_code?: string;
  }) => void;
  placeholder?: string;
  label?: string;
  initialValue?: string;
  className?: string;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

interface PlaceDetails {
  formatted_address: string;
  geometry: {
    location: {
      lat(): number;
      lng(): number;
    };
  };
  place_id: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

export function AddressAutocomplete({ 
  onAddressSelect, 
  placeholder = "Buscar dirección...",
  label = "Dirección",
  initialValue = "",
  className 
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);

  // Initialize Google Places services
  useEffect(() => {
    if (window.google?.maps?.places) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      
      // Create a dummy map element for PlacesService (required by Google)
      const dummyMap = new window.google.maps.Map(document.createElement('div'));
      placesService.current = new window.google.maps.places.PlacesService(dummyMap);
    }

    const handleMapsLoaded = () => {
      if (window.google?.maps?.places) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        const dummyMap = new window.google.maps.Map(document.createElement('div'));
        placesService.current = new window.google.maps.places.PlacesService(dummyMap);
      }
    };

    window.addEventListener('google-maps-loaded', handleMapsLoaded);
    return () => window.removeEventListener('google-maps-loaded', handleMapsLoaded);
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim() || query.length < 3) {
        setPredictions([]);
        setShowSuggestions(false);
        return;
      }

      if (!autocompleteService.current) {
        // Fallback to basic search without Google Places
        setPredictions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoading(true);

      try {
        const request = {
          input: query,
          componentRestrictions: { country: 'gt' }, // Guatemala
          types: ['address'],
          fields: ['formatted_address', 'geometry', 'place_id', 'address_components']
        };

        autocompleteService.current.getPlacePredictions(request, (predictions: Prediction[], status: string) => {
          setIsLoading(false);
          
          if (status === 'OK' && predictions) {
            setPredictions(predictions);
            setShowSuggestions(true);
            setSelectedIndex(-1);
          } else {
            setPredictions([]);
            setShowSuggestions(false);
          }
        });
      } catch (error) {
        console.error('Autocomplete error:', error);
        setIsLoading(false);
        setPredictions([]);
        setShowSuggestions(false);
      }
    }, 300),
    []
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    debouncedSearch(value);
  };

  // Get place details
  const getPlaceDetails = async (placeId: string): Promise<PlaceDetails | null> => {
    if (!placesService.current) return null;

    return new Promise((resolve) => {
      const request = {
        placeId,
        fields: ['formatted_address', 'geometry', 'place_id', 'address_components']
      };

      placesService.current.getDetails(request, (place: PlaceDetails, status: string) => {
        if (status === 'OK' && place) {
          resolve(place);
        } else {
          resolve(null);
        }
      });
    });
  };

  // Handle suggestion selection
  const handleSuggestionSelect = async (prediction: Prediction) => {
    setInputValue(prediction.description);
    setShowSuggestions(false);
    setPredictions([]);
    setIsLoading(true);

    try {
      const placeDetails = await getPlaceDetails(prediction.place_id);
      
      if (placeDetails) {
        const components = placeDetails.address_components;
        const getComponent = (types: string[]) => {
          const component = components.find(c => 
            types.some(type => c.types.includes(type))
          );
          return component?.long_name || '';
        };

        onAddressSelect({
          formatted_address: placeDetails.formatted_address,
          latitude: placeDetails.geometry.location.lat(),
          longitude: placeDetails.geometry.location.lng(),
          place_id: placeDetails.place_id,
          city: getComponent(['locality', 'administrative_area_level_2']),
          state: getComponent(['administrative_area_level_1']),
          country: getComponent(['country']),
          postal_code: getComponent(['postal_code'])
        });

        toast.success('Dirección seleccionada');
      } else {
        // Fallback to basic address data
        onAddressSelect({
          formatted_address: prediction.description,
          city: '',
          state: '',
          country: 'Guatemala'
        });
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      toast.error('Error al obtener detalles de la dirección');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && predictions[selectedIndex]) {
          handleSuggestionSelect(predictions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="address-input">{label}</Label>
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            ref={inputRef}
            id="address-input"
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (predictions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            className="pl-10 pr-10"
            autoComplete="off"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-gray-400" />
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && predictions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 border shadow-lg">
          <CardContent className="p-0">
            <ScrollArea className="max-h-60">
              <div ref={suggestionsRef}>
                {predictions.map((prediction, index) => (
                  <div
                    key={prediction.place_id}
                    className={`flex items-start gap-3 p-3 cursor-pointer transition-colors border-b last:border-b-0 ${
                      index === selectedIndex 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleSuggestionSelect(prediction)}
                  >
                    <MapPin className="w-4 h-4 mt-1 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {prediction.structured_formatting.main_text}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {prediction.structured_formatting.secondary_text}
                      </p>
                    </div>
                    {prediction.types.includes('establishment') && (
                      <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        Lugar
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* No Google Places fallback */}
      {!window.google?.maps?.places && (
        <p className="text-xs text-gray-500 mt-1">
          💡 Para autocompletado inteligente, Google Maps se está cargando...
        </p>
      )}
    </div>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
