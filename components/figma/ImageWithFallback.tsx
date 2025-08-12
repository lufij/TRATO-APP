import React, { useState } from 'react';
import { Eye } from 'lucide-react';

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  expandable?: boolean;
  onExpand?: (imageUrl: string, imageAlt: string) => void;
}

export function ImageWithFallback({ 
  expandable = false, 
  onExpand, 
  ...props 
}: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    console.log('Image failed to load:', props.src);
    setDidError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (expandable && onExpand && props.src) {
      e.preventDefault();
      e.stopPropagation();
      const imageUrl = didError ? ERROR_IMG_SRC : props.src;
      const imageAlt = props.alt || 'Imagen';
      onExpand(imageUrl, imageAlt);
    }
  };

  const { src, alt, style, className, onClick, onError, onLoad, ...rest } = props;

  // Log when component renders to debug
  console.log('ImageWithFallback rendering with src:', src);

  // If no src provided, show fallback immediately
  if (!src || src.trim() === '') {
    console.log('No src provided, showing fallback');
    return (
      <div
        className={`relative inline-block bg-gray-100 text-center align-middle ${className ?? ''} ${
          expandable ? 'cursor-pointer group' : ''
        }`}
        style={style}
        onClick={expandable ? handleClick : onClick}
        onMouseEnter={expandable ? () => setIsHovered(true) : undefined}
        onMouseLeave={expandable ? () => setIsHovered(false) : undefined}
      >
        <div className="flex items-center justify-center w-full h-full">
          <img src={ERROR_IMG_SRC} alt="No image available" {...rest} />
        </div>
        
        {/* Expandable overlay for fallback images */}
        {expandable && (
          <div className={`absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-200">
              <Eye className="w-4 h-4 text-gray-800" />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (didError) {
    return (
      <div
        className={`relative inline-block bg-gray-100 text-center align-middle ${className ?? ''} ${
          expandable ? 'cursor-pointer group' : ''
        }`}
        style={style}
        onClick={expandable ? handleClick : onClick}
        onMouseEnter={expandable ? () => setIsHovered(true) : undefined}
        onMouseLeave={expandable ? () => setIsHovered(false) : undefined}
      >
        <div className="flex items-center justify-center w-full h-full">
          <img src={ERROR_IMG_SRC} alt="Error loading image" {...rest} data-original-url={src} />
        </div>
        
        {/* Expandable overlay for error images */}
        {expandable && (
          <div className={`absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-200">
              <Eye className="w-4 h-4 text-gray-800" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main image with expandable functionality
  return (
    <div 
      className={`relative ${expandable ? 'cursor-pointer group' : ''}`}
      onClick={expandable ? handleClick : onClick}
      onMouseEnter={expandable ? () => setIsHovered(true) : undefined}
      onMouseLeave={expandable ? () => setIsHovered(false) : undefined}
    >
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      
      <img 
        src={src} 
        alt={alt} 
        className={`${className ?? ''} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-all duration-200 ${
          expandable ? 'group-hover:scale-105' : ''
        }`} 
        style={style} 
        {...rest} 
        onError={handleError}
        onLoad={handleLoad}
      />

      {/* Overlay para indicar que es expandible */}
      {expandable && !isLoading && (
        <div className={`absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-200">
            <Eye className="w-4 h-4 text-gray-800" />
          </div>
        </div>
      )}

      {/* Indicador sutil para imágenes expandibles */}
      {expandable && !isLoading && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-black/50 backdrop-blur-sm rounded-full p-1">
            <Eye className="w-3 h-3 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}