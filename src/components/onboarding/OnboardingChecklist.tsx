import React from 'react';
import { X, CheckCircle2, Circle, GraduationCap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { checklistItems, tutorials } from './tourSteps';
import { useNavigate } from 'react-router-dom';
import type { Tutorial } from '@/hooks/useOnboarding';

interface OnboardingChecklistProps {
  onDismiss: () => void;
  onStartTour: (tutorial: Tutorial) => void;
  isTutorialCompleted: (id: string) => boolean;
  completedCount: number;
}

export function OnboardingChecklist({
  onDismiss,
  onStartTour,
  isTutorialCompleted,
  completedCount,
}: OnboardingChecklistProps) {
  const navigate = useNavigate();
  const totalItems = checklistItems.length;
  const completedChecklistItems = checklistItems.filter(item => isTutorialCompleted(item.tutorialId)).length;
  const progressValue = totalItems > 0 ? (completedChecklistItems / totalItems) * 100 : 0;

  const handleStartItem = (item: typeof checklistItems[0]) => {
    const tutorial = tutorials.find(t => t.id === item.tutorialId);
    if (tutorial) {
      navigate(tutorial.route);
      setTimeout(() => onStartTour(tutorial), 300);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[9998]" onClick={onDismiss} />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md animate-in fade-in-0 zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Bem-vindo ao sistema!</h2>
                <p className="text-xs text-muted-foreground">Complete os tutoriais para começar</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onDismiss} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="px-6 pb-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Progresso</span>
              <span>{completedChecklistItems}/{totalItems} completos</span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>

          {/* Checklist Items */}
          <div className="px-6 py-4 space-y-2">
            {checklistItems.map((item) => {
              const completed = isTutorialCompleted(item.tutorialId);
              return (
                <button
                  key={item.id}
                  onClick={() => !completed && handleStartItem(item)}
                  disabled={completed}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                    completed
                      ? 'bg-primary/5 text-muted-foreground'
                      : 'hover:bg-secondary cursor-pointer'
                  }`}
                >
                  {completed ? (
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={`text-sm flex-1 ${completed ? 'line-through' : 'text-foreground'}`}>
                    {item.label}
                  </span>
                  {!completed && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 pb-5 pt-2">
            <Button variant="ghost" size="sm" onClick={onDismiss} className="text-muted-foreground">
              Fechar
            </Button>
            <Button variant="outline" size="sm" onClick={() => { onDismiss(); navigate('/tutoriais'); }}>
              Ver todos os tutoriais
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
