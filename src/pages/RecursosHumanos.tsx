import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolhaPagamentoTab } from '@/components/rh/FolhaPagamentoTab';
import { BeneficiosTab } from '@/components/rh/BeneficiosTab';
import { RHDashboard } from '@/components/rh/RHDashboard';
import { AprovacaoRHPanel } from '@/components/rh/AprovacaoRHPanel';
import { ConfirmacaoFinanceiroRHDialog } from '@/components/rh/ConfirmacaoFinanceiroRHDialog';
import { useSessionState } from '@/hooks/useSessionState';
import { useUserRole } from '@/hooks/useUserRole';

export default function RecursosHumanos() {
  const [activeTab, setActiveTab] = useSessionState<string>('rh', 'activeTab', 'dashboard');
  const { permissions, isAdmin, isFinanceManager } = useUserRole();
  const [confirmacaoDialogOpen, setConfirmacaoDialogOpen] = useState(false);
  const [confirmacaoSolicitacaoId, setConfirmacaoSolicitacaoId] = useState<string | null>(null);

  const showAprovacaoTab = permissions.canApproveRH;
  const showConfirmacaoTab = isAdmin || isFinanceManager;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Recursos Humanos</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie folha de pagamento e benefícios
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="folha">Folha de Pagamento</TabsTrigger>
          <TabsTrigger value="beneficios">Benefícios</TabsTrigger>
          {showAprovacaoTab && <TabsTrigger value="aprovacoes">Aprovações RH</TabsTrigger>}
          {showConfirmacaoTab && <TabsTrigger value="confirmacao">Confirmação Financeiro</TabsTrigger>}
        </TabsList>

        <TabsContent value="dashboard">
          <RHDashboard />
        </TabsContent>

        <TabsContent value="folha">
          <FolhaPagamentoTab />
        </TabsContent>

        <TabsContent value="beneficios">
          <BeneficiosTab />
        </TabsContent>

        {showAprovacaoTab && (
          <TabsContent value="aprovacoes">
            <AprovacaoRHPanel />
          </TabsContent>
        )}

        {showConfirmacaoTab && (
          <TabsContent value="confirmacao">
            <AprovacaoRHPanel />
          </TabsContent>
        )}
      </Tabs>

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
