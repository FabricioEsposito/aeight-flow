import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'user' | 'finance_manager' | 'finance_analyst' | 'commercial_manager' | 'salesperson';

export interface RolePermissions {
  // Navigation access
  canAccessDashboard: boolean;
  canAccessCadastro: boolean;
  canAccessComercial: boolean;
  canAccessFinanceiro: boolean;
  canAccessUsuarios: boolean;
  canAccessSolicitacoes: boolean;
  
  // Edit permissions
  canEditFinanceiro: boolean;
  canEditComercial: boolean;
  canEditCadastro: boolean;
  
  // Financial operations
  canPerformBaixas: boolean; // Permite realizar baixas (total/parcial) sem aprovação
  
  // Approval permissions
  canApproveFinanceiroRequests: boolean;
  canApproveCommissions: boolean;
  
  // Needs approval for edits
  needsApprovalForFinanceiroEdits: boolean;
}

const roleLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  user: 'Usuário Básico',
  finance_manager: 'Gerente de Finanças',
  finance_analyst: 'Analista Financeiro',
  commercial_manager: 'Gerente Comercial',
  salesperson: 'Vendedor',
};

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkRole();
    } else {
      setRole(null);
      setLoading(false);
    }
  }, [user]);

  const checkRole = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setRole((data?.role as AppRole) || 'user');
    } catch (error) {
      console.error('Error checking user role:', error);
      setRole('user');
    } finally {
      setLoading(false);
    }
  };

  const permissions = useMemo((): RolePermissions => {
    const defaultPermissions: RolePermissions = {
      canAccessDashboard: false,
      canAccessCadastro: false,
      canAccessComercial: false,
      canAccessFinanceiro: false,
      canAccessUsuarios: false,
      canAccessSolicitacoes: false,
      canEditFinanceiro: false,
      canEditComercial: false,
      canEditCadastro: false,
      canPerformBaixas: false,
      canApproveFinanceiroRequests: false,
      canApproveCommissions: false,
      needsApprovalForFinanceiroEdits: false,
    };

    if (!role) return defaultPermissions;

    switch (role) {
      case 'admin':
        return {
          canAccessDashboard: true,
          canAccessCadastro: true,
          canAccessComercial: true,
          canAccessFinanceiro: true,
          canAccessUsuarios: true,
          canAccessSolicitacoes: true,
          canEditFinanceiro: true,
          canEditComercial: true,
          canEditCadastro: true,
          canPerformBaixas: true,
          canApproveFinanceiroRequests: true,
          canApproveCommissions: true,
          needsApprovalForFinanceiroEdits: false,
        };
      
      case 'finance_manager':
        return {
          canAccessDashboard: true,
          canAccessCadastro: true,
          canAccessComercial: true,
          canAccessFinanceiro: true,
          canAccessUsuarios: false,
          canAccessSolicitacoes: true,
          canEditFinanceiro: true,
          canEditComercial: true,
          canEditCadastro: true,
          canPerformBaixas: true,
          canApproveFinanceiroRequests: true,
          canApproveCommissions: true,
          needsApprovalForFinanceiroEdits: false,
        };
      
      case 'finance_analyst':
        return {
          canAccessDashboard: true,
          canAccessCadastro: true,
          canAccessComercial: false,
          canAccessFinanceiro: true,
          canAccessUsuarios: false,
          canAccessSolicitacoes: true,
          canEditFinanceiro: false, // needs approval for general edits
          canEditComercial: false,
          canEditCadastro: false, // RLS não permite UPDATE em cadastros
          canPerformBaixas: true, // PODE realizar baixas total/parcial
          canApproveFinanceiroRequests: false,
          canApproveCommissions: false,
          needsApprovalForFinanceiroEdits: true,
        };
      
      case 'commercial_manager':
        return {
          canAccessDashboard: false,
          canAccessCadastro: false,
          canAccessComercial: true,
          canAccessFinanceiro: false,
          canAccessUsuarios: false,
          canAccessSolicitacoes: false,
          canEditFinanceiro: false,
          canEditComercial: true,
          canEditCadastro: false,
          canPerformBaixas: false,
          canApproveFinanceiroRequests: false,
          canApproveCommissions: true,
          needsApprovalForFinanceiroEdits: false,
        };
      
      case 'salesperson':
        return {
          canAccessDashboard: false,
          canAccessCadastro: false,
          canAccessComercial: true, // only dashboard and commission
          canAccessFinanceiro: false,
          canAccessUsuarios: false,
          canAccessSolicitacoes: false,
          canEditFinanceiro: false,
          canEditComercial: false, // can only request
          canEditCadastro: false,
          canPerformBaixas: false,
          canApproveFinanceiroRequests: false,
          canApproveCommissions: false,
          needsApprovalForFinanceiroEdits: false,
        };
      
      case 'user':
      default:
        return defaultPermissions;
    }
  }, [role]);

  const isAdmin = role === 'admin';
  const isFinanceManager = role === 'finance_manager';
  const isFinanceAnalyst = role === 'finance_analyst';
  const isCommercialManager = role === 'commercial_manager';
  const isSalesperson = role === 'salesperson';

  const getRoleLabel = (r?: AppRole | null): string => {
    return roleLabels[r || 'user'] || 'Usuário Básico';
  };

  return { 
    role, 
    loading, 
    isAdmin,
    isFinanceManager,
    isFinanceAnalyst,
    isCommercialManager,
    isSalesperson,
    permissions,
    getRoleLabel,
    roleLabels,
  };
}
