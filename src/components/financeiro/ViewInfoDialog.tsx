import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileCheck, FileX, History, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HistoricoBaixa {
  id: string;
  valor_baixa: number;
  data_baixa: string;
  valor_restante: number;
  lancamento_residual_id: string | null;
  observacao: string | null;
  created_at: string;
}

interface ViewInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: any;
  type: 'receber' | 'pagar';
}

export function ViewInfoDialog({ open, onOpenChange, data, type }: ViewInfoDialogProps) {
  const [historicoBaixas, setHistoricoBaixas] = useState<HistoricoBaixa[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  useEffect(() => {
    if (open && data?.id) {
      fetchHistoricoBaixas();
    }
  }, [open, data?.id]);

  const fetchHistoricoBaixas = async () => {
    if (!data?.id) return;
    
    setLoadingHistorico(true);
    try {
      // Buscar histórico de baixas para este lançamento
      const { data: historico, error } = await supabase
        .from('historico_baixas')
        .select('*')
        .eq('lancamento_id', data.id)
        .order('created_at', { ascending: true });

      if (!error && historico) {
        setHistoricoBaixas(historico as HistoricoBaixa[]);
      }

      // Se não encontrou histórico, verificar se este lançamento é residual de outro
      if (!historico || historico.length === 0) {
        const { data: historicoResidual, error: errorResidual } = await supabase
          .from('historico_baixas')
          .select('*')
          .eq('lancamento_residual_id', data.id)
          .order('created_at', { ascending: true });

        if (!errorResidual && historicoResidual && historicoResidual.length > 0) {
          setHistoricoBaixas(historicoResidual as HistoricoBaixa[]);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar histórico de baixas:', error);
    } finally {
      setLoadingHistorico(false);
    }
  };

  if (!data) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  // Verificar se tem baixas parciais ou é um lançamento residual
  const hasPartialPayments = historicoBaixas.length > 0;
  const isResidualLancamento = data.descricao?.includes('(Residual)');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Informações da Parcela</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {type === 'receber' ? 'Cliente' : 'Fornecedor'}
              </label>
              <p className="text-base font-medium">
                {type === 'receber' 
                  ? data.clientes?.razao_social || '-'
                  : data.fornecedores?.razao_social || '-'
                }
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Contrato</label>
              <p className="text-base font-medium">
                {data.contratos?.numero || '-'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Descrição</label>
              <p className="text-base">{data.descricao}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Valor</label>
              <p className="text-base font-semibold text-emerald-600">
                {formatCurrency(data.valor || data.valor_parcela)}
              </p>
            </div>
          </div>

          {/* Mostrar valor original se for diferente do valor atual */}
          {data.valor_original && data.valor_original !== data.valor && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Valor Original</label>
                <p className="text-base text-muted-foreground">
                  {formatCurrency(data.valor_original)}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data Vencimento</label>
              <p className="text-base">{formatDate(data.data_vencimento)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data Competência</label>
              <p className="text-base">{formatDate(data.data_competencia)}</p>
            </div>
          </div>

          {(data.data_recebimento || data.data_pagamento) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Data {type === 'receber' ? 'Recebimento' : 'Pagamento'}
                </label>
                <p className="text-base">
                  {formatDate(data.data_recebimento || data.data_pagamento)}
                </p>
              </div>
            </div>
          )}

          {type === 'receber' && data.numero_nf && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Número NF</label>
                <p className="text-base">{data.numero_nf}</p>
              </div>
            </div>
          )}

          {/* Histórico de Baixas Parciais */}
          {(hasPartialPayments || isResidualLancamento) && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium text-muted-foreground">
                  Histórico de Baixas Parciais
                </label>
              </div>
              
              {loadingHistorico ? (
                <p className="text-sm text-muted-foreground">Carregando histórico...</p>
              ) : historicoBaixas.length > 0 ? (
                <div className="space-y-3">
                  {historicoBaixas.map((baixa, index) => (
                    <div 
                      key={baixa.id} 
                      className="bg-muted/50 rounded-lg p-3 border border-border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          Baixa {index + 1}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(baixa.created_at)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Valor Baixado</p>
                          <p className="text-sm font-semibold text-emerald-600">
                            {formatCurrency(baixa.valor_baixa)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Data da Baixa</p>
                          <p className="text-sm font-medium">
                            {formatDate(baixa.data_baixa)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Valor Residual</p>
                          <p className="text-sm font-semibold text-amber-600">
                            {formatCurrency(baixa.valor_restante)}
                          </p>
                        </div>
                      </div>
                      
                      {baixa.lancamento_residual_id && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <ArrowRight className="w-3 h-3" />
                          <span>Gerou novo lançamento residual</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : isResidualLancamento ? (
                <p className="text-sm text-muted-foreground italic">
                  Este é um lançamento residual gerado a partir de uma baixa parcial.
                </p>
              ) : null}
            </div>
          )}

          {/* Anexos */}
          <div className="border-t pt-4">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Anexos</label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                {data.link_nf ? (
                  <Button variant="outline" size="sm" asChild className="w-full justify-start">
                    <a href={data.link_nf} target="_blank" rel="noopener noreferrer">
                      <FileCheck className="w-4 h-4 mr-2 text-emerald-600" />
                      Ver Nota Fiscal
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </a>
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <FileX className="w-4 h-4" />
                    <span>NF não anexada</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {data.link_boleto ? (
                  <Button variant="outline" size="sm" asChild className="w-full justify-start">
                    <a href={data.link_boleto} target="_blank" rel="noopener noreferrer">
                      <FileCheck className="w-4 h-4 mr-2 text-emerald-600" />
                      Ver Boleto
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </a>
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <FileX className="w-4 h-4" />
                    <span>Boleto não anexado</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <div className="mt-1">
              <Badge variant={data.status === 'pago' ? 'default' : 'secondary'}>
                {data.status}
              </Badge>
            </div>
          </div>

          {data.observacoes && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Observações</label>
              <p className="text-base">{data.observacoes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}