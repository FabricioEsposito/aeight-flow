import { supabase } from '@/integrations/supabase/client';

export type TipoLancamento = 'pagar' | 'receber';

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDateBR = (d: string) => {
  if (!d) return '';
  // assume YYYY-MM-DD
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
};

export interface RevertBaixaResult {
  success: boolean;
  blocked?: boolean;
  blockedMessage?: string;
  message?: string;
  restoredValor?: number;
}

/**
 * Reverte UMA baixa (LIFO). Bloqueia se houver baixa posterior pendente.
 *
 * Cenários:
 *  - Linha é "residual paga" (criada por uma baixa parcial): devolve o valor à origem (que é a linha em aberto restante).
 *    Bloqueia se existir uma baixa POSTERIOR sobre a mesma origem.
 *  - Linha é "originadora paga em totalidade" (após partials): apenas marca como pendente.
 */
export async function revertBaixa(
  id: string,
  tipo: TipoLancamento,
): Promise<RevertBaixaResult> {
  const table = tipo === 'receber' ? 'contas_receber' : 'contas_pagar';
  const dateField = tipo === 'receber' ? 'data_recebimento' : 'data_pagamento';

  // Esta linha é residual de uma baixa parcial?
  const { data: baixaQueCreou } = await supabase
    .from('historico_baixas')
    .select('*')
    .eq('lancamento_residual_id', id)
    .eq('tipo_lancamento', tipo)
    .maybeSingle();

  if (baixaQueCreou) {
    const originalId = baixaQueCreou.lancamento_id;

    // Existem baixas POSTERIORES (mesma origem, created_at > esta)?
    const { data: baixasPosteriores } = await supabase
      .from('historico_baixas')
      .select('id, data_baixa, created_at, lancamento_residual_id')
      .eq('lancamento_id', originalId)
      .eq('tipo_lancamento', tipo)
      .gt('created_at', baixaQueCreou.created_at)
      .order('created_at', { ascending: false });

    if (baixasPosteriores && baixasPosteriores.length > 0) {
      const proxima = baixasPosteriores[0];
      return {
        success: false,
        blocked: true,
        blockedMessage: `Existe uma baixa posterior em ${formatDateBR(proxima.data_baixa)}. Reverta primeiro a baixa mais recente.`,
      };
    }

    // Pegar valor atual do original e a parcela vinculada
    const { data: lancOriginal } = await supabase
      .from(table)
      .select('valor, parcela_id')
      .eq('id', originalId)
      .maybeSingle();

    // Pegar valor da linha residual (paga) para devolver
    const { data: lancResidual } = await supabase
      .from(table)
      .select('valor')
      .eq('id', id)
      .maybeSingle();

    if (!lancOriginal || !lancResidual) {
      return { success: false, message: 'Lançamento não encontrado.' };
    }

    const valorDevolvido = Number(lancResidual.valor);
    const valorRecomposto = Number(lancOriginal.valor) + valorDevolvido;

    await supabase.from(table).update({ valor: valorRecomposto }).eq('id', originalId);

    if (lancOriginal.parcela_id) {
      await supabase
        .from('parcelas_contrato')
        .update({ valor: valorRecomposto })
        .eq('id', lancOriginal.parcela_id);
    }

    await supabase.from('historico_baixas').delete().eq('id', baixaQueCreou.id);
    await supabase.from(table).delete().eq('id', id);

    return {
      success: true,
      restoredValor: valorRecomposto,
      message: `Baixa revertida! ${formatBRL(valorDevolvido)} devolvido ao saldo em aberto (novo total: ${formatBRL(valorRecomposto)}).`,
    };
  }

  // Caso simples: é uma originadora paga em totalidade (ou linha avulsa paga)
  const updateData: any = {
    status: 'pendente',
    [dateField]: null,
  };

  const { error } = await supabase.from(table).update(updateData).eq('id', id);
  if (error) return { success: false, message: error.message };

  // Sincroniza parcela
  const { data: lancFull } = await supabase
    .from(table)
    .select('parcela_id')
    .eq('id', id)
    .maybeSingle();
  if (lancFull?.parcela_id) {
    await supabase.from('parcelas_contrato').update({ status: 'pendente' }).eq('id', lancFull.parcela_id);
  }

  return { success: true, message: 'Voltado para em aberto!' };
}
