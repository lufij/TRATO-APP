import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { X, Download, Smartphone, Chrome, Apple } from 'lucide-react';
import IOSInstallPrompt from './IOSInstallPrompt';

interface UniversalPWAInstallProps {
  onClose?: () => void;
}

const UniversalPWAInstall: React.FC<UniversalPWAInstallProps> = ({ onClose }) => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({
    isIOS: false,
    isAndroid: false,
    isStandalone: false,
    browser: ''
  });

  useEffect(() => {
    // Detectar dispositivo y navegador
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent) && !/Edg/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    
    // Detectar si ya está instalada como PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');

    let browser = 'unknown';
    if (isChrome) browser = 'chrome';
    else if (isSafari) browser = 'safari';
    else if (/Firefox/.test(userAgent)) browser = 'firefox';
    else if (/Edg/.test(userAgent)) browser = 'edge';

    setDeviceInfo({
      isIOS,
      isAndroid,
      isStandalone,
      browser
    });

    // Solo mostrar si no está instalada
    if (!isStandalone) {
      if (isIOS && isSafari) {
        // iOS Safari - mostrar instrucciones manuales
        const dismissed = localStorage.getItem('ios-install-dismissed');
        if (!dismissed || (Date.now() - parseInt(dismissed)) > 24 * 60 * 60 * 1000) {
          setShowIOSPrompt(true);
        }
      } else if (isAndroid && isChrome) {
        // Android Chrome - esperar el evento automático
        const dismissed = localStorage.getItem('android-install-dismissed');
        if (!dismissed || (Date.now() - parseInt(dismissed)) > 24 * 60 * 60 * 1000) {
          setShowAndroidPrompt(true);
        }
      }
    }

    // Listener para el prompt automático de Android/Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('📱 TRATO PWA: Prompt de instalación disponible');
      e.preventDefault();
      setInstallPrompt(e);
      
      if (deviceInfo.isAndroid) {
        setShowAndroidPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      // Android Chrome - usar prompt automático
      try {
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        
        console.log('📱 TRATO PWA: Instalación', outcome);
        
        if (outcome === 'accepted') {
          setShowAndroidPrompt(false);
          setInstallPrompt(null);
        } else {
          // Usuario rechazó - no mostrar por 48 horas
          localStorage.setItem('android-install-dismissed', Date.now().toString());
          setShowAndroidPrompt(false);
        }
      } catch (error) {
        console.error('Error instalando PWA:', error);
      }
    } else if (deviceInfo.isIOS) {
      // iOS - scroll para que vean las instrucciones
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleClose = () => {
    setShowAndroidPrompt(false);
    setShowIOSPrompt(false);
    onClose?.();
    
    // No mostrar por 24 horas
    const key = deviceInfo.isIOS ? 'ios-install-dismissed' : 'android-install-dismissed';
    localStorage.setItem(key, Date.now().toString());
  };

  // Mostrar componente específico de iOS
  if (showIOSPrompt && deviceInfo.isIOS) {
    return <IOSInstallPrompt onClose={handleClose} />;
  }

  // Mostrar prompt de Android
  if (showAndroidPrompt && deviceInfo.isAndroid) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-green-500 text-white p-4 shadow-lg z-50">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-full p-2">
            <Chrome className="h-5 w-5 text-green-500" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold">📱 Instalar TRATO como aplicación</h3>
            <p className="text-sm opacity-90">
              Acceso rápido desde tu pantalla de inicio y notificaciones push completas
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleInstallClick}
              size="sm"
              variant="secondary"
              className="bg-white text-green-500 hover:bg-gray-100"
            >
              <Download className="h-4 w-4 mr-1" />
              Instalar
            </Button>
            
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-green-600 p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default UniversalPWAInstall;
