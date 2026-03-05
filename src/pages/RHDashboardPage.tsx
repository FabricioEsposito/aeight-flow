import React from 'react';
import { RHDashboard } from '@/components/rh/RHDashboard';

export default function RHDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard RH</h1>
        <p className="text-muted-foreground mt-1">
          Visão geral de folha de pagamento e benefícios
        </p>
      </div>
      <RHDashboard />
    </div>
  );
}
