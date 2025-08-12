import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Calendar } from 'lucide-react';
import { DAYS_OF_WEEK, WeeklyHours } from '../constants/business';

interface WeeklyHoursSectionProps {
  weeklyHours: WeeklyHours;
  updateWeeklyHours: (day: string, field: string, value: any) => void;
  generateWeeklyHoursText: () => string;
  isEditing: boolean;
}

export function WeeklyHoursSection({ 
  weeklyHours, 
  updateWeeklyHours, 
  generateWeeklyHoursText, 
  isEditing 
}: WeeklyHoursSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-500" />
          Horarios de Atención Semanal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
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
                    disabled={!isEditing}
                  />
                  <span className={`text-sm font-medium ${weeklyHours[day.key].isOpen ? 'text-green-600' : 'text-red-600'}`}>
                    {weeklyHours[day.key].isOpen ? 'Abierto' : 'Cerrado'}
                  </span>
                </div>
              </div>
              
              {weeklyHours[day.key].isOpen && (
                <div className="flex items-center gap-4 ml-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Apertura:</Label>
                    <Input
                      type="time"
                      value={weeklyHours[day.key].openTime}
                      onChange={(e) => updateWeeklyHours(day.key, 'openTime', e.target.value)}
                      disabled={!isEditing}
                      className="w-32"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Cierre:</Label>
                    <Input
                      type="time"
                      value={weeklyHours[day.key].closeTime}
                      onChange={(e) => updateWeeklyHours(day.key, 'closeTime', e.target.value)}
                      disabled={!isEditing}
                      className="w-32"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Hours Preview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <h4 className="font-semibold text-blue-900 mb-2">Vista previa de horarios:</h4>
          <p className="text-sm text-blue-800">{generateWeeklyHoursText()}</p>
        </div>
      </CardContent>
    </Card>
  );
}