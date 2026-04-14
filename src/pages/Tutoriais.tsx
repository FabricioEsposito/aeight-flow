import React from 'react';
import { tutorials } from '@/components/onboarding/tourSteps';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Home, Users, FileText, TrendingUp, TrendingDown, BarChart3,
  Receipt, Briefcase, ShoppingCart, CheckCircle2, Play, RotateCcw,
  GraduationCap, ListChecks, EyeOff, Eye, Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import tutorialPdfUrl from '@/assets/Tutorial_Sistema_Completo.pdf?url';

const iconMap: Record<string, React.ElementType> = {
  Home, Users, FileText, TrendingUp, TrendingDown, BarChart3,
  Receipt, Briefcase, ShoppingCart,
};

const areaColors: Record<string, string> = {
  'Geral': 'bg-primary/10 text-primary',
  'Cadastro': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'Contratos': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  'Financeiro': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  'RH': 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  'Comercial': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

export default function Tutoriais() {
  const navigate = useNavigate();
  const {
    completedCount,
    isTutorialCompleted,
    isTutorialDismissed,
    dismissTutorial,
    dismissAllTutorials,
    restoreDismissedTutorials,
    dismissedTutorials,
    startTour,
    reopenChecklist,
    resetProgress,
  } = useOnboarding();

  const isAllDismissed = dismissedTutorials.includes('__all__');
  const visibleTutorials = isAllDismissed
    ? []
    : tutorials.filter(t => !isTutorialDismissed(t.id));
  const totalTutorials = tutorials.length;
  const progressValue = totalTutorials > 0 ? (completedCount / totalTutorials) * 100 : 0;
  const areas = [...new Set(visibleTutorials.map(t => t.area))];
  const hasDismissed = dismissedTutorials.length > 0;

  const handleStartTour = (tutorial: typeof tutorials[0]) => {
    navigate(tutorial.route);
    setTimeout(() => startTour(tutorial), 500);
  };

  return (
    <div className="space-y-6">
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
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => {
            const link = document.createElement('a');
            link.href = tutorialPdfUrl;
            link.download = 'Tutorial_Sistema_Completo.pdf';
            link.rel = 'noopener';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}>
            <Download className="w-4 h-4 mr-1.5" />
            Baixar PDF
          </Button>
          <Button variant="outline" size="sm" onClick={reopenChecklist}>
            <ListChecks className="w-4 h-4 mr-1.5" />
            Checklist
          </Button>
          {hasDismissed && (
            <Button variant="outline" size="sm" onClick={restoreDismissedTutorials}>
              <Eye className="w-4 h-4 mr-1.5" />
              Restaurar ocultos
            </Button>
          )}
          {!isAllDismissed && visibleTutorials.length > 0 && (
            <Button variant="outline" size="sm" onClick={dismissAllTutorials} className="text-muted-foreground">
              <EyeOff className="w-4 h-4 mr-1.5" />
              Não preciso mais disso
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={resetProgress} className="text-muted-foreground">
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Resetar tudo
          </Button>
        </div>
      </div>

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

      {isAllDismissed && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <EyeOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Tutoriais ocultos</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Você optou por não ver mais os tutoriais. Clique abaixo para restaurá-los caso precise.
            </p>
            <Button onClick={restoreDismissedTutorials}>
              <Eye className="w-4 h-4 mr-1.5" />
              Restaurar todos os tutoriais
            </Button>
          </CardContent>
        </Card>
      )}

      {areas.map(area => (
        <div key={area}>
          <h2 className="text-lg font-semibold text-foreground mb-3">{area}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleTutorials
              .filter(t => t.area === area)
              .map(tutorial => {
                const Icon = iconMap[tutorial.icon] || FileText;
                const completed = isTutorialCompleted(tutorial.id);
                return (
                  <Card
                    key={tutorial.id}
                    className={`group relative cursor-pointer transition-all hover:shadow-md ${
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
                            {completed && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
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
                      {/* Dismiss individual */}
                      <button
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted"
                        title="Não mostrar mais este tutorial"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissTutorial(tutorial.id);
                        }}
                      >
                        <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
