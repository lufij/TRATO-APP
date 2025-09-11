import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { X, Download, Smartphone, Square } from 'lucide-react';

interface IOSInstallPromptProps {
  onClose?: () => void;
}

const IOSInstallPrompt: React.FC<IOSInstallPromptProps> = ({ onClose }) => {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Detectar si ya está instalada como PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');

    setIsIOS(iOS);
    setIsStandalone(standalone);
    
    // Mostrar solo en iOS Safari y no instalada
    setShowPrompt(iOS && !standalone);
  }, []);

  const handleClose = () => {
    setShowPrompt(false);
    onClose?.();
    
    // No mostrar por 24 horas
    localStorage.setItem('ios-install-dismissed', Date.now().toString());
  };

  const handleInstallClick = () => {
    // Scroll al top para que vean bien las instrucciones
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // No mostrar si se desestimó recientemente
  useEffect(() => {
    const dismissed = localStorage.getItem('ios-install-dismissed');
    if (dismissed) {
      const dismissTime = parseInt(dismissed);
      const hours24 = 24 * 60 * 60 * 1000;
      if (Date.now() - dismissTime < hours24) {
        setShowPrompt(false);
      }
    }
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white p-4 shadow-lg z-50">
      <div className="flex items-start gap-3">
        <Smartphone className="h-6 w-6 mt-1 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">📱 Instalar TRATO en tu iPhone</h3>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-blue-600 p-1 h-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-sm space-y-2">
            <p className="font-medium">Para recibir notificaciones de pedidos:</p>
            
            <div className="bg-blue-600 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                <span>Toca el botón <Square className="inline h-3 w-3" /> (Compartir) abajo</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                <span>Selecciona "Añadir a pantalla de inicio"</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                <span>Abre la app desde tu pantalla de inicio</span>
              </div>
            </div>
            
            <p className="text-xs opacity-90">
              ⚠️ Las notificaciones solo funcionan cuando la app está instalada en pantalla de inicio
            </p>
          </div>
          
          <Button 
            onClick={handleInstallClick}
            variant="secondary" 
            size="sm" 
            className="mt-3 bg-white text-blue-600 hover:bg-gray-100"
          >
            <Download className="h-4 w-4 mr-2" />
            Ver instrucciones
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IOSInstallPrompt;
