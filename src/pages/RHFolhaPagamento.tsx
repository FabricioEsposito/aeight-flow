import React from 'react';
import { FolhaPagamentoTab } from '@/components/rh/FolhaPagamentoTab';

export default function RHFolhaPagamento() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Folha de Pagamento</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie a folha de pagamento dos colaboradores
        </p>
      </div>
      <FolhaPagamentoTab />
    </div>
  );
}
