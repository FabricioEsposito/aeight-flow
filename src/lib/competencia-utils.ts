/**
 * Folha de pagamento: a competência é sempre o mês anterior à data de pagamento/vencimento.
 * Ex: pagamento em jun/2026 → competência mai/2026; pagamento em jan/2026 → competência dez/2025.
 */
export function getCompetenciaFolha(vencDate: Date): { mes: number; ano: number; label: string } {
  const d = new Date(vencDate.getFullYear(), vencDate.getMonth() - 1, 1);
  const mes = d.getMonth() + 1;
  const ano = d.getFullYear();
  return { mes, ano, label: `${String(mes).padStart(2, '0')}/${ano}` };
}
