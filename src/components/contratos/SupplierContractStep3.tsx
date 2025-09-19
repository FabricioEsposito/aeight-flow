import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ContractItem {
  id: string;
  servico_id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

interface ContractData {
  itens: ContractItem[];
  valor_bruto: number;
}

interface SupplierContractStep3Props {
  contractData: ContractData;
  updateContractData: (data: Partial<ContractData>) => void;
}

interface Servico {
  id: string;
  codigo: string;
  nome: string;
}

export default function SupplierContractStep3({ contractData, updateContractData }: SupplierContractStep3Props) {
  const [servicos, setServicos] = useState<Servico[]>([]);

  useEffect(() => {
    fetchServicos();
  }, []);

  useEffect(() => {
    calculateTotal();
  }, [contractData.itens]);

  const fetchServicos = async () => {
    const { data, error } = await supabase
      .from('servicos')
      .select('id, codigo, nome')
      .eq('status', 'ativo')
      .order('nome');

    if (!error && data) {
      setServicos(data);
    }
  };

  const addItem = () => {
    const newItem: ContractItem = {
      id: crypto.randomUUID(),
      servico_id: '',
      descricao: '',
      quantidade: 1,
      valor_unitario: 0,
      valor_total: 0,
    };

    updateContractData({
      itens: [...contractData.itens, newItem]
    });
  };

  const removeItem = (itemId: string) => {
    const updatedItens = contractData.itens.filter(item => item.id !== itemId);
    updateContractData({ itens: updatedItens });
  };

  const updateItem = (itemId: string, field: keyof ContractItem, value: any) => {
    const updatedItens = contractData.itens.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        
        // Atualizar descrição automaticamente quando selecionar serviço
        if (field === 'servico_id') {
          const selectedService = servicos.find(s => s.id === value);
          if (selectedService) {
            updatedItem.descricao = selectedService.nome;
          }
        }
        
        // Recalcular valor total quando quantidade ou valor unitário mudarem
        if (field === 'quantidade' || field === 'valor_unitario') {
          updatedItem.valor_total = updatedItem.quantidade * updatedItem.valor_unitario;
        }
        
        return updatedItem;
      }
      return item;
    });

    updateContractData({ itens: updatedItens });
  };

  const calculateTotal = () => {
    const total = contractData.itens.reduce((sum, item) => sum + item.valor_total, 0);
    updateContractData({ valor_bruto: total });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatInputValue = (value: number) => {
    return value ? value.toFixed(2).replace('.', ',') : '';
  };

  const parseInputValue = (value: string) => {
    const numericValue = value.replace(',', '.').replace(/[^\d.-]/g, '');
    return parseFloat(numericValue) || 0;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Itens do Contrato
          <Button onClick={addItem} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Item
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contractData.itens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum item adicionado.</p>
            <Button onClick={addItem} variant="outline" className="mt-2">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeiro Item
            </Button>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição do Serviço</TableHead>
                  <TableHead className="w-20">Qtd</TableHead>
                  <TableHead className="w-32">Valor Unit.</TableHead>
                  <TableHead className="w-32">Total</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractData.itens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Input
                        value={item.descricao}
                        onChange={(e) => updateItem(item.id, 'descricao', e.target.value)}
                        placeholder="Descreva o serviço contratado"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        value={item.quantidade}
                        onChange={(e) => updateItem(item.id, 'quantidade', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={formatInputValue(item.valor_unitario)}
                        onChange={(e) => {
                          const numericValue = parseInputValue(e.target.value);
                          updateItem(item.id, 'valor_unitario', numericValue);
                        }}
                        placeholder="0,00"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(item.valor_total)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-6 flex justify-end">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Valor Total do Contrato</div>
                <div className="text-2xl font-bold">{formatCurrency(contractData.valor_bruto)}</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}