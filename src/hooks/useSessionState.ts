import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * A hook that works like useState but persists the value in sessionStorage.
 * The value is restored when the component mounts and saved on every change.
 * This allows filter states to survive navigation within the same area.
 * 
 * @param key - A unique key for sessionStorage (e.g., 'contratos-filterType')
 * @param initialValue - The default value when nothing is stored
 */
export function useSessionState<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch {
      // ignore parse errors
    }
    return initialValue;
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Save to sessionStorage whenever state changes
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore storage errors
    }
  }, [key, state]);

  const setSessionState = useCallback((value: T | ((prev: T) => T)) => {
    setState(value);
  }, []);

  return [state, setSessionState];
}
