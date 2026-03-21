import { useEffect } from 'react';

export const useEscapeKey = (onClose) => {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape' && typeof onClose === 'function') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);
};