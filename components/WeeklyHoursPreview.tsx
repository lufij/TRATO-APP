import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { Calendar, Edit2, Save, X, Copy, Clock, Loader2 } from 'lucide-react';
import { DAYS_OF_WEEK, WeeklyHours } from '../constants/business';
import { supabase } from '../utils/supabase/client';
import { useAuth } from '../contexts/AuthContext';

interface WeeklyHoursPreviewProps {
  weeklyHours: WeeklyHours;
  updateWeeklyHours: (day: string, field: string, value: any) => void;
  generateWeeklyHoursText: () => string;
  getHoursAsJSON: () => string;
}

export function WeeklyHoursPreview({ 
  weeklyHours, 
  updateWeeklyHours, 
  generateWeeklyHoursText,
  getHoursAsJSON
}: WeeklyHoursPreviewProps) {
  const { user } = useAuth();
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [templateHours, setTemplateHours] = useState({
    openTime: '09:00',
    closeTime: '18:00'
  });

  const handleSaveHours = async () => {
    if (!user) {
      console.error('No user found');
      return;
    }

    try {
      setIsSaving(true);

      // ✅ NUEVA LÓGICA SIMPLE: Evaluar si está abierto HOY por horario
      const now = new Date();
      const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const todaySchedule = weeklyHours[currentDay];
      let isOpenBySchedule = true; // Default abierto
      
      if (todaySchedule && typeof todaySchedule === 'object') {
        // Si está marcado como cerrado todo el día
        if ('isOpen' in todaySchedule && !todaySchedule.isOpen) {
          isOpenBySchedule = false;
        }
        // Si tiene horarios específicos, verificar si estamos dentro del rango
        else if ('openTime' in todaySchedule && 'closeTime' in todaySchedule) {
          const [openHour, openMin] = todaySchedule.openTime.split(':').map(Number);
          const [closeHour, closeMin] = todaySchedule.closeTime.split(':').map(Number);
          const openTimeMin = openHour * 60 + openMin;
          const closeTimeMin = closeHour * 60 + closeMin;
          isOpenBySchedule = currentTime >= openTimeMin && currentTime <= closeTimeMin;
        }
      }

      console.log('📅 Schedule evaluation:', {
        currentDay,
        currentTime,
        todaySchedule,
        isOpenBySchedule
      });

      // Guardar horarios Y estado calculado en la base de datos
      const { error } = await supabase
        .from('sellers')
        .update({
          business_hours: getHoursAsJSON(),
          is_open_by_schedule: isOpenBySchedule, // ✅ NUEVO CAMPO
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving hours:', error);
        alert('Error al guardar horarios: ' + error.message);
        return;
      }

      console.log('✅ Horarios y estado guardados exitosamente');
      alert('✅ Horarios guardados exitosamente');
      setIsEditingHours(false);
    } catch (error) {
      console.error('Error saving hours:', error);
      alert('Error inesperado al guardar horarios');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingHours(false);
  };

  // Función para aplicar horarios a todos los días
  const applyToAllDays = () => {
    DAYS_OF_WEEK.forEach(day => {
      updateWeeklyHours(day.key, 'isOpen', true);
      updateWeeklyHours(day.key, 'openTime', templateHours.openTime);
      updateWeeklyHours(day.key, 'closeTime', templateHours.closeTime);
    });
  };

  // Función para aplicar horarios solo a días laborables
  const applyToWeekdays = () => {
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    weekdays.forEach(day => {
      updateWeeklyHours(day, 'isOpen', true);
      updateWeeklyHours(day, 'openTime', templateHours.openTime);
      updateWeeklyHours(day, 'closeTime', templateHours.closeTime);
    });
  };

  // Función para cerrar todos los días
  const closeAllDays = () => {
    DAYS_OF_WEEK.forEach(day => {
      updateWeeklyHours(day.key, 'isOpen', false);
    });
  };

  return (
    <Card className="seller-profile w-full">
      <CardHeader className="pb-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500 flex-shrink-0" />
            <span className="text-base font-semibold">Horarios de Atención</span>
          </div>
          {!isEditingHours && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingHours(true)}
              className="flex items-center gap-2 text-sm w-full justify-center"
            >
              <Edit2 className="w-4 h-4" />
              Editar Horarios
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-2 sm:px-6">
        {!isEditingHours ? (
          // Vista previa de horarios - Responsiva
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <h4 className="font-semibold text-blue-900 mb-3 text-center text-sm sm:text-base">
              Vista previa de horarios:
            </h4>
            <div className="text-xs sm:text-sm text-blue-800 leading-relaxed break-words whitespace-pre-line">
              {generateWeeklyHoursText()}
            </div>
          </div>
        ) : (
          // Editor de horarios mejorado - Sistema simple y funcional
          <div className="space-y-4">
            {/* Header con botones responsivos */}
            <div className="flex flex-col gap-3">
              <h4 className="font-semibold text-gray-900 text-base">Configurar Horarios</h4>
              
              {/* Sección de aplicar horarios a todos los días */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-3">
                  <Clock className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-purple-900 text-sm mb-1">Aplicar horarios a todos los días</h5>
                    <p className="text-xs text-purple-700 mb-3">Configura una vez y aplica a toda la semana</p>
                  </div>
                </div>
                
                {/* Controles de horario template - Stack vertical en móvil */}
                <div className="space-y-3 mb-4">
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-purple-900">Hora de Apertura</Label>
                      <Input
                        type="time"
                        value={templateHours.openTime}
                        onChange={(e) => setTemplateHours(prev => ({ ...prev, openTime: e.target.value }))}
                        className="w-full h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-purple-900">Hora de Cierre</Label>
                      <Input
                        type="time"
                        value={templateHours.closeTime}
                        onChange={(e) => setTemplateHours(prev => ({ ...prev, closeTime: e.target.value }))}
                        className="w-full h-10 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      onClick={applyToAllDays}
                      variant="outline"
                      className="w-full flex items-center gap-2 border-purple-300 hover:bg-purple-100 text-purple-700 h-9"
                    >
                      <Copy className="w-4 h-4" />
                      Aplicar a todos los días
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={applyToWeekdays}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1.5 border-blue-300 hover:bg-blue-50 text-blue-700 text-xs h-8"
                      >
                        <Calendar className="w-3 h-3" />
                        Lun-Vie
                      </Button>
                      <Button
                        onClick={closeAllDays}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1.5 border-red-300 hover:bg-red-50 text-red-700 text-xs h-8"
                      >
                        <X className="w-3 h-3" />
                        Cerrar todos
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="flex items-center gap-2 flex-1"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveHours}
                  disabled={isSaving}
                  className="flex items-center gap-2 flex-1"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </div>

            {/* Lista de días - Diseño COMPACTO y funcional */}
            <div className="space-y-1">
              <h5 className="font-medium text-gray-700 text-sm">Configurar cada día:</h5>
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.key} className="border border-gray-200 rounded-lg p-2 bg-white">
                  {/* Primera línea: Día + Botón Estado Clickeable */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium text-gray-900 text-sm">{day.label}</span>
                    <button
                      onClick={() => updateWeeklyHours(day.key, 'isOpen', !weeklyHours[day.key].isOpen)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        weeklyHours[day.key].isOpen 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {weeklyHours[day.key].isOpen ? 'Abierto' : 'Cerrado'}
                    </button>
                  </div>
                  
                  {/* Segunda línea: Horarios - Stack vertical en móvil */}
                  {weeklyHours[day.key].isOpen && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 w-12">Abre:</span>
                        <Input
                          type="time"
                          value={weeklyHours[day.key].openTime}
                          onChange={(e) => updateWeeklyHours(day.key, 'openTime', e.target.value)}
                          className="flex-1 max-w-[110px] h-7 text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 w-12">Cierra:</span>
                        <Input
                          type="time"
                          value={weeklyHours[day.key].closeTime}
                          onChange={(e) => updateWeeklyHours(day.key, 'closeTime', e.target.value)}
                          className="flex-1 max-w-[110px] h-7 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Vista previa durante la edición - Mejorada */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Vista previa de horarios:
              </h4>
              <div className="text-sm text-blue-800 leading-relaxed whitespace-pre-line font-mono bg-white rounded p-3 border">
                {generateWeeklyHoursText()}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
