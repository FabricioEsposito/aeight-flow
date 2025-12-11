import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock } from "lucide-react";

interface SessionTimeoutDialogProps {
  open: boolean;
  remainingTime: number;
  onRenew: () => void;
  onLogout: () => void;
}

export function SessionTimeoutDialog({
  open,
  remainingTime,
  onRenew,
  onLogout
}: SessionTimeoutDialogProps) {
  const minutes = Math.floor(remainingTime / 60000);
  const seconds = Math.floor((remainingTime % 60000) / 1000);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
            </div>
            <div>
              <AlertDialogTitle>Sessão expirando</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                Sua sessão será encerrada em breve por inatividade.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="py-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-foreground tabular-nums">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Tempo restante
            </p>
          </div>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onLogout} className="w-full sm:w-auto">
            Sair agora
          </AlertDialogCancel>
          <AlertDialogAction onClick={onRenew} className="w-full sm:w-auto">
            Continuar sessão
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
