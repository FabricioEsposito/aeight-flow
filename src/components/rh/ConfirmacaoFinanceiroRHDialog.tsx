import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ConfirmacaoFinanceiroRHDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitacaoId: string | null;
  onSuccess: () => void;
}

export function ConfirmacaoFinanceiroRHDialog({ open, onOpenChange, solicitacaoId, onSuccess }: ConfirmacaoFinanceiroRHDialogProps) {
  const [processing, setProcessing] = useState(false);
  const [solicitacao, setSolicitacao] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  React.useEffect(() => {
    if (open && solicitacaoId) {
      loadSolicitacao(solicitacaoId);
    }
  }, [open, solicitacaoId]);

  const loadSolicitacao = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('solicitacoes_aprovacao_rh')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setSolicitacao(data);
    } catch (error) {
      console.error('Erro ao carregar solicitação:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmar = async () => {
    if (!solicitacao) return;
    setProcessing(true);
    try {
      // Get folha records linked to this solicitacao
      const { data: folhas, error: folhaError } = await (supabase
        .from('folha_pagamento')
        .select('id, parcela_id, conta_pagar_id, valor_liquido, mes_referencia, ano_referencia') as any)
        .eq('solicitacao_rh_id', solicitacao.id);

      if (folhaError) throw folhaError;

      // Propagate to parcelas_contrato and contas_pagar
      for (const folha of (folhas || [])) {
        if (folha.parcela_id) {
          // Get the original data_vencimento from detalhes if available
          const detalhe = Array.isArray(solicitacao.detalhes) 
            ? solicitacao.detalhes.find((d: any) => d.parcela_id === folha.parcela_id)
            : null;
          
          const updateData: any = { valor: folha.valor_liquido };
          if (detalhe?.data_vencimento) {
            updateData.data_vencimento = detalhe.data_vencimento;
          }

          await supabase.from('parcelas_contrato').update(updateData).eq('id', folha.parcela_id);
        }

        if (folha.conta_pagar_id) {
          const detalhe = Array.isArray(solicitacao.detalhes)
            ? solicitacao.detalhes.find((d: any) => d.parcela_id === folha.parcela_id)
            : null;

          const updateData: any = { valor: folha.valor_liquido };
          if (detalhe?.data_vencimento) {
            updateData.data_vencimento = detalhe.data_vencimento;
            updateData.data_competencia = detalhe.data_vencimento;
          }

          await supabase.from('contas_pagar').update(updateData).eq('id', folha.conta_pagar_id);
        }

        // Update folha status to processado
        await supabase.from('folha_pagamento').update({ status: 'processado' }).eq('id', folha.id);
      }

      // Update solicitacao
      await supabase
        .from('solicitacoes_aprovacao_rh')
        .update({
          status: 'aprovado_financeiro',
          aprovador_financeiro_id: user?.id,
          data_aprovacao_financeiro: new Date().toISOString(),
        } as any)
        .eq('id', solicitacao.id);

      toast({ title: 'Sucesso', description: 'Valores propagados para o extrato com sucesso.' });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao confirmar:', error);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const detalhes = Array.isArray(solicitacao?.detalhes) ? solicitacao.detalhes : [];
  const totalValor = detalhes.reduce((sum: number, d: any) => sum + (d.valor_liquido || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Confirmar Atualização do Extrato
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : solicitacao ? (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-700 dark:text-blue-400">Folha aprovada pelo Gerente de RH</p>
                  <p className="text-blue-600 dark:text-blue-300 mt-1">
                    Competência: {String(solicitacao.mes_referencia).padStart(2, '0')}/{solicitacao.ano_referencia} •
                    {detalhes.length} lançamento(s) • Total: {formatCurrency(totalValor)}
                  </p>
                  <p className="text-blue-600 dark:text-blue-300 mt-1">
                    Ao confirmar, os valores serão propagados para as parcelas e contas a pagar correspondentes.
                  </p>
                </div>
              </div>
            </div>

            {detalhes.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>CNPJ/CPF</TableHead>
                    <TableHead className="text-right">Salário Base</TableHead>
                    <TableHead className="text-right">Valor Líquido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detalhes.map((d: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{d.razao_social || '-'}</TableCell>
                      <TableCell className="text-sm">{d.cnpj || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(d.salario_base || 0)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(d.valor_liquido || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
              <span className="font-semibold">Total:</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(totalValor)}</span>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">Solicitação não encontrada.</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirmar} disabled={processing || !solicitacao} className="gap-2">
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Confirmar e Atualizar Extrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
