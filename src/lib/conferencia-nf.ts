import { grossDifference } from '../../supabase/functions/conferir-nf/audit-utils';

export interface ConferenciaNF {
  conta_receber_id: string;
  link_nf: string;
  valor_bruto_pdf: number | null;
  status: string;
  motivo: string | null;
  evidencia: string | null;
  updated_at: string;
}

export const conferenciaLabels: Record<string, string> = {
  pendente: 'Não conferida', confere: 'Confere', divergente: 'Divergência', revisao: 'Revisão manual', erro: 'Falha na leitura',
};

export function resultadoConferencia(bruto: number, link: string | null, audit?: ConferenciaNF) {
  if (!audit || audit.link_nf !== link) return { status: 'pendente', diferenca: null };
  if (audit.status !== 'extraido' || audit.valor_bruto_pdf == null) return { status: 'revisao', diferenca: null };
  const result = grossDifference(bruto, Number(audit.valor_bruto_pdf));
  return { status: result.divergente ? 'divergente' : 'confere', diferenca: result.diferenca };
}