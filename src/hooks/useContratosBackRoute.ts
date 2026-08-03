import { useUserRole } from '@/hooks/useUserRole';
import { useLocation } from 'react-router-dom';

/**
 * Usuários de RH (analista/gerente) não têm acesso à área geral de Contratos.
 * Ao voltar/salvar, devem retornar para /rh/contratos.
 */
export function useContratosBackRoute() {
  const { isRHManager, isRHAnalyst } = useUserRole();
  const location = useLocation();
  const veioDoRH = new URLSearchParams(location.search).get('rh') === '1';

  return veioDoRH || isRHManager || isRHAnalyst ? '/rh/contratos' : '/contratos';
}
