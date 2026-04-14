import React from 'react';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { useOnboarding } from '@/contexts/OnboardingContext';

export function OnboardingOverlay() {
  const {
    activeTour,
    showChecklist,
    completedCount,
    isTutorialCompleted,
    startTour,
    endTour,
    dismissChecklist,
  } = useOnboarding();

  return (
    <>
      {activeTour && (
        <OnboardingTour
          tutorial={activeTour}
          onComplete={endTour}
          onSkip={endTour}
        />
      )}
      {showChecklist && !activeTour && (
        <OnboardingChecklist
          onDismiss={dismissChecklist}
          onStartTour={(tutorial) => {
            dismissChecklist();
            startTour(tutorial);
          }}
          isTutorialCompleted={isTutorialCompleted}
          completedCount={completedCount}
        />
      )}
    </>
  );
}
