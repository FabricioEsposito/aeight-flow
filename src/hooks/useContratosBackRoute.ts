import { useUserRole } from '@/hooks/useUserRole';

/**
 * Usuários de RH (analista/gerente) não têm acesso à área geral de Contratos.
 * Ao voltar/salvar, devem retornar para /rh/contratos.
 */
export function useContratosBackRoute() {
  const { isRHManager, isRHAnalyst } = useUserRole();
  return isRHManager || isRHAnalyst ? '/rh/contratos' : '/contratos';
}
