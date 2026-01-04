import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Faturamento {
  id: string;
  data_competencia: string;
  data_vencimento: string;
  cliente_id: string;
  cliente_razao_social: string;
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
  observacoes_faturamento?: string | null;
}

interface FaturamentoDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faturamento: Faturamento | null;
}

export function FaturamentoDetailsDialog({ open, onOpenChange, faturamento }: FaturamentoDetailsDialogProps) {
  if (!faturamento) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const formatCnpj = (value: string) => {
    if (!value) return 'N/A';
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const getStatusBadge = (status: string, dataVencimento: string) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento + 'T00:00:00');
    
    if (status === 'pago' || status === 'recebido') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Recebido</Badge>;
    }
    if (vencimento < hoje) {
      return <Badge variant="destructive">Vencido</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Em dia</Badge>;
  };

  const getImportanciaBadge = (importancia: string | null) => {
    if (!importancia) return <Badge variant="outline">N/A</Badge>;
    
    const colors: Record<string, string> = {
      'importante': 'bg-green-100 text-green-800',
      'mediano': 'bg-yellow-100 text-yellow-800',
      'nao_importante': 'bg-gray-100 text-gray-800',
    };
    
    const labels: Record<string, string> = {
      'importante': 'Importante',
      'mediano': 'Mediano',
      'nao_importante': 'Não Importante',
    };
    
    return <Badge className={colors[importancia]}>{labels[importancia] || importancia}</Badge>;
  };

  // Calcular valores dos impostos
  const pisValor = faturamento.valor_bruto * (faturamento.pis_percentual / 100);
  const cofinsValor = faturamento.valor_bruto * (faturamento.cofins_percentual / 100);
  const irrfValor = faturamento.valor_bruto * (faturamento.irrf_percentual / 100);
  const csllValor = faturamento.valor_bruto * (faturamento.csll_percentual / 100);
  const pisCofinsValor = faturamento.valor_bruto * (faturamento.pis_cofins_percentual / 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Faturamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Cliente */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg border-b pb-2">Cliente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Razão Social</p>
                <p className="font-medium">{faturamento.cliente_razao_social}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CNPJ/CPF</p>
                <p className="font-medium">{formatCnpj(faturamento.cliente_cnpj)}</p>
              </div>
            </div>
          </div>

          {/* Nota Fiscal */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg border-b pb-2">Nota Fiscal</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Número da NF</p>
                <p className="font-medium">{faturamento.numero_nf || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Link da NF</p>
                {faturamento.link_nf ? (
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => window.open(faturamento.link_nf!, '_blank')}
                  >
                    Abrir NF <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                ) : (
                  <p className="font-medium">N/A</p>
                )}
              </div>
            </div>
          </div>

          {/* Status e Valores */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg border-b pb-2">Status e Valores</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">{getStatusBadge(faturamento.status, faturamento.data_vencimento)}</div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Meio de Pagamento</p>
                <p className="font-medium">{faturamento.tipo_pagamento || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Bruto</p>
                <p className="font-medium text-lg">{formatCurrency(faturamento.valor_bruto)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Líquido</p>
                <p className="font-medium text-lg text-green-600">{formatCurrency(faturamento.valor_liquido)}</p>
              </div>
            </div>
          </div>

          {/* Impostos */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg border-b pb-2">Impostos</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">PIS ({faturamento.pis_percentual}%)</p>
                <p className="font-medium">{formatCurrency(pisValor)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">COFINS ({faturamento.cofins_percentual}%)</p>
                <p className="font-medium">{formatCurrency(cofinsValor)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">IRRF ({faturamento.irrf_percentual}%)</p>
                <p className="font-medium">{formatCurrency(irrfValor)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CSLL ({faturamento.csll_percentual}%)</p>
                <p className="font-medium">{formatCurrency(csllValor)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">PIS/COFINS ({faturamento.pis_cofins_percentual}%)</p>
                <p className="font-medium">{formatCurrency(pisCofinsValor)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Optante Simples Nacional</p>
                <p className="font-medium">
                  {(faturamento.pis_percentual === 0 && faturamento.cofins_percentual === 0) ? 'Sim' : 'Não'}
                </p>
              </div>
            </div>
          </div>

          {/* Contrato */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg border-b pb-2">Contrato</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Número do Contrato</p>
                <p className="font-medium">{faturamento.numero_contrato || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Importância</p>
                <div className="mt-1">{getImportanciaBadge(faturamento.importancia)}</div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendedor Responsável</p>
                <p className="font-medium">{faturamento.vendedor || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Período de Recorrência</p>
                <p className="font-medium">{faturamento.periodo_recorrencia || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Serviços</p>
                <p className="font-medium">
                  {faturamento.servicos_detalhes.length > 0 
                    ? faturamento.servicos_detalhes.map(s => `${s.codigo} - ${s.nome}`).join(', ')
                    : 'N/A'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Link do Contrato</p>
                {faturamento.link_contrato ? (
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => window.open(faturamento.link_contrato!, '_blank')}
                  >
                    Abrir Contrato <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                ) : (
                  <p className="font-medium">N/A</p>
                )}
              </div>
            </div>
          </div>

          {/* Observações de Faturamento */}
          {faturamento.observacoes_faturamento && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                Observações de Faturamento
              </h3>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm whitespace-pre-wrap">{faturamento.observacoes_faturamento}</p>
              </div>
            </div>
          )}

          {/* Datas */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg border-b pb-2">Datas</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Data de Competência</p>
                <p className="font-medium">{formatDate(faturamento.data_competencia)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data de Vencimento</p>
                <p className="font-medium">{formatDate(faturamento.data_vencimento)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data de Recebimento</p>
                <p className="font-medium">{formatDate(faturamento.data_recebimento)}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
