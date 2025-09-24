import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DateInput } from '@/components/ui/date-input';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';

interface ContractData {
  numero: string;
  fornecedor_id: string;
  data_inicio: Date | null;
  data_fim: Date | null;
  dia_vencimento: number;
  periodo_recorrencia: string;
  recorrencia: boolean;
  tipo_pagamento: string;
  conta_recebimento_id: string;
  categoria: string;
  centro_custo: string;
}

interface SupplierContractStep1Props {
  contractData: ContractData;
  updateContractData: (data: Partial<ContractData>) => void;
}

interface Fornecedor {
  id: string;
  razao_social: string;
  cnpj_cpf: string;
}

export default function SupplierContractStep1({ contractData, updateContractData }: SupplierContractStep1Props) {
  const [dataInicioError, setDataInicioError] = useState<string | null>(null);
  const [dataFimError, setDataFimError] = useState<string | null>(null);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [generatedDates, setGeneratedDates] = useState<Date[]>([]);

  useEffect(() => {
    fetchFornecedores();
    generateContractNumber();
  }, []);

  useEffect(() => {
    if (contractData.recorrencia && contractData.data_inicio && contractData.data_fim && contractData.dia_vencimento) {
      generatePaymentDates();
    }
  }, [contractData.recorrencia, contractData.data_inicio, contractData.data_fim, contractData.dia_vencimento, contractData.periodo_recorrencia]);

  const fetchFornecedores = async () => {
    const { data, error } = await supabase
      .from('fornecedores')
      .select('id, razao_social, cnpj_cpf')
      .eq('status', 'ativo')
      .order('razao_social');

    if (!error && data) {
      setFornecedores(data);
    }
  };

  const generateContractNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('numero')
        .eq('tipo_contrato', 'fornecedor')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastNumber = parseInt(data[0].numero.replace(/\D/g, '')) || 0;
        nextNumber = lastNumber + 1;
      }

      const contractNumber = `FO${String(nextNumber).padStart(4, '0')}`;
      if (!contractData.numero) {
        updateContractData({ numero: contractNumber });
      }
    } catch (error) {
      console.error('Erro ao gerar número do contrato:', error);
    }
  };

  const generatePaymentDates = () => {
    if (!contractData.data_inicio || !contractData.data_fim || !contractData.dia_vencimento) return;

    const dates: Date[] = [];
    const startDate = new Date(contractData.data_inicio);
    const endDate = new Date(contractData.data_fim);
    
    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), contractData.dia_vencimento);
    
    // Se o dia já passou no mês atual, começar no próximo mês
    if (currentDate < startDate) {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    setGeneratedDates(dates);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas do Contrato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero">Número do Contrato *</Label>
              <Input
                id="numero"
                value={contractData.numero}
                onChange={(e) => updateContractData({ numero: e.target.value })}
                placeholder="Número será gerado automaticamente"
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label>Fornecedor *</Label>
              <Select value={contractData.fornecedor_id} onValueChange={(value) => updateContractData({ fornecedor_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores.map((fornecedor) => (
                    <SelectItem key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.razao_social} - {fornecedor.cnpj_cpf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Início *</Label>
              <DateInput
                value={contractData.data_inicio}
                onChange={(date) => {
                  if (!date || isNaN(date.getTime())) {
                    setDataInicioError('Data inválida. Use o formato dd/mm/aaaa.');
                    updateContractData({ data_inicio: null });
                  } else {
                    setDataInicioError(null);
                    updateContractData({ data_inicio: date });
                  }
                }}
                placeholder="DD/MM/AAAA"
              />
              {dataInicioError && (
                <span className="text-xs text-red-600">{dataInicioError}</span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dia_vencimento">Dia da Geração da Despesa *</Label>
              <Input
                id="dia_vencimento"
                type="number"
                min="1"
                max="31"
                value={contractData.dia_vencimento || ''}
                onChange={(e) => updateContractData({ dia_vencimento: parseInt(e.target.value) || 1 })}
                placeholder="Dia do mês (1-31)"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={contractData.recorrencia}
                onCheckedChange={(checked) => updateContractData({ recorrencia: checked })}
              />
              <Label>Contrato Recorrente</Label>
            </div>

            {contractData.recorrencia && (
              <>
                <div className="space-y-2">
                  <Label>Período de Recorrência</Label>
                  <Select 
                    value={contractData.periodo_recorrencia} 
                    onValueChange={(value) => updateContractData({ periodo_recorrencia: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="indeterminado">Indeterminado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {contractData.periodo_recorrencia === 'mensal' && (
                  <div className="space-y-2">
                    <Label>Data Final *</Label>
                    <DateInput
                      value={contractData.data_fim}
                      onChange={(date) => {
                        if (!date || isNaN(date.getTime())) {
                          setDataFimError('Data inválida. Use o formato dd/mm/aaaa.');
                          updateContractData({ data_fim: null });
                        } else {
                          setDataFimError(null);
                          updateContractData({ data_fim: date });
                        }
                      }}
                      placeholder="DD/MM/AAAA"
                    />
                    {dataFimError && (
                      <span className="text-xs text-red-600">{dataFimError}</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {generatedDates.length > 0 && (
            <div className="space-y-2">
              <Label>Datas de Pagamento Geradas</Label>
              <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                {generatedDates.map((date, index) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    {format(date, "dd/MM/yyyy")}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}