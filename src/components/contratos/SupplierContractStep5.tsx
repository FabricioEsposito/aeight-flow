import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ContractData {
  tipo_pagamento: string;
  conta_recebimento_id: string;
  data_inicio: Date | null;
  data_fim: Date | null;
  dia_vencimento: number;
  recorrencia: boolean;
  periodo_recorrencia: string;
}

interface SupplierContractStep5Props {
  contractData: ContractData;
  updateContractData: (data: Partial<ContractData>) => void;
}

interface ContaBancaria {
  id: string;
  banco: string;
  descricao: string;
}

export default function SupplierContractStep5({ contractData, updateContractData }: SupplierContractStep5Props) {
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [paymentDates, setPaymentDates] = useState<Date[]>([]);

  useEffect(() => {
    fetchContasBancarias();
  }, []);

  useEffect(() => {
    if (contractData.recorrencia && contractData.data_inicio && contractData.dia_vencimento) {
      generatePaymentDates();
    }
  }, [contractData.data_inicio, contractData.data_fim, contractData.dia_vencimento, contractData.recorrencia, contractData.periodo_recorrencia]);

  const fetchContasBancarias = async () => {
    const { data, error } = await supabase
      .from('contas_bancarias')
      .select('id, banco, descricao')
      .eq('status', 'ativo')
      .order('banco');

    if (!error && data) {
      setContasBancarias(data);
    }
  };

  const generatePaymentDates = () => {
    if (!contractData.data_inicio || !contractData.dia_vencimento) return;

    const dates: Date[] = [];
    const startDate = new Date(contractData.data_inicio);
    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), contractData.dia_vencimento);
    
    // Se o dia já passou no mês atual, começar no próximo mês
    if (currentDate < startDate) {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    if (contractData.periodo_recorrencia === 'indeterminado') {
      // Mostrar apenas os próximos 12 meses para indeterminado
      for (let i = 0; i < 12; i++) {
        dates.push(new Date(currentDate));
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    } else if (contractData.data_fim) {
      // Gerar datas até a data final
      const endDate = new Date(contractData.data_fim);
      while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    setPaymentDates(dates);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Pagamento *</Label>
              <Select 
                value={contractData.tipo_pagamento} 
                onValueChange={(value) => updateContractData({ tipo_pagamento: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="debito_automatico">Débito Automático</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Conta de Pagamento *</Label>
              <Select 
                value={contractData.conta_recebimento_id} 
                onValueChange={(value) => updateContractData({ conta_recebimento_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {contasBancarias.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      {conta.banco} - {conta.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {contractData.recorrencia && paymentDates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Calendário de Pagamentos
              {contractData.periodo_recorrencia === 'indeterminado' && 
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (Próximos 12 meses - Recorrência indeterminada)
                </span>
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {paymentDates.map((date, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium">Pagamento #{index + 1}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(date, "dd/MM/yyyy")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {contractData.periodo_recorrencia === 'indeterminado' && (
              <div className="mt-4 text-sm text-muted-foreground">
                <p>
                  ⚠️ Este contrato terá recorrência indeterminada. 
                  Os pagamentos continuarão sendo gerados mensalmente até que o contrato seja encerrado.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}