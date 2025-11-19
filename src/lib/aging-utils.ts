export function calcularAging(dataVencimentoOriginal: string | null, dataVencimento: string): number {
  if (!dataVencimentoOriginal) return 0;
  
  const hoje = new Date();
  const vencimento = new Date(dataVencimentoOriginal);
  const diffTime = hoje.getTime() - vencimento.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

export function formatarImportancia(importancia: string | null): string {
  if (!importancia) return '-';
  
  const map: Record<string, string> = {
    'importante': 'Importante',
    'mediano': 'Mediano',
    'nao_importante': 'Não Importante'
  };
  
  return map[importancia] || importancia;
}

export function getImportanciaColor(importancia: string | null): string {
  if (!importancia) return 'bg-gray-500';
  
  const colorMap: Record<string, string> = {
    'importante': 'bg-red-500',
    'mediano': 'bg-yellow-500',
    'nao_importante': 'bg-green-500'
  };
  
  return colorMap[importancia] || 'bg-gray-500';
}

export function getAgingColor(aging: number): string {
  if (aging < 0) return 'text-blue-600'; // A vencer
  if (aging === 0) return 'text-yellow-600'; // Vence hoje
  if (aging <= 7) return 'text-orange-600'; // Até 7 dias
  if (aging <= 30) return 'text-red-600'; // Até 30 dias
  return 'text-red-900'; // Mais de 30 dias
}
