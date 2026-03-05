import React, { useState } from 'react';
import { AprovacaoRHPanel } from '@/components/rh/AprovacaoRHPanel';
import { ConfirmacaoFinanceiroRHDialog } from '@/components/rh/ConfirmacaoFinanceiroRHDialog';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';

export default function RHConfirmacaoFinanceiro() {
  const { isAdmin, isFinanceManager, loading } = useUserRole();
  const [confirmacaoDialogOpen, setConfirmacaoDialogOpen] = useState(false);
  const [confirmacaoSolicitacaoId, setConfirmacaoSolicitacaoId] = useState<string | null>(null);

  if (loading) return null;

  if (!isAdmin && !isFinanceManager) {
    return <Navigate to="/rh" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Confirmação Financeiro</h1>
        <p className="text-muted-foreground mt-1">
          Confirme as solicitações de RH aprovadas
        </p>
      </div>
      <AprovacaoRHPanel />
      <ConfirmacaoFinanceiroRHDialog
        open={confirmacaoDialogOpen}
        onOpenChange={setConfirmacaoDialogOpen}
        solicitacaoId={confirmacaoSolicitacaoId}
        onSuccess={() => {
          setConfirmacaoDialogOpen(false);
          setConfirmacaoSolicitacaoId(null);
        }}
      />
    </div>
  );
}
