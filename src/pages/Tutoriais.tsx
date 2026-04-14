import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { tutorials } from '@/components/onboarding/tourSteps';
import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Home, Users, FileText, TrendingUp, TrendingDown, BarChart3,
  Receipt, Briefcase, ShoppingCart, CheckCircle2, Play, RotateCcw,
  GraduationCap, ListChecks
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const iconMap: Record<string, React.ElementType> = {
  Home, Users, FileText, TrendingUp, TrendingDown, BarChart3,
  Receipt, Briefcase, ShoppingCart,
};

const areaColors: Record<string, string> = {
  'Geral': 'bg-primary/10 text-primary',
  'Cadastro': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'Financeiro': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  'RH': 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  'Comercial': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

export default function Tutoriais() {
  const navigate = useNavigate();
  const {
    activeTour,
    showChecklist,
    completedCount,
    isTutorialCompleted,
    startTour,
    endTour,
    dismissChecklist,
    reopenChecklist,
    resetProgress,
  } = useOnboarding();

  const totalTutorials = tutorials.length;
  const progressValue = totalTutorials > 0 ? (completedCount / totalTutorials) * 100 : 0;

  const areas = [...new Set(tutorials.map(t => t.area))];

  const handleStartTour = (tutorial: typeof tutorials[0]) => {
    navigate(tutorial.route);
    setTimeout(() => startTour(tutorial), 300);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-primary" />
              Tutoriais
            </h1>
            <p className="text-muted-foreground mt-1">
              Guias interativos para aprender a usar o sistema
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={reopenChecklist}>
              <ListChecks className="w-4 h-4 mr-1.5" />
              Checklist
            </Button>
            <Button variant="ghost" size="sm" onClick={resetProgress} className="text-muted-foreground">
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Resetar progresso
            </Button>
          </div>
        </div>

        {/* Progress Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Progresso geral</span>
              <span className="text-sm text-muted-foreground">
                {completedCount}/{totalTutorials} tutoriais concluídos
              </span>
            </div>
            <Progress value={progressValue} className="h-3" />
            {completedCount === totalTutorials && totalTutorials > 0 && (
              <p className="text-sm text-primary font-medium mt-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Parabéns! Você concluiu todos os tutoriais!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tutorials by Area */}
        {areas.map(area => (
          <div key={area}>
            <h2 className="text-lg font-semibold text-foreground mb-3">{area}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tutorials
                .filter(t => t.area === area)
                .map(tutorial => {
                  const Icon = iconMap[tutorial.icon] || FileText;
                  const completed = isTutorialCompleted(tutorial.id);
                  return (
                    <Card
                      key={tutorial.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        completed ? 'border-primary/30 bg-primary/5' : 'hover:border-primary/50'
                      }`}
                      onClick={() => handleStartTour(tutorial)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${areaColors[area] || 'bg-muted text-muted-foreground'}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-foreground text-sm truncate">{tutorial.title}</h3>
                              {completed && (
                                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{tutorial.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-[10px]">
                                {tutorial.steps.length} passos
                              </Badge>
                              {completed ? (
                                <span className="text-[10px] text-primary font-medium">Concluído</span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Play className="w-3 h-3" /> Iniciar
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* Tour Overlay */}
      {activeTour && (
        <OnboardingTour
          tutorial={activeTour}
          onComplete={endTour}
          onSkip={endTour}
        />
      )}

      {/* Checklist Dialog */}
      {showChecklist && (
        <OnboardingChecklist
          onDismiss={dismissChecklist}
          onStartTour={(tutorial) => {
            dismissChecklist();
            handleStartTour(tutorial);
          }}
          isTutorialCompleted={isTutorialCompleted}
          completedCount={completedCount}
        />
      )}
    </AppLayout>
  );
}
