// src/hooks/useIdleTimeout.js
import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Custom hook to detect user inactivity
 * @param {number} timeoutMinutes - Minutes of inactivity before triggering
 * @returns {boolean} isIdle - Whether user is idle
 */
export default function useIdleTimeout(timeoutMinutes = 5) {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef(null);

  // Reset timer
  const resetTimer = useCallback(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // If already idle, exit idle state
    if (isIdle) {
      setIsIdle(false);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      console.log("⏰ User idle timeout reached");
      setIsIdle(true);
    }, timeoutMinutes * 60 * 1000); // Convert minutes to milliseconds
  }, [timeoutMinutes, isIdle]);

  useEffect(() => {
    // Events that indicate user activity
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
      "wheel",
    ];

    // Attach event listeners
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimer]);

  return isIdle;
}