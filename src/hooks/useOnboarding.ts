import { useState, useCallback, useEffect } from 'react';

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
  checklistDismissed: boolean;
}

const getProgress = (): OnboardingProgress => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { completedTutorials: [], checklistDismissed: false };
};

const saveProgress = (progress: OnboardingProgress) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
};

export function useOnboarding() {
  const [progress, setProgress] = useState<OnboardingProgress>(getProgress);
  const [activeTour, setActiveTour] = useState<Tutorial | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(CHECKLIST_KEY);
    if (!seen) {
      setShowChecklist(true);
    }
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
    if (activeTour) {
      completeTutorial(activeTour.id);
    }
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
    const reset: OnboardingProgress = { completedTutorials: [], checklistDismissed: false };
    saveProgress(reset);
    setProgress(reset);
    localStorage.removeItem(CHECKLIST_KEY);
  }, []);

  return {
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
  };
}
