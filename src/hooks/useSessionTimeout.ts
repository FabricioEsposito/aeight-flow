import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 minutes in milliseconds
const WARNING_TIME = 2 * 60 * 1000; // 2 minutes before timeout

export function useSessionTimeout() {
  const { user, signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(WARNING_TIME);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    clearAllTimers();
    setShowWarning(false);
    await signOut();
  }, [signOut, clearAllTimers]);

  const startCountdown = useCallback(() => {
    setRemainingTime(WARNING_TIME);
    countdownRef.current = setInterval(() => {
      setRemainingTime(prev => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
          }
          return 0;
        }
        return newTime;
      });
    }, 1000);
  }, []);

  const resetTimer = useCallback(() => {
    if (!user) return;

    clearAllTimers();
    setShowWarning(false);
    lastActivityRef.current = Date.now();

    // Set warning timeout (58 minutes)
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      startCountdown();
    }, SESSION_TIMEOUT - WARNING_TIME);

    // Set logout timeout (60 minutes)
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, SESSION_TIMEOUT);
  }, [user, clearAllTimers, handleLogout, startCountdown]);

  const renewSession = useCallback(() => {
    setShowWarning(false);
    resetTimer();
  }, [resetTimer]);

  // Activity events to track
  useEffect(() => {
    if (!user) {
      clearAllTimers();
      return;
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    const handleActivity = () => {
      // Only reset if warning is not showing
      if (!showWarning) {
        const now = Date.now();
        // Throttle: only reset if more than 1 minute since last activity
        if (now - lastActivityRef.current > 60000) {
          resetTimer();
        }
      }
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start the timer
    resetTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearAllTimers();
    };
  }, [user, showWarning, resetTimer, clearAllTimers]);

  return {
    showWarning,
    remainingTime,
    renewSession,
    handleLogout
  };
}
