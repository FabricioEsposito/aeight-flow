import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'onboarding_progress';
const CHECKLIST_KEY = 'onboarding_checklist_seen';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  route?: string;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  area: string;
  icon: string;
  route: string;
  steps: TourStep[];
}

interface OnboardingProgress {
  completedTutorials: string[];
}

interface OnboardingContextType {
  progress: OnboardingProgress;
  activeTour: Tutorial | null;
  showChecklist: boolean;
  completedCount: number;
  completeTutorial: (id: string) => void;
  isTutorialCompleted: (id: string) => boolean;
  startTour: (tutorial: Tutorial) => void;
  endTour: () => void;
  dismissChecklist: () => void;
  reopenChecklist: () => void;
  resetProgress: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

const getProgress = (): OnboardingProgress => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { completedTutorials: [] };
};

const saveProgress = (progress: OnboardingProgress) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
};

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<OnboardingProgress>(getProgress);
  const [activeTour, setActiveTour] = useState<Tutorial | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(CHECKLIST_KEY);
    if (!seen) setShowChecklist(true);
  }, []);

  const completeTutorial = useCallback((tutorialId: string) => {
    setProgress(prev => {
      const updated = {
        ...prev,
        completedTutorials: [...new Set([...prev.completedTutorials, tutorialId])]
      };
      saveProgress(updated);
      return updated;
    });
  }, []);

  const isTutorialCompleted = useCallback((tutorialId: string) => {
    return progress.completedTutorials.includes(tutorialId);
  }, [progress.completedTutorials]);

  const startTour = useCallback((tutorial: Tutorial) => {
    setActiveTour(tutorial);
  }, []);

  const endTour = useCallback(() => {
    if (activeTour) completeTutorial(activeTour.id);
    setActiveTour(null);
  }, [activeTour, completeTutorial]);

  const dismissChecklist = useCallback(() => {
    setShowChecklist(false);
    localStorage.setItem(CHECKLIST_KEY, 'true');
  }, []);

  const reopenChecklist = useCallback(() => {
    setShowChecklist(true);
  }, []);

  const resetProgress = useCallback(() => {
    const reset: OnboardingProgress = { completedTutorials: [] };
    saveProgress(reset);
    setProgress(reset);
    localStorage.removeItem(CHECKLIST_KEY);
  }, []);

  return (
    <OnboardingContext.Provider value={{
      progress,
      activeTour,
      showChecklist,
      completedCount: progress.completedTutorials.length,
      completeTutorial,
      isTutorialCompleted,
      startTour,
      endTour,
      dismissChecklist,
      reopenChecklist,
      resetProgress,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
