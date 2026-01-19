import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CurrencyInput } from '@/components/ui/currency-input';
import { FileUpload } from '@/components/ui/file-upload';
interface Faturamento {
  id: string;
  data_competencia: string;
  data_vencimento: string;
  cliente_id: string;
  cliente_razao_social: string;
  cliente_nome_fantasia: string | null;
  cliente_cnpj: string;
  servicos_detalhes: Array<{ codigo: string; nome: string }>;
  numero_nf: string | null;
  link_nf: string | null;
  link_boleto: string | null;
  valor_bruto: number;
  valor_liquido: number;
  status: string;
  contrato_id: string | null;
  numero_contrato: string | null;
  importancia: string | null;
  vendedor: string | null;
  link_contrato: string | null;
  tipo_pagamento: string | null;
  pis_percentual: number;
  cofins_percentual: number;
  irrf_percentual: number;
  csll_percentual: number;
  pis_cofins_percentual: number;
  desconto_percentual: number;
  desconto_valor: number;
  periodo_recorrencia: string | null;
  data_recebimento: string | null;
  centro_custo: string | null;
  observacoes_faturamento: string | null;
}

interface EditFaturamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faturamento: Faturamento | null;
  onSuccess: () => void;
}

export function EditFaturamentoDialog({ open, onOpenChange, faturamento, onSuccess }: EditFaturamentoDialogProps) {
  const [numeroNf, setNumeroNf] = useState('');
  const [linkNf, setLinkNf] = useState('');
  const [linkBoleto, setLinkBoleto] = useState('');
  const [valorBruto, setValorBruto] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (faturamento) {
      setNumeroNf(faturamento.numero_nf || '');
      setLinkNf(faturamento.link_nf || '');
      setLinkBoleto(faturamento.link_boleto || '');
      setValorBruto(faturamento.valor_bruto);
    }
  }, [faturamento]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Calcular valores de impostos baseados no valor bruto
  const calcularImpostos = () => {
    if (!faturamento) return { irrf: 0, pis: 0, cofins: 0, csll: 0, total: 0, valorLiquido: valorBruto };
    
    const irrf = valorBruto * (faturamento.irrf_percentual / 100);
    const pis = valorBruto * (faturamento.pis_percentual / 100);
    const cofins = valorBruto * (faturamento.cofins_percentual / 100);
    const csll = valorBruto * (faturamento.csll_percentual / 100);
    const total = irrf + pis + cofins + csll;
    
    // Se não há retenções, valor líquido = valor bruto
    const valorLiquido = total > 0 ? valorBruto - total : valorBruto;
    
    return { irrf, pis, cofins, csll, total, valorLiquido };
  };

  const impostos = calcularImpostos();

  const handleSave = async () => {
    if (!faturamento) return;

    try {
      setLoading(true);
      const valorAlterado = valorBruto !== faturamento.valor_bruto;
      const valorLiquidoCalculado = impostos.valorLiquido;

      // 1. Atualizar contas_receber com valor líquido calculado
      const { error: crError } = await supabase
        .from('contas_receber')
        .update({
          numero_nf: numeroNf || null,
          link_nf: linkNf || null,
          link_boleto: linkBoleto || null,
          valor: valorLiquidoCalculado,
        })
        .eq('id', faturamento.id);

      if (crError) throw crError;

      // 2. Se o valor foi alterado, atualizar contrato, parcela e movimentações
      if (valorAlterado) {
        // Buscar a parcela_id da conta_receber
        const { data: contaReceber, error: fetchError } = await supabase
          .from('contas_receber')
          .select('parcela_id')
          .eq('id', faturamento.id)
          .single();

        if (fetchError) throw fetchError;

        if (contaReceber?.parcela_id) {
          // Atualizar a parcela do contrato
          const { error: parcelaError } = await supabase
            .from('parcelas_contrato')
            .update({ valor: valorLiquidoCalculado })
            .eq('id', contaReceber.parcela_id);

          if (parcelaError) throw parcelaError;

          // Buscar contrato_id da parcela para atualizar o contrato
          const { data: parcela, error: parcelaFetchError } = await supabase
            .from('parcelas_contrato')
            .select('contrato_id')
            .eq('id', contaReceber.parcela_id)
            .single();

          if (!parcelaFetchError && parcela?.contrato_id) {
            // Atualizar valor_bruto e valor_total no contrato
            const { error: contratoError } = await supabase
              .from('contratos')
              .update({ 
                valor_bruto: valorBruto,
                valor_total: valorLiquidoCalculado
              })
              .eq('id', parcela.contrato_id);

            if (contratoError) {
              console.error('Erro ao atualizar contrato:', contratoError);
            }
          }
        }

        // Atualizar movimentação correspondente (se existir e o status for pago)
        if (faturamento.status === 'pago' || faturamento.status === 'recebido') {
          const { error: movError } = await supabase
            .from('movimentacoes')
            .update({ valor: valorLiquidoCalculado })
            .eq('conta_receber_id', faturamento.id);

          if (movError) {
            console.error('Erro ao atualizar movimentação:', movError);
          }
        }
      }

      toast({
        title: "Sucesso",
        description: "Faturamento atualizado com sucesso!",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar faturamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o faturamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!faturamento) return null;

  const temRetencoes = faturamento.irrf_percentual > 0 || faturamento.pis_percentual > 0 || 
                       faturamento.cofins_percentual > 0 || faturamento.csll_percentual > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Editar Faturamento</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Cliente</Label>
            <p className="font-medium">{faturamento.cliente_razao_social}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Contrato</Label>
            <p className="font-medium">{faturamento.numero_contrato || 'N/A'}</p>
          </div>

          <div className="space-y-2">
            <Label>Valor Bruto</Label>
            <CurrencyInput
              value={valorBruto}
              onChange={setValorBruto}
            />
            {valorBruto !== faturamento.valor_bruto && (
              <p className="text-xs text-amber-600">
                Alteração será refletida no contrato, parcela e extrato.
              </p>
            )}
          </div>

          {temRetencoes && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <Label className="text-muted-foreground text-sm">Retenções de Impostos</Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {faturamento.irrf_percentual > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IRRF ({faturamento.irrf_percentual}%):</span>
                    <span className="text-destructive">-{formatCurrency(impostos.irrf)}</span>
                  </div>
                )}
                {faturamento.pis_percentual > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PIS ({faturamento.pis_percentual}%):</span>
                    <span className="text-destructive">-{formatCurrency(impostos.pis)}</span>
                  </div>
                )}
                {faturamento.cofins_percentual > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">COFINS ({faturamento.cofins_percentual}%):</span>
                    <span className="text-destructive">-{formatCurrency(impostos.cofins)}</span>
                  </div>
                )}
                {faturamento.csll_percentual > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CSLL ({faturamento.csll_percentual}%):</span>
                    <span className="text-destructive">-{formatCurrency(impostos.csll)}</span>
                  </div>
                )}
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                <span>Total Retenções:</span>
                <span className="text-destructive">-{formatCurrency(impostos.total)}</span>
              </div>
            </div>
          )}

          <div className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex justify-between items-center">
              <Label className="text-primary font-semibold">Valor Líquido:</Label>
              <span className="text-lg font-bold text-primary">{formatCurrency(impostos.valorLiquido)}</span>
            </div>
          </div>

          {/* Observações de Faturamento */}
          {faturamento.observacoes_faturamento && (
            <div className="space-y-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <Label className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                Observações de Faturamento
              </Label>
              <p className="text-sm whitespace-pre-wrap">{faturamento.observacoes_faturamento}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Número da NF</Label>
            <Input
              value={numeroNf}
              onChange={(e) => setNumeroNf(e.target.value)}
              placeholder="Digite o número da NF"
            />
          </div>

          <FileUpload
            bucket="faturamento-docs"
            path={`nf/${faturamento.id}.pdf`}
            value={linkNf || null}
            onChange={(url) => setLinkNf(url || '')}
            label="Nota Fiscal (PDF)"
          />

          <FileUpload
            bucket="faturamento-docs"
            path={`boleto/${faturamento.id}.pdf`}
            value={linkBoleto || null}
            onChange={(url) => setLinkBoleto(url || '')}
            label="Boleto (PDF)"
          />
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
