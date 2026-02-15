import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook to detect swipe gestures
 * @param {Function} onSwipeLeft - Callback when swiping left
 * @param {Function} onSwipeRight - Callback when swiping right
 * @param {Number} threshold - Minimum distance in pixels to trigger swipe (default: 50)
 * @param {HTMLElement} target - DOM element to attach listeners (default: window)
 */
export const useSwipeGesture = (
  { onSwipeLeft, onSwipeRight },
  threshold = 50,
  target = null
) => {
  const touchStart = useRef({ x: 0, y: 0 });
  const touchEnd = useRef({ x: 0, y: 0 });
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    const element = target || window;

    const handleTouchStart = (e) => {
      touchStart.current = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
      };
    };

    const handleTouchEnd = (e) => {
      touchEnd.current = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
      };
      handleSwipe();
    };

    const handleSwipe = () => {
      const xDiff = touchStart.current.x - touchEnd.current.x;
      const yDiff = touchStart.current.y - touchEnd.current.y;

      // Check if vertical movement is minimal (swipe is horizontal)
      if (Math.abs(yDiff) > Math.abs(xDiff)) {
        return; // It's more of a vertical gesture, ignore
      }

      // Swipe left (moved fingers to the left)
      if (xDiff > threshold && onSwipeLeft && isDetecting) {
        onSwipeLeft();
      }

      // Swipe right (moved fingers to the right)
      if (-xDiff > threshold && onSwipeRight && isDetecting) {
        onSwipeRight();
      }
    };

    if (element === window) {
      element.addEventListener('touchstart', handleTouchStart, false);
      element.addEventListener('touchend', handleTouchEnd, false);
    } else {
      element.addEventListener('touchstart', handleTouchStart);
      element.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      if (element === window) {
        element.removeEventListener('touchstart', handleTouchStart, false);
        element.removeEventListener('touchend', handleTouchEnd, false);
      } else {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [onSwipeLeft, onSwipeRight, threshold, target, isDetecting]);

  return { isDetecting, setIsDetecting };
};

export default useSwipeGesture;
