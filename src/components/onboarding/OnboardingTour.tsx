import React, { useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Tutorial } from '@/contexts/OnboardingContext';

interface OnboardingTourProps {
  tutorial: Tutorial;
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingTour({ tutorial, onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = tutorial.steps;
  const step = steps[currentStep];
  const progressValue = ((currentStep + 1) / steps.length) * 100;

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  }, [currentStep, steps.length, onComplete]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9998]" onClick={onSkip} />

      {/* Tour Card */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg animate-in fade-in-0 zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <div>
              <p className="text-xs font-medium text-primary uppercase tracking-wider">{tutorial.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Passo {currentStep + 1} de {steps.length}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onSkip} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="px-6">
            <Progress value={progressValue} className="h-1.5" />
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between px-6 pb-5">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-muted-foreground"
            >
              <SkipForward className="w-4 h-4 mr-1.5" />
              Pular tutorial
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
              <Button size="sm" onClick={handleNext}>
                {currentStep < steps.length - 1 ? (
                  <>
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  'Concluir'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
