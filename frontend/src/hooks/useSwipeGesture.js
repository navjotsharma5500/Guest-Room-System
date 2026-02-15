// src/hooks/useSwipeGesture.js
// Hook to detect swipe gestures on mobile

import { useEffect, useRef } from 'react';

export default function useSwipeGesture(onSwipeRight, onSwipeLeft) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    const handleTouchStart = (e) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;

      // Only process mostly-horizontal swipes
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        const minSwipeDistance = 50; // Minimum pixels to trigger swipe

        // Prevent accidental opens: only allow open-from-left-edge swipes
        const leftEdgeThreshold = 60; // px from left edge
        const startedFromLeftEdge = touchStartX.current <= leftEdgeThreshold;

        if (deltaX > minSwipeDistance && onSwipeRight && startedFromLeftEdge) {
          // Swiped right starting from left edge -> open
          onSwipeRight();
        } else if (deltaX < -minSwipeDistance && onSwipeLeft) {
          // Swiped left anywhere -> close
          onSwipeLeft();
        }
      }
    };

    // Add listeners to window to detect swipes anywhere on the page
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeRight, onSwipeLeft]);
}
