import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContractDetailsProps {
  contractId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ContractDetail {
  id: string;
  numero: string;
  data_inicio: string;
  data_fim?: string;
  valor_bruto: number;
  valor_liquido: number;
  desconto_valor: number;
  irrf: number;
  pis: number;
  cofins: number;
  csll: number;
  status: string;
  recorrencia: boolean;
  periodo_recorrencia?: string;
  tipo_pagamento?: string;
  centro_custo?: string;
  categoria?: string;
  tipo_contrato?: string;
  clientes?: {
    razao_social: string;
    cnpj_cpf: string;
  };
  fornecedores?: {
    razao_social: string;
    cnpj_cpf: string;
  };
  contrato_itens?: Array<{
    descricao: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
  }>;
  contas_receber?: Array<{
    id: string;
    descricao: string;
    valor: number;
    data_vencimento: string;
    status: string;
  }>;
  contas_pagar?: Array<{
    id: string;
    descricao: string;
    valor: number;
    data_vencimento: string;
    status: string;
  }>;
}

export default function ContractDetails({ contractId, open, onOpenChange }: ContractDetailsProps) {
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && contractId) {
      fetchContractDetails();
    }
  }, [open, contractId]);

  const fetchContractDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select(`
          *,
          clientes:cliente_id (
            razao_social,
            cnpj_cpf
          ),
          fornecedores:fornecedor_id (
            razao_social,
            cnpj_cpf
          ),
          contrato_itens (
            descricao,
            quantidade,
            valor_unitario,
            valor_total
          ),
          contas_receber (
            id,
            descricao,
            valor,
            data_vencimento,
            status
          ),
          contas_pagar (
            id,
            descricao,
            valor,
            data_vencimento,
            status
          )
        `)
        .eq('id', contractId)
        .single();

      if (error) throw error;
      setContract(data as any);
    } catch (error) {
      console.error('Erro ao buscar detalhes do contrato:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'default';
      case 'encerrado': return 'secondary';
      case 'suspenso': return 'destructive';
      default: return 'outline';
    }
  };

  const getReceivableStatusColor = (status: string, dueDate: string) => {
    if (status === 'pago') return 'default';
    if (status === 'cancelado') return 'destructive';
    
    const today = new Date();
    const due = new Date(dueDate);
    
    if (due < today && status === 'pendente') {
      return 'destructive'; // Overdue
    }
    
    return 'secondary'; // Pending
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-muted rounded w-1/3"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Detalhes do Contrato #{contract.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contract Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Informações Gerais</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {contract.tipo_contrato === 'fornecedor' ? 'Fornecedor' : 'Cliente'}
                </p>
                <p className="font-medium">
                  {contract.tipo_contrato === 'fornecedor' 
                    ? contract.fornecedores?.razao_social 
                    : contract.clientes?.razao_social}
                </p>
                <p className="text-xs text-muted-foreground">
                  {contract.tipo_contrato === 'fornecedor' 
                    ? contract.fornecedores?.cnpj_cpf 
                    : contract.clientes?.cnpj_cpf}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Período</p>
                <p className="font-medium">
                  {formatDate(contract.data_inicio)} 
                  {contract.data_fim && ` - ${formatDate(contract.data_fim)}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={getStatusColor(contract.status)}>
                  {contract.status}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Financial Summary */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Resumo Financeiro</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Valor Bruto</p>
                <p className="text-lg font-semibold">{formatCurrency(contract.valor_bruto)}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Desconto</p>
                <p className="text-lg font-semibold text-orange-600">
                  {formatCurrency(contract.desconto_valor)}
                </p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Impostos</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency((contract.valor_bruto - contract.desconto_valor) * 
                    (contract.irrf + contract.pis + contract.cofins + contract.csll) / 100)}
                </p>
              </div>
              <div className="text-center p-4 bg-primary text-primary-foreground rounded-lg">
                <p className="text-sm opacity-90">Valor Líquido</p>
                <p className="text-lg font-bold">{formatCurrency(contract.valor_liquido)}</p>
              </div>
            </div>
          </Card>

          {/* Contract Items */}
          {contract.contrato_itens && contract.contrato_itens.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Itens do Contrato</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-24">Qtd</TableHead>
                    <TableHead className="w-32">Valor Unit.</TableHead>
                    <TableHead className="w-32">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contract.contrato_itens.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.descricao}</TableCell>
                      <TableCell>{item.quantidade}</TableCell>
                      <TableCell>{formatCurrency(item.valor_unitario)}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(item.valor_total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Receivables */}
          {contract.contas_receber && contract.contas_receber.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Contas a Receber Geradas</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contract.contas_receber.map((conta) => (
                    <TableRow key={conta.id}>
                      <TableCell className="font-medium">{conta.descricao}</TableCell>
                      <TableCell>{formatDate(conta.data_vencimento)}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        {formatCurrency(conta.valor)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getReceivableStatusColor(conta.status, conta.data_vencimento)}>
                          {conta.status === 'pendente' && new Date(conta.data_vencimento) < new Date() 
                            ? 'Vencido' 
                            : conta.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Payables */}
          {contract.contas_pagar && contract.contas_pagar.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Contas a Pagar Geradas</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contract.contas_pagar.map((conta) => (
                    <TableRow key={conta.id}>
                      <TableCell className="font-medium">{conta.descricao}</TableCell>
                      <TableCell>{formatDate(conta.data_vencimento)}</TableCell>
                      <TableCell className="font-semibold text-destructive">
                        {formatCurrency(conta.valor)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getReceivableStatusColor(conta.status, conta.data_vencimento)}>
                          {conta.status === 'pendente' && new Date(conta.data_vencimento) < new Date() 
                            ? 'Vencido' 
                            : conta.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}