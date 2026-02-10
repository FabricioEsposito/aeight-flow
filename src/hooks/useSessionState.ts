import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Tracks which area is currently active and clears filters from other areas
 * when the user switches between areas.
 * 
 * An "area" is identified by a prefix (e.g., 'contratos', 'extrato').
 * When a new area mounts, all sessionStorage keys from other areas are cleared.
 */

const AREA_STORAGE_PREFIX = 'filter--';
const CURRENT_AREA_KEY = 'filter--current-area';

function setCurrentArea(area: string) {
  const previousArea = sessionStorage.getItem(CURRENT_AREA_KEY);
  
  // If we're in the same area, don't clear anything
  if (previousArea === area) return;
  
  // Moving to a new area: clear all filter keys from previous areas
  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith(AREA_STORAGE_PREFIX) && key !== CURRENT_AREA_KEY) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => sessionStorage.removeItem(key));
  
  // Set the new current area
  sessionStorage.setItem(CURRENT_AREA_KEY, area);
}

/**
 * Call this from pages that don't use useSessionState but should
 * clear filters from the previous area (e.g., Dashboard, Clientes).
 */
export function useClearFiltersOnAreaChange(area: string) {
  const hasInitRef = useRef(false);
  if (!hasInitRef.current) {
    hasInitRef.current = true;
    setCurrentArea(area);
  }
}

/**
 * A hook that works like useState but persists the value in sessionStorage.
 * Filters are preserved when navigating within the same area (e.g., editing a contract
 * and returning to the contracts list), but are cleared when switching to a different area.
 * 
 * @param area - The area identifier (e.g., 'contratos', 'extrato', 'contasReceber')
 * @param key - A unique key for this filter within the area (e.g., 'search', 'status')
 * @param initialValue - The default value when nothing is stored
 */
export function useSessionState<T>(area: string, key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const storageKey = `${AREA_STORAGE_PREFIX}${area}--${key}`;
  
  // On first render, clear other area filters if area changed
  const hasInitRef = useRef(false);
  if (!hasInitRef.current) {
    hasInitRef.current = true;
    setCurrentArea(area);
  }

  const [state, setState] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch {
      // ignore parse errors
    }
    return initialValue;
  });

  // Save to sessionStorage whenever state changes
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // ignore storage errors
    }
  }, [storageKey, state]);

  const setSessionState = useCallback((value: T | ((prev: T) => T)) => {
    setState(value);
  }, []);

  return [state, setSessionState];
}
