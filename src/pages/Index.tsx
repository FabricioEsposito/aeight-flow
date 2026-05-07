import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { useUserRole } from "@/hooks/useUserRole";
import { useClearFiltersOnAreaChange } from "@/hooks/useSessionState";
import { useContextualTutorial } from "@/hooks/useContextualTutorial";

const Index = () => {
  useContextualTutorial('dashboard');
  useClearFiltersOnAreaChange('dashboard');
  const navigate = useNavigate();
  const { role, loading, permissions, isCommercialManager, isSalesperson, isContador, isRHManager, isRHAnalyst, isPrestador, isFuncionario, isLiderArea } = useUserRole();

  useEffect(() => {
    if (loading) return;
    // Se tem permissão de dashboard, fica aqui (independe do regime de contrato)
    if (permissions.canAccessDashboard) return;
    if (isCommercialManager || isSalesperson) navigate("/dashboard-comercial", { replace: true });
    else if (isContador) navigate("/area-contador", { replace: true });
    else if (isRHManager || isRHAnalyst) navigate("/rh", { replace: true });
    else if (isPrestador || isFuncionario || isLiderArea) navigate("/solicitacoes", { replace: true });
    else if (permissions.canAccessSolicitacoes) navigate("/solicitacoes", { replace: true });
    else if (permissions.canAccessUsuarios) navigate("/usuarios", { replace: true });
  }, [loading, permissions, isCommercialManager, isSalesperson, isContador, isRHManager, isRHAnalyst, isPrestador, isFuncionario, isLiderArea, navigate]);

  if (loading || (!permissions.canAccessDashboard)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <Dashboard />;
};

export default Index;
