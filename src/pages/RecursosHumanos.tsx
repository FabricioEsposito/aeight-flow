import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolhaPagamentoTab } from '@/components/rh/FolhaPagamentoTab';
import { BeneficiosTab } from '@/components/rh/BeneficiosTab';
import { RHDashboard } from '@/components/rh/RHDashboard';
import { AprovacaoFolhaPanel } from '@/components/rh/AprovacaoFolhaPanel';
import { useSessionState } from '@/hooks/useSessionState';
import { useUserRole } from '@/hooks/useUserRole';
import { useContextualTutorial } from '@/hooks/useContextualTutorial';

export default function RecursosHumanos() {
  useContextualTutorial('rh');
  const [activeTab, setActiveTab] = useSessionState<string>('rh', 'activeTab', 'dashboard');
  const { isAdmin, isFinanceManager, isRHManager } = useUserRole();

  const showAprovacaoTab = isAdmin || isFinanceManager || isRHManager;

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
          {showAprovacaoTab && <TabsTrigger value="aprovacoes">Aprovações Folha</TabsTrigger>}
        </TabsList>

        <TabsContent value="dashboard"><RHDashboard /></TabsContent>
        <TabsContent value="folha"><FolhaPagamentoTab /></TabsContent>
        <TabsContent value="beneficios"><BeneficiosTab /></TabsContent>
        {showAprovacaoTab && (
          <TabsContent value="aprovacoes"><AprovacaoFolhaPanel /></TabsContent>
        )}
      </Tabs>
    </div>
  );
}
