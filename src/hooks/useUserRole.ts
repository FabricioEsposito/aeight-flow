import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'user' | 'finance_manager' | 'finance_analyst' | 'commercial_manager' | 'salesperson' | 'rh_manager' | 'rh_analyst' | 'contador';

export interface RolePermissions {
  // Navigation access
  canAccessDashboard: boolean;
  canAccessCadastro: boolean;
  canAccessComercial: boolean;
  canAccessFinanceiro: boolean;
  canAccessRH: boolean;
  canAccessUsuarios: boolean;
  canAccessSolicitacoes: boolean;
  canAccessContador: boolean;
  
  // Edit permissions
  canEditFinanceiro: boolean;
  canEditComercial: boolean;
  canEditCadastro: boolean;
  
  // Financial operations
  canPerformBaixas: boolean;
  
  // Approval permissions
  canApproveFinanceiroRequests: boolean;
  canApproveCommissions: boolean;
  canApproveRH: boolean;
  
  // RH specific
  needsApprovalForRH: boolean;
  canSendHoleriteOnlyWhenPaid: boolean;
  
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
  rh_manager: 'Gerente de RH',
  rh_analyst: 'Analista de RH',
  contador: 'Contador',
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
      canAccessRH: false,
      canAccessUsuarios: false,
      canAccessSolicitacoes: false,
      canAccessContador: false,
      canEditFinanceiro: false,
      canEditComercial: false,
      canEditCadastro: false,
      canPerformBaixas: false,
      canApproveFinanceiroRequests: false,
      canApproveCommissions: false,
      canApproveRH: false,
      needsApprovalForRH: false,
      canSendHoleriteOnlyWhenPaid: false,
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
          canAccessRH: true,
          canAccessUsuarios: true,
          canAccessSolicitacoes: true,
          canAccessContador: true,
          canEditFinanceiro: true,
          canEditComercial: true,
          canEditCadastro: true,
          canPerformBaixas: true,
          canApproveFinanceiroRequests: true,
          canApproveCommissions: true,
          canApproveRH: true,
          needsApprovalForRH: false,
          canSendHoleriteOnlyWhenPaid: false,
          needsApprovalForFinanceiroEdits: false,
        };
      
      case 'finance_manager':
        return {
          canAccessDashboard: true,
          canAccessCadastro: true,
          canAccessComercial: true,
          canAccessFinanceiro: true,
          canAccessRH: true,
          canAccessUsuarios: false,
          canAccessSolicitacoes: true,
          canAccessContador: true,
          canEditFinanceiro: true,
          canEditComercial: true,
          canEditCadastro: true,
          canPerformBaixas: true,
          canApproveFinanceiroRequests: true,
          canApproveCommissions: true,
          canApproveRH: false,
          needsApprovalForRH: false,
          canSendHoleriteOnlyWhenPaid: false,
          needsApprovalForFinanceiroEdits: false,
        };
      
      case 'finance_analyst':
        return {
          canAccessDashboard: true,
          canAccessCadastro: true,
          canAccessComercial: false,
          canAccessFinanceiro: true,
          canAccessRH: true,
          canAccessUsuarios: false,
          canAccessSolicitacoes: true,
          canAccessContador: false,
          canEditFinanceiro: false,
          canEditComercial: false,
          canEditCadastro: false,
          canPerformBaixas: true,
          canApproveFinanceiroRequests: false,
          canApproveCommissions: false,
          canApproveRH: false,
          needsApprovalForRH: false,
          canSendHoleriteOnlyWhenPaid: false,
          needsApprovalForFinanceiroEdits: true,
        };
      
      case 'commercial_manager':
        return {
          canAccessDashboard: false,
          canAccessCadastro: false,
          canAccessComercial: true,
          canAccessFinanceiro: false,
          canAccessRH: false,
          canAccessUsuarios: false,
          canAccessSolicitacoes: false,
          canAccessContador: false,
          canEditFinanceiro: false,
          canEditComercial: true,
          canEditCadastro: false,
          canPerformBaixas: false,
          canApproveFinanceiroRequests: false,
          canApproveCommissions: false,
          canApproveRH: false,
          needsApprovalForRH: false,
          canSendHoleriteOnlyWhenPaid: false,
          needsApprovalForFinanceiroEdits: false,
        };
      
      case 'salesperson':
        return {
          canAccessDashboard: false,
          canAccessCadastro: false,
          canAccessComercial: true,
          canAccessFinanceiro: false,
          canAccessRH: false,
          canAccessUsuarios: false,
          canAccessSolicitacoes: false,
          canAccessContador: false,
          canEditFinanceiro: false,
          canEditComercial: false,
          canEditCadastro: false,
          canPerformBaixas: false,
          canApproveFinanceiroRequests: false,
          canApproveCommissions: false,
          canApproveRH: false,
          needsApprovalForRH: false,
          canSendHoleriteOnlyWhenPaid: false,
          needsApprovalForFinanceiroEdits: false,
        };
      
      case 'rh_manager':
        return {
          canAccessDashboard: false,
          canAccessCadastro: false,
          canAccessComercial: false,
          canAccessFinanceiro: false,
          canAccessRH: true,
          canAccessUsuarios: false,
          canAccessSolicitacoes: false,
          canAccessContador: false,
          canEditFinanceiro: false,
          canEditComercial: false,
          canEditCadastro: false,
          canPerformBaixas: false,
          canApproveFinanceiroRequests: false,
          canApproveCommissions: false,
          canApproveRH: true,
          needsApprovalForRH: false,
          canSendHoleriteOnlyWhenPaid: false,
          needsApprovalForFinanceiroEdits: false,
        };
      
      case 'rh_analyst':
        return {
          canAccessDashboard: false,
          canAccessCadastro: false,
          canAccessComercial: false,
          canAccessFinanceiro: false,
          canAccessRH: true,
          canAccessUsuarios: false,
          canAccessSolicitacoes: false,
          canAccessContador: false,
          canEditFinanceiro: false,
          canEditComercial: false,
          canEditCadastro: false,
          canPerformBaixas: false,
          canApproveFinanceiroRequests: false,
          canApproveCommissions: false,
          canApproveRH: false,
          needsApprovalForRH: true,
          canSendHoleriteOnlyWhenPaid: true,
          needsApprovalForFinanceiroEdits: false,
        };
      
      case 'contador':
        return {
          canAccessDashboard: false,
          canAccessCadastro: false,
          canAccessComercial: false,
          canAccessFinanceiro: false,
          canAccessRH: false,
          canAccessUsuarios: false,
          canAccessSolicitacoes: false,
          canAccessContador: true,
          canEditFinanceiro: false,
          canEditComercial: false,
          canEditCadastro: false,
          canPerformBaixas: false,
          canApproveFinanceiroRequests: false,
          canApproveCommissions: false,
          canApproveRH: false,
          needsApprovalForRH: false,
          canSendHoleriteOnlyWhenPaid: false,
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
  const isRHManager = role === 'rh_manager';
  const isRHAnalyst = role === 'rh_analyst';
  const isContador = role === 'contador';

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
    isRHManager,
    isRHAnalyst,
    isContador,
    permissions,
    getRoleLabel,
    roleLabels,
  };
}
