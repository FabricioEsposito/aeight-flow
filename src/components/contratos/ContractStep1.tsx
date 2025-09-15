import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ContractStep1Props {
  contractData: any;
  updateContractData: (data: any) => void;
}

interface Cliente {
  id: string;
  razao_social: string;
}

export default function ContractStep1({ contractData, updateContractData }: ContractStep1Props) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [nextContractNumber, setNextContractNumber] = useState('');

  useEffect(() => {
    fetchClientes();
    generateNextContractNumber();
  }, []);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, razao_social')
        .eq('status', 'ativo')
        .order('razao_social');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  const generateNextContractNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('numero')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastNumber = parseInt(data[0].numero.replace(/\D/g, '')) || 0;
        nextNumber = lastNumber + 1;
      }

      const contractNumber = `CT${String(nextNumber).padStart(4, '0')}`;
      setNextContractNumber(contractNumber);
      
      if (!contractData.numero) {
        updateContractData({ numero: contractNumber });
      }
    } catch (error) {
      console.error('Erro ao gerar número do contrato:', error);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      updateContractData({ data_inicio: date.toISOString().split('T')[0] });
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    if (date) {
      updateContractData({ data_fim: date.toISOString().split('T')[0] });
    } else {
      updateContractData({ data_fim: undefined });
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Informações do Contrato</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="numero">Número do Contrato</Label>
          <Input
            id="numero"
            value={contractData.numero}
            onChange={(e) => updateContractData({ numero: e.target.value })}
            placeholder={nextContractNumber}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cliente">Cliente *</Label>
          <Select 
            value={contractData.cliente_id} 
            onValueChange={(value) => updateContractData({ cliente_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((cliente) => (
                <SelectItem key={cliente.id} value={cliente.id}>
                  {cliente.razao_social}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Data de Início *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !contractData.data_inicio && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {contractData.data_inicio ? 
                  format(new Date(contractData.data_inicio), "PPP", { locale: ptBR }) : 
                  "Selecionar data"
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={contractData.data_inicio ? new Date(contractData.data_inicio) : undefined}
                onSelect={handleDateChange}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dia_vencimento">Dia de Vencimento</Label>
          <Select 
            value={contractData.dia_vencimento?.toString()} 
            onValueChange={(value) => updateContractData({ dia_vencimento: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o dia" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  Dia {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4 md:col-span-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="recorrencia"
              checked={contractData.recorrencia}
              onCheckedChange={(checked) => updateContractData({ recorrencia: checked })}
            />
            <Label htmlFor="recorrencia">Contrato recorrente</Label>
          </div>

          {contractData.recorrencia && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="periodo_recorrencia">Período de Recorrência</Label>
                <Select 
                  value={contractData.periodo_recorrencia} 
                  onValueChange={(value) => updateContractData({ periodo_recorrencia: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="bimestral">Bimestral</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="semestral">Semestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data de Término (Opcional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !contractData.data_fim && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {contractData.data_fim ? 
                        format(new Date(contractData.data_fim), "PPP", { locale: ptBR }) : 
                        "Indeterminado"
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3">
                      <Button 
                        variant="ghost" 
                        className="w-full mb-2"
                        onClick={() => handleEndDateChange(undefined)}
                      >
                        Remover data limite
                      </Button>
                      <Calendar
                        mode="single"
                        selected={contractData.data_fim ? new Date(contractData.data_fim) : undefined}
                        onSelect={handleEndDateChange}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}