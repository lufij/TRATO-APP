import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from './dialog';
import { Button } from './button';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { X, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageAlt: string;
}

export function ImageModal({ isOpen, onClose, imageUrl, imageAlt }: ImageModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case 'r':
        case 'R':
          handleRotate();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = imageAlt || 'imagen';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="bg-black/90 backdrop-blur-sm" />
      <DialogContent 
        className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 border-0 bg-transparent shadow-none"
        onPointerDownOutside={onClose}
      >
        {/* Hidden title for accessibility */}
        <VisuallyHidden>
          <DialogTitle>Imagen ampliada: {imageAlt}</DialogTitle>
        </VisuallyHidden>

        {/* Toolbar */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-black/70 backdrop-blur-sm rounded-lg p-2 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="text-white hover:bg-white/20"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          
          <div className="text-white text-sm px-2">
            {Math.round(zoom * 100)}%
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 5}
            className="text-white hover:bg-white/20"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          
          <div className="w-px h-6 bg-white/30 mx-1" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRotate}
            className="text-white hover:bg-white/20"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-white hover:bg-white/20"
          >
            <Download className="w-4 h-4" />
          </Button>
          
          <div className="w-px h-6 bg-white/30 mx-1" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-white hover:bg-white/20 text-xs"
          >
            Reset
          </Button>
        </div>

        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Image container */}
        <div 
          className={`relative max-w-[90vw] max-h-[90vh] flex items-center justify-center ${
            zoom > 1 ? 'cursor-grab' : 'cursor-auto'
          } ${isDragging ? 'cursor-grabbing' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <ImageWithFallback
            src={imageUrl}
            alt={imageAlt}
            className="max-w-full max-h-full object-contain select-none"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-out'
            }}
            draggable={false}
          />
        </div>

        {/* Help text */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1">
          <p className="text-white/70 text-xs text-center">
            Scroll para zoom • Arrastra para mover • R para rotar • Esc para cerrar
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}