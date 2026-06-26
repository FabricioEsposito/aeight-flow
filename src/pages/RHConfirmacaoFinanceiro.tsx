import React from 'react';
import { AprovacaoFolhaPanel } from '@/components/rh/AprovacaoFolhaPanel';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';

export default function RHConfirmacaoFinanceiro() {
  const { isAdmin, isFinanceManager, loading } = useUserRole();

  if (loading) return null;

  if (!isAdmin && !isFinanceManager) {
    return <Navigate to="/rh" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Aprovações Folha</h1>
        <p className="text-muted-foreground mt-1">
          Aprove ou rejeite as solicitações de folha enviadas pela Analista de RH. Ao aprovar, o extrato é atualizado automaticamente.
        </p>
      </div>
      <AprovacaoFolhaPanel />
    </div>
  );
}
