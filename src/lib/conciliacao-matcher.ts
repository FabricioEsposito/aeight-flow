/**
 * Algoritmo de matching para conciliação bancária.
 * Calcula um score (0-100) entre uma transação do extrato e candidatos
 * pendentes (contas_receber/contas_pagar).
 */

import type { OfxTransaction } from './ofx-parser';

export interface CandidateLancamento {
  id: string;
  origem: 'receber' | 'pagar';
  valor: number;
  data_vencimento: string; // YYYY-MM-DD
  descricao: string;
  cliente_fornecedor_nome?: string;
  cliente_fornecedor_doc?: string; // CNPJ/CPF
  parcela_id?: string | null;
  numero_contrato?: string;
}

export interface MatchResult {
  candidate: CandidateLancamento;
  score: number;
}

export type MatchClassification = 'match' | 'sugerido' | 'sem-match';

export interface TransacaoComMatches {
  transacao: OfxTransaction;
  index: number;
  matches: MatchResult[];
  classification: MatchClassification;
  selectedCandidateId?: string;
  ignored?: boolean;
  createdLancamentoId?: { id: string; origem: 'receber' | 'pagar' };
}

function diffDays(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00').getTime();
  const db = new Date(b + 'T00:00:00').getTime();
  return Math.abs(Math.round((da - db) / (1000 * 60 * 60 * 24)));
}

function normalize(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function calcularScore(t: OfxTransaction, c: CandidateLancamento): number {
  // Tipo precisa bater
  const tipoEsperado = t.tipo === 'entrada' ? 'receber' : 'pagar';
  if (c.origem !== tipoEsperado) return 0;

  let score = 0;

  // Valor
  const diffValor = Math.abs(t.valor - Number(c.valor));
  if (diffValor <= 0.01) score += 60;
  else if (diffValor <= 1.0) score += 40;
  else if (diffValor <= 5.0) score += 15;

  // Data
  const dd = diffDays(t.data_movimento, c.data_vencimento);
  if (dd <= 1) score += 30;
  else if (dd <= 7) score += 20;
  else if (dd <= 15) score += 5;

  // Descrição contém nome ou CNPJ
  const descNorm = normalize(t.descricao);
  if (descNorm) {
    const nomeNorm = normalize(c.cliente_fornecedor_nome || '');
    if (nomeNorm) {
      const partes = nomeNorm.split(/\s+/).filter(p => p.length >= 4);
      if (partes.some(p => descNorm.includes(p))) score += 15;
    }
    const docDigits = (c.cliente_fornecedor_doc || '').replace(/\D/g, '');
    if (docDigits.length >= 4 && t.descricao.replace(/\D/g, '').includes(docDigits)) {
      score += 15;
    }
  }

  return Math.min(score, 100);
}

export function matchTransacoes(
  transacoes: OfxTransaction[],
  candidates: CandidateLancamento[],
): TransacaoComMatches[] {
  const usados = new Set<string>();

  // Primeira passada: marcar matches com score >= 80 e candidato único, consumindo candidatos
  const intermediario = transacoes.map((t, index) => {
    const scored = candidates
      .filter(c => !usados.has(c.id))
      .map(c => ({ candidate: c, score: calcularScore(t, c) }))
      .filter(m => m.score >= 50)
      .sort((a, b) => b.score - a.score);

    return { transacao: t, index, matches: scored };
  });

  // Reservar matches "match único" (apenas 1 com score >= 80) primeiro
  for (const item of intermediario) {
    const top80 = item.matches.filter(m => m.score >= 80);
    if (top80.length === 1) {
      usados.add(top80[0].candidate.id);
    }
  }

  // Segunda passada: classificar baseado em candidatos disponíveis
  const result: TransacaoComMatches[] = intermediario.map(item => {
    const matchesDisponiveis = item.matches.filter(
      m => !usados.has(m.candidate.id) || (item.matches.find(x => x.score >= 80 && x.candidate.id === m.candidate.id) && item.matches.filter(x => x.score >= 80).length === 1),
    );

    let classification: MatchClassification;
    let selectedCandidateId: string | undefined;

    const top80 = matchesDisponiveis.filter(m => m.score >= 80);
    if (top80.length === 1) {
      classification = 'match';
      selectedCandidateId = top80[0].candidate.id;
    } else if (matchesDisponiveis.length > 0) {
      classification = 'sugerido';
    } else {
      classification = 'sem-match';
    }

    return {
      transacao: item.transacao,
      index: item.index,
      matches: matchesDisponiveis.slice(0, 5),
      classification,
      selectedCandidateId,
    };
  });

  return result;
}
