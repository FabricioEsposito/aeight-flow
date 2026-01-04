import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ExternalLink } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';

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
  const [valorLiquido, setValorLiquido] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (faturamento) {
      setNumeroNf(faturamento.numero_nf || '');
      setLinkNf(faturamento.link_nf || '');
      setValorLiquido(faturamento.valor_liquido);
    }
  }, [faturamento]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleSave = async () => {
    if (!faturamento) return;

    try {
      setLoading(true);
      const valorAlterado = valorLiquido !== faturamento.valor_liquido;

      // 1. Atualizar contas_receber
      const { error: crError } = await supabase
        .from('contas_receber')
        .update({
          numero_nf: numeroNf || null,
          link_nf: linkNf || null,
          valor: valorLiquido,
        })
        .eq('id', faturamento.id);

      if (crError) throw crError;

      // 2. Se o valor foi alterado, atualizar a parcela do contrato e movimentações
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
            .update({ valor: valorLiquido })
            .eq('id', contaReceber.parcela_id);

          if (parcelaError) throw parcelaError;
        }

        // Atualizar movimentação correspondente (se existir e o status for pago)
        if (faturamento.status === 'pago' || faturamento.status === 'recebido') {
          const { error: movError } = await supabase
            .from('movimentacoes')
            .update({ valor: valorLiquido })
            .eq('conta_receber_id', faturamento.id);

          if (movError) {
            console.error('Erro ao atualizar movimentação:', movError);
            // Não bloqueia a operação se não encontrar movimentação
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Faturamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Cliente</Label>
            <p className="font-medium">{faturamento.cliente_razao_social}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Contrato</Label>
            <p className="font-medium">{faturamento.numero_contrato || 'N/A'}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Valor Bruto</Label>
            <p className="font-medium">{formatCurrency(faturamento.valor_bruto)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor_liquido">Valor Líquido</Label>
            <CurrencyInput
              value={valorLiquido}
              onChange={setValorLiquido}
            />
            {valorLiquido !== faturamento.valor_liquido && (
              <p className="text-xs text-amber-600">
                Alteração de valor será refletida na parcela do contrato e no extrato.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="numero_nf">Número da NF</Label>
            <Input
              value={numeroNf}
              onChange={(e) => setNumeroNf(e.target.value)}
              placeholder="Digite o número da NF"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link_nf">Link da NF</Label>
            <div className="flex gap-2">
              <Input
                value={linkNf}
                onChange={(e) => setLinkNf(e.target.value)}
                placeholder="Cole o link da NF"
                className="flex-1"
              />
              {linkNf && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(linkNf, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
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
