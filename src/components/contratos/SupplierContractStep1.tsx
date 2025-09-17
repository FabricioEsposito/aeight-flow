import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';

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
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [generatedDates, setGeneratedDates] = useState<Date[]>([]);

  useEffect(() => {
    fetchFornecedores();
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
                placeholder="Digite o número do contrato"
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !contractData.data_inicio && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {contractData.data_inicio ? format(contractData.data_inicio, "dd/MM/yyyy") : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={contractData.data_inicio || undefined}
                    onSelect={(date) => updateContractData({ data_inicio: date || null })}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
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
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !contractData.data_fim && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {contractData.data_fim ? format(contractData.data_fim, "dd/MM/yyyy") : "Selecione a data final"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={contractData.data_fim || undefined}
                          onSelect={(date) => updateContractData({ data_fim: date || null })}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
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