import React, { createContext, useContext, useState } from 'react';
import { MobileImageZoomModal } from '../components/ui/MobileImageZoomModal';
import { useImageModal } from '../hooks/useImageModal';

interface ImageModalContextType {
  openImageModal: (imageUrl: string, imageAlt?: string) => void;
  closeImageModal: () => void;
  isOpen: boolean;
}

const ImageModalContext = createContext<ImageModalContextType | undefined>(undefined);

export function ImageModalProvider({ children }: { children: React.ReactNode }) {
  const { isOpen, imageUrl, imageAlt, openModal, closeModal } = useImageModal();

  const value = {
    openImageModal: openModal,
    closeImageModal: closeModal,
    isOpen
  };

  return (
    <ImageModalContext.Provider value={value}>
      {children}
      <MobileImageZoomModal 
        isOpen={isOpen}
        onClose={closeModal}
        imageUrl={imageUrl}
        imageAlt={imageAlt}
      />
    </ImageModalContext.Provider>
  );
}

export function useImageModalContext() {
  const context = useContext(ImageModalContext);
  if (context === undefined) {
    throw new Error('useImageModalContext must be used within an ImageModalProvider');
  }
  return context;
}