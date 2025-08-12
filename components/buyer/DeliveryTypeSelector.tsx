import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { MapPin, Store, Utensils, Truck } from 'lucide-react';

interface DeliveryTypeSelectorProps {
  value: 'pickup' | 'dine-in' | 'delivery';
  onChange: (value: 'pickup' | 'dine-in' | 'delivery') => void;
}

export function DeliveryTypeSelector({ value, onChange }: DeliveryTypeSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-orange-500" />
          Tipo de Entrega
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup value={value} onValueChange={onChange}>
          <div className="space-y-3">
            {/* Pickup */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="pickup" id="pickup" />
              <Label htmlFor="pickup" className="flex items-center gap-3 cursor-pointer flex-1">
                <Store className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="font-medium">Recoger en tienda</div>
                  <div className="text-sm text-gray-600">15-25 min • Gratis</div>
                </div>
              </Label>
            </div>

            {/* Dine In */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="dine-in" id="dine-in" />
              <Label htmlFor="dine-in" className="flex items-center gap-3 cursor-pointer flex-1">
                <Utensils className="w-4 h-4 text-green-500" />
                <div>
                  <div className="font-medium">Comer en el lugar</div>
                  <div className="text-sm text-gray-600">20-30 min • Gratis</div>
                </div>
              </Label>
            </div>

            {/* Delivery */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="delivery" id="delivery" />
              <Label htmlFor="delivery" className="flex items-center gap-3 cursor-pointer flex-1">
                <Truck className="w-4 h-4 text-orange-500" />
                <div>
                  <div className="font-medium">Servicio a domicilio</div>
                  <div className="text-sm text-gray-600">30-45 min • Q15.00</div>
                </div>
              </Label>
            </div>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}