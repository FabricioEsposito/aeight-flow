import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUserRole } from '@/hooks/useUserRole';
import { ShieldAlert, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const { role, loading: roleLoading, permissions } = useUserRole();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user has no permissions (basic user without assigned role)
  const hasNoAccess = role === 'user' || (
    !permissions.canAccessDashboard &&
    !permissions.canAccessCadastro &&
    !permissions.canAccessComercial &&
    !permissions.canAccessFinanceiro &&
    !permissions.canAccessUsuarios &&
    !permissions.canAccessSolicitacoes
  );

  if (hasNoAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <ShieldAlert className="h-10 w-10 text-amber-600 dark:text-amber-400" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Acesso Pendente
            </h1>
            <p className="text-muted-foreground">
              Sua conta foi criada com sucesso, mas você ainda não possui permissões de acesso ao sistema.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p>
              Por favor, aguarde o administrador atribuir as permissões necessárias à sua conta.
            </p>
          </div>

          <div className="pt-4">
            <Button 
              variant="outline" 
              onClick={() => signOut()}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Usuário: {user.email}
          </p>
        </div>
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
