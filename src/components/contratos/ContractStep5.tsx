import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContractStep5Props {
  contractData: any;
  updateContractData: (data: any) => void;
}

interface ContaBancaria {
  id: string;
  descricao: string;
  banco: string;
  tipo_conta: string;
}

export default function ContractStep5({ contractData, updateContractData }: ContractStep5Props) {
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [parcelas, setParcelas] = useState<any[]>([]);

  useEffect(() => {
    fetchContasBancarias();
  }, []);

  useEffect(() => {
    generateParcelas();
  }, [contractData.data_inicio, contractData.dia_vencimento, contractData.recorrencia, contractData.data_fim, contractData.valor_liquido]);

  const fetchContasBancarias = async () => {
    try {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('id, descricao, banco, tipo_conta')
        .eq('status', 'ativo')
        .order('descricao');

      if (error) throw error;
      setContasBancarias(data || []);
    } catch (error) {
      console.error('Erro ao buscar contas bancárias:', error);
    }
  };

  const generateParcelas = () => {
    if (!contractData.recorrencia || !contractData.data_inicio || !contractData.valor_liquido) {
      setParcelas([]);
      return;
    }

    const startDate = new Date(contractData.data_inicio);
    const endDate = contractData.data_fim ? new Date(contractData.data_fim) : null;
    const newParcelas = [];

    let currentDate = new Date(startDate);
    currentDate.setDate(contractData.dia_vencimento || 1);

    // If the billing day has already passed in the start month, move to next month
    if (currentDate <= startDate) {
      currentDate = addMonths(currentDate, 1);
    }

    // Generate up to 12 months or until end date
    const maxIterations = endDate ? 
      Math.ceil((endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000)) + 1 : 12;

    for (let i = 0; i < maxIterations && i < 12; i++) {
      if (endDate && currentDate > endDate) break;

      newParcelas.push({
        numero: i + 1,
        data_vencimento: new Date(currentDate),
        valor: contractData.valor_liquido,
        status: 'A gerar',
      });

      // Move to next billing period
      if (contractData.periodo_recorrencia === 'mensal') {
        currentDate = addMonths(currentDate, 1);
      } else if (contractData.periodo_recorrencia === 'bimestral') {
        currentDate = addMonths(currentDate, 2);
      } else if (contractData.periodo_recorrencia === 'trimestral') {
        currentDate = addMonths(currentDate, 3);
      } else if (contractData.periodo_recorrencia === 'semestral') {
        currentDate = addMonths(currentDate, 6);
      } else if (contractData.periodo_recorrencia === 'anual') {
        currentDate = addMonths(currentDate, 12);
      }
    }

    setParcelas(newParcelas);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Informações de Pagamento</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-2">
          <Label htmlFor="tipo_pagamento">Tipo de Pagamento *</Label>
          <Select 
            value={contractData.tipo_pagamento} 
            onValueChange={(value) => updateContractData({ tipo_pagamento: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo de pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="transferencia">Transferência Bancária</SelectItem>
              <SelectItem value="boleto">Boleto Bancário</SelectItem>
              <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
              <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
              <SelectItem value="dinheiro">Dinheiro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="conta_recebimento">Conta de Recebimento *</Label>
          <Select 
            value={contractData.conta_recebimento_id} 
            onValueChange={(value) => updateContractData({ conta_recebimento_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a conta" />
            </SelectTrigger>
            <SelectContent>
              {contasBancarias.map((conta) => (
                <SelectItem key={conta.id} value={conta.id}>
                  {conta.descricao} - {conta.banco}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Preview das parcelas */}
      {contractData.recorrencia && parcelas.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">Prévia das Parcelas a Serem Geradas</h4>
          
          <div className="bg-muted p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total de Parcelas</p>
                <p className="text-lg font-semibold">{parcelas.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Valor por Parcela</p>
                <p className="text-lg font-semibold text-primary">
                  {formatCurrency(contractData.valor_liquido)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Geral</p>
                <p className="text-lg font-semibold text-primary">
                  {formatCurrency(contractData.valor_liquido * parcelas.length)}
                </p>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {parcelas.map((parcela) => (
                  <div
                    key={parcela.numero}
                    className="bg-background p-3 rounded border"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">#{parcela.numero}</span>
                      <Badge variant="outline" className="text-xs">
                        {parcela.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(parcela.data_vencimento)}
                    </p>
                    <p className="text-sm font-semibold text-primary">
                      {formatCurrency(parcela.valor)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h5 className="font-medium text-green-900 mb-2">Geração Automática</h5>
            <p className="text-sm text-green-800">
              Ao salvar este contrato, todas essas parcelas serão automaticamente criadas no módulo 
              "Contas a Receber" com status "Pendente", prontas para controle de recebimentos.
            </p>
          </div>
        </div>
      )}

      {!contractData.recorrencia && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h5 className="font-medium text-blue-900 mb-2">Contrato Único</h5>
          <p className="text-sm text-blue-800">
            Este contrato não é recorrente. Você pode criar manualmente as contas a receber 
            conforme necessário no módulo correspondente.
          </p>
        </div>
      )}
    </Card>
  );
}