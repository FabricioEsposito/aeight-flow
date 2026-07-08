import React from 'react';
import { ContratosRHTab } from '@/components/rh/ContratosRHTab';

export default function RHContratos() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Contratos RH</h1>
        <p className="text-muted-foreground mt-1">
          Contratos de folha de pagamento e benefícios (visualização)
        </p>
      </div>
      <ContratosRHTab />
    </div>
  );
}
