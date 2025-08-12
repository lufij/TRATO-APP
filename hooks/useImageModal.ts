import { useState, useCallback } from 'react';

interface ImageModalState {
  isOpen: boolean;
  imageUrl: string;
  imageAlt: string;
}

export function useImageModal() {
  const [modal, setModal] = useState<ImageModalState>({
    isOpen: false,
    imageUrl: '',
    imageAlt: ''
  });

  const openModal = useCallback((imageUrl: string, imageAlt: string = '') => {
    setModal({
      isOpen: true,
      imageUrl,
      imageAlt
    });
  }, []);

  const closeModal = useCallback(() => {
    setModal({
      isOpen: false,
      imageUrl: '',
      imageAlt: ''
    });
  }, []);

  return {
    ...modal,
    openModal,
    closeModal
  };
}