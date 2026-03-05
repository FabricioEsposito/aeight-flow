import React from 'react';
import { AprovacaoRHPanel } from '@/components/rh/AprovacaoRHPanel';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';

export default function RHAprovacoes() {
  const { permissions, loading } = useUserRole();

  if (loading) return null;

  if (!permissions.canApproveRH) {
    return <Navigate to="/rh" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Aprovações RH</h1>
        <p className="text-muted-foreground mt-1">
          Revise e aprove solicitações de RH
        </p>
      </div>
      <AprovacaoRHPanel />
    </div>
  );
}
