import { useEffect, useState, useRef } from 'react';

interface MobileImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageAlt: string;
}

export function MobileImageZoomModal({ isOpen, onClose, imageUrl, imageAlt }: MobileImageZoomModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [lastDistance, setLastDistance] = useState(0);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Calcular distancia entre dos toques
  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  // Obtener centro entre dos toques
  const getCenter = (touch1: React.Touch, touch2: React.Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  // Limitar posición para que no se salga
  const constrainPosition = (x: number, y: number, currentScale: number) => {
    if (currentScale <= 1) return { x: 0, y: 0 };

    const maxMove = 150 * currentScale; // Más límite según el zoom
    return {
      x: Math.max(-maxMove, Math.min(maxMove, x)),
      y: Math.max(-maxMove, Math.min(maxMove, y))
    };
  };

  // Manejar inicio de toque
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 2) {
      // Pinch zoom
      const distance = getDistance(e.touches[0], e.touches[1]);
      setLastDistance(distance);
      const center = getCenter(e.touches[0], e.touches[1]);
      setLastPosition(center);
    } else if (e.touches.length === 1 && scale > 1) {
      // Drag cuando hay zoom
      setLastPosition({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  };

  // Manejar movimiento de toque
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 2) {
      // Pinch zoom
      const distance = getDistance(e.touches[0], e.touches[1]);
      const scaleChange = distance / lastDistance;
      const newScale = Math.min(Math.max(scale * scaleChange, 1), 5); // Entre 1x y 5x
      
      setScale(newScale);
      setLastDistance(distance);
    } else if (e.touches.length === 1 && scale > 1) {
      // Drag más suave
      const deltaX = (e.touches[0].clientX - lastPosition.x) * 0.5; // Reducir velocidad
      const deltaY = (e.touches[0].clientY - lastPosition.y) * 0.5; // Reducir velocidad
      
      const newPosition = constrainPosition(
        position.x + deltaX,
        position.y + deltaY,
        scale
      );
      setPosition(newPosition);
      
      setLastPosition({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  };

  // Manejar doble clic para resetear zoom
  const handleDoubleClick = () => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Botón cerrar */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[10000] text-white text-2xl bg-black/50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70"
      >
        ×
      </button>
      
      {/* Imagen con zoom */}
      <img
        ref={imageRef}
        src={imageUrl}
        alt={imageAlt}
        className="max-w-full max-h-full object-contain p-4 touch-none"
        style={{
          transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
          transformOrigin: 'center center',
          transition: 'transform 0.1s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      />
      
      {/* Instrucciones */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded text-center">
        {scale > 1 
          ? 'Pellizca para zoom • Arrastra para mover • Doble clic para resetear' 
          : 'Pellizca con dos dedos para zoom'
        }
      </div>
    </div>
  );
}