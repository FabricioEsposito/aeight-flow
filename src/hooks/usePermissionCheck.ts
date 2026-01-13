import { useState, useCallback } from 'react';
import { useUserRole, RolePermissions } from './useUserRole';

type PermissionKey = keyof RolePermissions;

interface PermissionCheckResult {
  showPermissionDenied: boolean;
  setShowPermissionDenied: (show: boolean) => void;
  permissionDeniedMessage: string;
  checkPermission: (permission: PermissionKey, customMessage?: string) => boolean;
  checkPermissionWithAction: <T>(permission: PermissionKey, action: () => T, customMessage?: string) => T | undefined;
}

const permissionMessages: Record<PermissionKey, string> = {
  canAccessDashboard: 'Você não tem permissão para acessar o Dashboard.',
  canAccessCadastro: 'Você não tem permissão para acessar a área de Cadastros.',
  canAccessComercial: 'Você não tem permissão para acessar a área Comercial.',
  canAccessFinanceiro: 'Você não tem permissão para acessar a área Financeira.',
  canAccessUsuarios: 'Você não tem permissão para gerenciar usuários.',
  canAccessSolicitacoes: 'Você não tem permissão para acessar as Solicitações.',
  canEditFinanceiro: 'Você não tem permissão para editar dados financeiros. Entre em contato com o administrador ou gerente financeiro.',
  canEditComercial: 'Você não tem permissão para editar dados comerciais.',
  canEditCadastro: 'Você não tem permissão para editar cadastros.',
  canPerformBaixas: 'Você não tem permissão para realizar baixas de lançamentos. Entre em contato com o administrador ou gerente financeiro.',
  canApproveFinanceiroRequests: 'Você não tem permissão para aprovar solicitações financeiras.',
  canApproveCommissions: 'Você não tem permissão para aprovar comissões.',
  needsApprovalForFinanceiroEdits: 'Esta ação requer aprovação de um administrador ou gerente financeiro.',
};

export function usePermissionCheck(): PermissionCheckResult {
  const { permissions } = useUserRole();
  const [showPermissionDenied, setShowPermissionDenied] = useState(false);
  const [permissionDeniedMessage, setPermissionDeniedMessage] = useState('');

  const checkPermission = useCallback((permission: PermissionKey, customMessage?: string): boolean => {
    const hasPermission = permissions[permission];
    
    if (!hasPermission) {
      setPermissionDeniedMessage(customMessage || permissionMessages[permission] || 'Você não tem permissão para realizar esta ação.');
      setShowPermissionDenied(true);
      return false;
    }
    
    return true;
  }, [permissions]);

  const checkPermissionWithAction = useCallback(<T,>(
    permission: PermissionKey, 
    action: () => T, 
    customMessage?: string
  ): T | undefined => {
    if (checkPermission(permission, customMessage)) {
      return action();
    }
    return undefined;
  }, [checkPermission]);

  return {
    showPermissionDenied,
    setShowPermissionDenied,
    permissionDeniedMessage,
    checkPermission,
    checkPermissionWithAction,
  };
}
