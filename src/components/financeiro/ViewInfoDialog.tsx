import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileCheck, FileX } from 'lucide-react';

interface ViewInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: any;
  type: 'receber' | 'pagar';
}

export function ViewInfoDialog({ open, onOpenChange, data, type }: ViewInfoDialogProps) {
  if (!data) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
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