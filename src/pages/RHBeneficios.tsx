import React from 'react';
import { BeneficiosTab } from '@/components/rh/BeneficiosTab';

export default function RHBeneficios() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Benefícios</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie os benefícios dos colaboradores
        </p>
      </div>
      <BeneficiosTab />
    </div>
  );
}
