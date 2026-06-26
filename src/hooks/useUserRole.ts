import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'user' | 'finance_manager' | 'finance_analyst' | 'commercial_manager' | 'salesperson' | 'rh_manager' | 'rh_analyst' | 'contador' | 'prestador_servico' | 'funcionario' | 'lider_area';

export type RegimeContrato = 'prestador_servico' | 'funcionario';

export interface RolePermissions {
  canAccessDashboard: boolean;
  canAccessCadastro: boolean;
  canAccessComercial: boolean;
  canAccessFinanceiro: boolean;
  canAccessRH: boolean;
  canAccessUsuarios: boolean;
  canAccessSolicitacoes: boolean;
  canAccessContador: boolean;
  canAccessPortal: boolean;
  canEditFinanceiro: boolean;
  canEditComercial: boolean;
  canEditCadastro: boolean;
  canPerformBaixas: boolean;
  canApproveFinanceiroRequests: boolean;
  canApproveCommissions: boolean;
  canApproveRH: boolean;
  canApproveReembolsoFinanceiro: boolean;
  canApproveLider: boolean;
  canApproveVinculoUsuario: boolean;
  needsApprovalForRH: boolean;
  canSendHoleriteOnlyWhenPaid: boolean;
  canSendNFPrestador: boolean;
  canSendReembolso: boolean;
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
  prestador_servico: 'Prestador de Serviço',
  funcionario: 'Funcionário',
  lider_area: 'Líder de Área',
};

const defaultPermissions: RolePermissions = {
  canAccessDashboard: false,
  canAccessCadastro: false,
  canAccessComercial: false,
  canAccessFinanceiro: false,
  canAccessRH: false,
  canAccessUsuarios: false,
  canAccessSolicitacoes: false,
  canAccessContador: false,
  canAccessPortal: false,
  canEditFinanceiro: false,
  canEditComercial: false,
  canEditCadastro: false,
  canPerformBaixas: false,
  canApproveFinanceiroRequests: false,
  canApproveCommissions: false,
  canApproveRH: false,
  canApproveReembolsoFinanceiro: false,
  canApproveLider: false,
  canApproveVinculoUsuario: false,
  needsApprovalForRH: false,
  canSendHoleriteOnlyWhenPaid: false,
  canSendNFPrestador: false,
  canSendReembolso: false,
  needsApprovalForFinanceiroEdits: false,
};

const rolePermissionsMap: Record<AppRole, Partial<RolePermissions>> = {
  admin: {
    canAccessDashboard: true, canAccessCadastro: true, canAccessComercial: true,
    canAccessFinanceiro: true, canAccessRH: true, canAccessUsuarios: true,
    canAccessSolicitacoes: true, canAccessContador: true, canAccessPortal: true,
    canEditFinanceiro: true, canEditComercial: true, canEditCadastro: true,
    canPerformBaixas: true, canApproveFinanceiroRequests: true,
    canApproveCommissions: true, canApproveRH: true,
    canApproveReembolsoFinanceiro: true, canApproveVinculoUsuario: true,
    canApproveLider: true,
  },
  finance_manager: {
    canAccessDashboard: true, canAccessCadastro: true, canAccessComercial: true,
    canAccessFinanceiro: true, canAccessSolicitacoes: true,
    canAccessContador: true, canEditFinanceiro: true, canEditComercial: true,
    canEditCadastro: true, canPerformBaixas: true,
    canApproveFinanceiroRequests: true, canApproveCommissions: true,
    canApproveReembolsoFinanceiro: true,
  },
  finance_analyst: {
    canAccessDashboard: true, canAccessCadastro: true, canAccessFinanceiro: true,
    canAccessSolicitacoes: true, canPerformBaixas: true,
    needsApprovalForFinanceiroEdits: true,
  },
  commercial_manager: { canAccessComercial: true, canEditComercial: true },
  salesperson: { canAccessComercial: true },
  rh_manager: { canAccessRH: true },
  rh_analyst: {
    canAccessRH: true, needsApprovalForRH: true, canSendHoleriteOnlyWhenPaid: true,
  },
  contador: { canAccessContador: true },
  // Roles legadas: tratadas como 'user' (mantidas no enum só por compat)
  prestador_servico: {},
  funcionario: {},
  lider_area: {},
  user: {},
};

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [regimeContrato, setRegimeContrato] = useState<RegimeContrato | null>(null);
  const [isLiderAreaFlag, setIsLiderAreaFlag] = useState(false);
  const [fornecedorId, setFornecedorId] = useState<string | null>(null);
  const [grupoId, setGrupoId] = useState<string | null>(null);
  const [lideraGrupoId, setLideraGrupoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkRole();
    } else {
      setRole(null);
      setRegimeContrato(null);
      setIsLiderAreaFlag(false);
      setFornecedorId(null);
      setGrupoId(null);
      setLideraGrupoId(null);
      setLoading(false);
    }
  }, [user]);

  const checkRole = async () => {
    try {
      const [{ data: roleData }, { data: profile }] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user!.id).maybeSingle(),
        supabase.from('profiles').select('regime_contrato, is_lider_area, lidera_grupo_id, fornecedor_id, grupo_id' as any).eq('id', user!.id).maybeSingle(),
      ]);
      setRole((roleData?.role as AppRole) || 'user');
      const p: any = profile || {};
      setRegimeContrato((p.regime_contrato as RegimeContrato) || null);
      setIsLiderAreaFlag(!!p.is_lider_area);
      setFornecedorId(p.fornecedor_id || null);
      setGrupoId(p.grupo_id || null);
      setLideraGrupoId(p.lidera_grupo_id || null);
    } catch (error) {
      console.error('Error checking user role:', error);
      setRole('user');
    } finally {
      setLoading(false);
    }
  };

  const permissions = useMemo((): RolePermissions => {
    if (!role) return defaultPermissions;
    const base = { ...defaultPermissions, ...rolePermissionsMap[role] };
    // Capacidades derivadas do perfil (regime + fornecedor + flag líder)
    const hasVinculo = !!regimeContrato && !!fornecedorId;
    if (hasVinculo) {
      base.canAccessSolicitacoes = true;
      base.canSendReembolso = true;
      if (regimeContrato === 'prestador_servico') base.canSendNFPrestador = true;
    }
    if (isLiderAreaFlag) {
      base.canApproveLider = true;
    }
    return base;
  }, [role, regimeContrato, fornecedorId, isLiderAreaFlag]);

  const isAdmin = role === 'admin';
  const isFinanceManager = role === 'finance_manager';
  const isFinanceAnalyst = role === 'finance_analyst';
  const isCommercialManager = role === 'commercial_manager';
  const isSalesperson = role === 'salesperson';
  const isRHManager = role === 'rh_manager';
  const isRHAnalyst = role === 'rh_analyst';
  const isContador = role === 'contador';
  const isPrestador = regimeContrato === 'prestador_servico';
  const isFuncionario = regimeContrato === 'funcionario';
  const isLiderArea = isLiderAreaFlag;
  const isPortalOnly = false;

  const getRoleLabel = (r?: AppRole | null): string => {
    return roleLabels[r || 'user'] || 'Usuário Básico';
  };

  return {
    role, loading,
    regimeContrato, isLiderAreaFlag, fornecedorId, grupoId, lideraGrupoId,
    isAdmin, isFinanceManager, isFinanceAnalyst,
    isCommercialManager, isSalesperson,
    isRHManager, isRHAnalyst, isContador,
    isPrestador, isFuncionario, isLiderArea, isPortalOnly,
    permissions, getRoleLabel, roleLabels,
  };
}
