import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { Calendar, Edit2, Save, X } from 'lucide-react';
import { DAYS_OF_WEEK, WeeklyHours } from '../constants/business';

interface WeeklyHoursPreviewProps {
  weeklyHours: WeeklyHours;
  updateWeeklyHours: (day: string, field: string, value: any) => void;
  generateWeeklyHoursText: () => string;
}

export function WeeklyHoursPreview({ 
  weeklyHours, 
  updateWeeklyHours, 
  generateWeeklyHoursText
}: WeeklyHoursPreviewProps) {
  const [isEditingHours, setIsEditingHours] = useState(false);

  const handleSaveHours = () => {
    setIsEditingHours(false);
  };

  const handleCancelEdit = () => {
    setIsEditingHours(false);
  };

  return (
    <Card className="seller-profile">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            Horarios de Atención
          </div>
          {!isEditingHours && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingHours(true)}
              className="flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Editar Horarios
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isEditingHours ? (
          // Vista previa de horarios
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-3 text-center">
              Vista previa de horarios:
            </h4>
            <div className="text-sm text-blue-800 leading-relaxed">
              {generateWeeklyHoursText()}
            </div>
          </div>
        ) : (
          // Editor de horarios expandido
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">Configurar Horarios</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveHours}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.key} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-gray-900 min-w-[80px]">
                        {day.label}
                      </div>
                      <Switch
                        checked={weeklyHours[day.key].isOpen}
                        onCheckedChange={(checked) => updateWeeklyHours(day.key, 'isOpen', checked)}
                      />
                      <span className={`text-sm font-medium ${weeklyHours[day.key].isOpen ? 'text-green-600' : 'text-red-600'}`}>
                        {weeklyHours[day.key].isOpen ? 'Abierto' : 'Cerrado'}
                      </span>
                    </div>
                  </div>
                  
                  {weeklyHours[day.key].isOpen && (
                    <div className="flex items-center gap-4 ml-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm whitespace-nowrap">Apertura:</Label>
                        <Input
                          type="time"
                          value={weeklyHours[day.key].openTime}
                          onChange={(e) => updateWeeklyHours(day.key, 'openTime', e.target.value)}
                          className="w-32"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm whitespace-nowrap">Cierre:</Label>
                        <Input
                          type="time"
                          value={weeklyHours[day.key].closeTime}
                          onChange={(e) => updateWeeklyHours(day.key, 'closeTime', e.target.value)}
                          className="w-32"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Vista previa durante la edición */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-blue-900 mb-2">Vista previa:</h4>
              <p className="text-sm text-blue-800">{generateWeeklyHoursText()}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
