import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ContractStep3Props {
  contractData: any;
  updateContractData: (data: any) => void;
}

interface Servico {
  id: string;
  nome: string;
  codigo: string;
}

interface ContractItem {
  servico_id?: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export default function ContractStep3({ contractData, updateContractData }: ContractStep3Props) {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [newItem, setNewItem] = useState<ContractItem>({
    servico_id: '',
    descricao: '',
    quantidade: 1,
    valor_unitario: 0,
    valor_total: 0,
  });

  useEffect(() => {
    fetchServicos();
  }, []);

  useEffect(() => {
    // Calculate total when quantity or unit price changes
    const total = newItem.quantidade * newItem.valor_unitario;
    setNewItem(prev => ({ ...prev, valor_total: total }));
  }, [newItem.quantidade, newItem.valor_unitario]);

  useEffect(() => {
    // Update contract total value
    const valorBruto = contractData.itens?.reduce((acc: number, item: ContractItem) => acc + item.valor_total, 0) || 0;
    updateContractData({ valor_bruto: valorBruto, valor_total: valorBruto });
  }, [contractData.itens]);

  const fetchServicos = async () => {
    try {
      const { data, error } = await supabase
        .from('servicos')
        .select('id, nome, codigo')
        .eq('status', 'ativo')
        .order('nome');

      if (error) throw error;
      setServicos(data || []);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
    }
  };

  const handleServiceSelect = (servicoId: string) => {
    const servico = servicos.find(s => s.id === servicoId);
    if (servico) {
      setNewItem(prev => ({
        ...prev,
        servico_id: servicoId,
        descricao: servico.nome,
      }));
    }
  };

  const addItem = () => {
    if (!newItem.descricao || newItem.valor_unitario <= 0) {
      return;
    }

    const items = [...(contractData.itens || []), { ...newItem }];
    updateContractData({ itens: items });
    
    setNewItem({
      servico_id: '',
      descricao: '',
      quantidade: 1,
      valor_unitario: 0,
      valor_total: 0,
    });
  };

  const removeItem = (index: number) => {
    const items = contractData.itens?.filter((_: any, i: number) => i !== index) || [];
    updateContractData({ itens: items });
  };

  const updateItemQuantity = (index: number, quantidade: number) => {
    const items = [...(contractData.itens || [])];
    items[index].quantidade = quantidade;
    items[index].valor_total = quantidade * items[index].valor_unitario;
    updateContractData({ itens: items });
  };

  const updateItemPrice = (index: number, valor_unitario: number) => {
    const items = [...(contractData.itens || [])];
    items[index].valor_unitario = valor_unitario;
    items[index].valor_total = items[index].quantidade * valor_unitario;
    updateContractData({ itens: items });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Itens do Contrato</h3>
      
      {/* Add new item form */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-muted rounded-lg mb-6">
        <div className="space-y-2">
          <Label>Serviço (Opcional)</Label>
          <Select 
            value={newItem.servico_id} 
            onValueChange={handleServiceSelect}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar serviço" />
            </SelectTrigger>
            <SelectContent>
              {servicos.map((servico) => (
                <SelectItem key={servico.id} value={servico.id}>
                  {servico.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Descrição *</Label>
          <Input
            value={newItem.descricao}
            onChange={(e) => setNewItem(prev => ({ ...prev, descricao: e.target.value }))}
            placeholder="Descrição do item"
          />
        </div>

        <div className="space-y-2">
          <Label>Quantidade</Label>
          <Input
            type="number"
            min="1"
            step="0.01"
            value={newItem.quantidade}
            onChange={(e) => setNewItem(prev => ({ ...prev, quantidade: parseFloat(e.target.value) || 1 }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Valor Unitário</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={newItem.valor_unitario}
            onChange={(e) => setNewItem(prev => ({ ...prev, valor_unitario: parseFloat(e.target.value) || 0 }))}
            placeholder="0,00"
          />
        </div>

        <div className="flex items-end">
          <Button onClick={addItem} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </div>

      {/* Items table */}
      {contractData.itens && contractData.itens.length > 0 ? (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-24">Qtd</TableHead>
                <TableHead className="w-32">Valor Unit.</TableHead>
                <TableHead className="w-32">Total</TableHead>
                <TableHead className="w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractData.itens.map((item: ContractItem, index: number) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.descricao}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      value={item.quantidade}
                      onChange={(e) => updateItemQuantity(index, parseFloat(e.target.value) || 1)}
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.valor_unitario}
                      onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)}
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(item.valor_total)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end">
            <div className="text-right space-y-1">
              <p className="text-sm text-muted-foreground">Valor Total dos Itens</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(contractData.valor_bruto || 0)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum item adicionado ao contrato.</p>
          <p className="text-sm">Use o formulário acima para adicionar itens.</p>
        </div>
      )}
    </Card>
  );
}