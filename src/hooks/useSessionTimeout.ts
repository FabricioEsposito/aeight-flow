import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 minutes in milliseconds
const WARNING_TIME = 2 * 60 * 1000; // 2 minutes before timeout

interface SessionTimeoutState {
  showWarning: boolean;
  remainingTime: number;
  totalRemainingTime: number;
}

// Shared state across hook instances
let globalState: SessionTimeoutState = {
  showWarning: false,
  remainingTime: WARNING_TIME,
  totalRemainingTime: SESSION_TIMEOUT
};

const listeners = new Set<(state: SessionTimeoutState) => void>();

function notifyListeners() {
  listeners.forEach(listener => listener({ ...globalState }));
}

let timeoutRef: NodeJS.Timeout | null = null;
let warningTimeoutRef: NodeJS.Timeout | null = null;
let countdownRef: NodeJS.Timeout | null = null;
let totalCountdownRef: NodeJS.Timeout | null = null;
let lastActivityTime = Date.now();
let isInitialized = false;

function clearAllTimers() {
  if (timeoutRef) {
    clearTimeout(timeoutRef);
    timeoutRef = null;
  }
  if (warningTimeoutRef) {
    clearTimeout(warningTimeoutRef);
    warningTimeoutRef = null;
  }
  if (countdownRef) {
    clearInterval(countdownRef);
    countdownRef = null;
  }
  if (totalCountdownRef) {
    clearInterval(totalCountdownRef);
    totalCountdownRef = null;
  }
}

export function useSessionTimeout() {
  const { user, signOut } = useAuth();
  const [state, setState] = useState<SessionTimeoutState>(globalState);
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  const handleLogout = useCallback(async () => {
    clearAllTimers();
    globalState = { showWarning: false, remainingTime: WARNING_TIME, totalRemainingTime: 0 };
    notifyListeners();
    isInitialized = false;
    await signOutRef.current();
  }, []);

  const startCountdown = useCallback(() => {
    globalState.remainingTime = WARNING_TIME;
    notifyListeners();
    
    countdownRef = setInterval(() => {
      globalState.remainingTime = Math.max(0, globalState.remainingTime - 1000);
      notifyListeners();
      
      if (globalState.remainingTime <= 0) {
        if (countdownRef) clearInterval(countdownRef);
      }
    }, 1000);
  }, []);

  const resetTimer = useCallback(() => {
    if (!user) return;

    clearAllTimers();
    globalState = { 
      showWarning: false, 
      remainingTime: WARNING_TIME,
      totalRemainingTime: SESSION_TIMEOUT 
    };
    lastActivityTime = Date.now();
    notifyListeners();

    // Total countdown for display
    totalCountdownRef = setInterval(() => {
      const elapsed = Date.now() - lastActivityTime;
      globalState.totalRemainingTime = Math.max(0, SESSION_TIMEOUT - elapsed);
      notifyListeners();
    }, 1000);

    // Set warning timeout (58 minutes)
    warningTimeoutRef = setTimeout(() => {
      globalState.showWarning = true;
      notifyListeners();
      startCountdown();
    }, SESSION_TIMEOUT - WARNING_TIME);

    // Set logout timeout (60 minutes)
    timeoutRef = setTimeout(() => {
      handleLogout();
    }, SESSION_TIMEOUT);
  }, [user, handleLogout, startCountdown]);

  const renewSession = useCallback(() => {
    globalState.showWarning = false;
    notifyListeners();
    resetTimer();
  }, [resetTimer]);

  // Activity events to track
  useEffect(() => {
    if (!user) {
      clearAllTimers();
      isInitialized = false;
      return;
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    const handleActivity = () => {
      // Only reset if warning is not showing
      if (!globalState.showWarning) {
        const now = Date.now();
        // Throttle: only reset if more than 1 minute since last activity
        if (now - lastActivityTime > 60000) {
          resetTimer();
        }
      }
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start the timer only once
    if (!isInitialized) {
      isInitialized = true;
      resetTimer();
    }

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, resetTimer]);

  return {
    showWarning: state.showWarning,
    remainingTime: state.remainingTime,
    totalRemainingTime: state.totalRemainingTime,
    renewSession,
    handleLogout
  };
}
