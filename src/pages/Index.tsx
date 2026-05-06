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
  const { role, loading, isCommercialManager, isSalesperson, isContador, isRHManager, isRHAnalyst, isPrestador, isFuncionario } = useUserRole();

  useEffect(() => {
    if (loading) return;
    if (isCommercialManager || isSalesperson) navigate("/dashboard-comercial", { replace: true });
    else if (isContador) navigate("/area-contador", { replace: true });
    else if (isRHManager || isRHAnalyst) navigate("/rh", { replace: true });
    else if (isPrestador || isFuncionario) navigate("/solicitacoes", { replace: true });
  }, [loading, isCommercialManager, isSalesperson, isContador, isRHManager, isRHAnalyst, isPrestador, isFuncionario, navigate]);

  // Show loading while checking role
  if (loading || isCommercialManager || isSalesperson || isContador || isRHManager || isRHAnalyst || isPrestador || isFuncionario) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <Dashboard />;
};

export default Index;
