import { useEffect, useRef } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { tutorials } from '@/components/onboarding/tourSteps';

const SEEN_KEY = 'onboarding_auto_shown';

function getAutoShown(): string[] {
  try {
    const stored = localStorage.getItem(SEEN_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function markAutoShown(tutorialId: string) {
  const current = getAutoShown();
  if (!current.includes(tutorialId)) {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...current, tutorialId]));
  }
}

/**
 * Auto-triggers the tutorial for a given route when the user hasn't completed or dismissed it.
 * Shows the tutorial popup automatically the first time the user visits the page.
 * 
 * @param tutorialId - The ID of the tutorial to trigger (from tourSteps.ts)
 */
export function useContextualTutorial(tutorialId: string) {
  const { 
    activeTour, 
    isTutorialCompleted, 
    isTutorialDismissed, 
    dismissedTutorials,
    startTour 
  } = useOnboarding();
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    if (activeTour) return;

    const completed = isTutorialCompleted(tutorialId);
    const dismissed = isTutorialDismissed(tutorialId) || dismissedTutorials.includes('__all__');
    const alreadyAutoShown = getAutoShown().includes(tutorialId);

    if (completed || dismissed || alreadyAutoShown) return;

    const tutorial = tutorials.find(t => t.id === tutorialId);
    if (!tutorial) return;

    triggered.current = true;
    markAutoShown(tutorialId);

    // Small delay to let the page render first
    const timer = setTimeout(() => {
      startTour(tutorial);
    }, 800);

    return () => clearTimeout(timer);
  }, [tutorialId, activeTour, isTutorialCompleted, isTutorialDismissed, dismissedTutorials, startTour]);
}

/**
 * Manually trigger a specific tutorial on demand (e.g., when user clicks "Novo Lançamento").
 * Only shows if not completed/dismissed.
 */
export function useTutorialTrigger() {
  const { 
    activeTour, 
    isTutorialCompleted, 
    isTutorialDismissed, 
    dismissedTutorials,
    startTour 
  } = useOnboarding();

  return (tutorialId: string) => {
    if (activeTour) return;

    const completed = isTutorialCompleted(tutorialId);
    const dismissed = isTutorialDismissed(tutorialId) || dismissedTutorials.includes('__all__');
    if (completed || dismissed) return;

    const tutorial = tutorials.find(t => t.id === tutorialId);
    if (!tutorial) return;

    setTimeout(() => startTour(tutorial), 300);
  };
}
