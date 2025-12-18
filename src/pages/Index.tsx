import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { useUserRole } from "@/hooks/useUserRole";

const Index = () => {
  const navigate = useNavigate();
  const { role, loading, isCommercialManager, isSalesperson } = useUserRole();

  useEffect(() => {
    if (!loading && (isCommercialManager || isSalesperson)) {
      navigate("/dashboard-comercial", { replace: true });
    }
  }, [loading, isCommercialManager, isSalesperson, navigate]);

  // Show loading while checking role
  if (loading || isCommercialManager || isSalesperson) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <Dashboard />;
};

export default Index;
