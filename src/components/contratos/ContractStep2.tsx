import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

interface ContractStep2Props {
  contractData: any;
  updateContractData: (data: any) => void;
}

interface PlanoContas {
  id: string;
  codigo: string;
  descricao: string;
}

export default function ContractStep2({ contractData, updateContractData }: ContractStep2Props) {
  const [planoContas, setPlanoContas] = useState<PlanoContas[]>([]);

  useEffect(() => {
    fetchPlanoContas();
  }, []);

  const fetchPlanoContas = async () => {
    try {
      const { data, error } = await supabase
        .from('plano_contas')
        .select('id, codigo, descricao')
        .eq('status', 'ativo')
        .eq('tipo', 'entrada')
        .order('codigo');

      if (error) throw error;
      setPlanoContas(data || []);
    } catch (error) {
      console.error('Erro ao buscar plano de contas:', error);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Classificações</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="categoria">Categoria Financeira *</Label>
          <Select 
            value={contractData.categoria} 
            onValueChange={(value) => updateContractData({ categoria: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              {planoContas.map((conta) => (
                <SelectItem key={conta.id} value={conta.id}>
                  {conta.codigo} - {conta.descricao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Apenas contas de entrada (receita) são exibidas
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="centro_custo">Centro de Custo</Label>
          <Input
            id="centro_custo"
            value={contractData.centro_custo}
            onChange={(e) => updateContractData({ centro_custo: e.target.value })}
            placeholder="Ex: Vendas, Marketing, TI..."
          />
          <p className="text-xs text-muted-foreground">
            Usado para controle interno de custos e receitas
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h4 className="font-medium mb-2">Informações sobre Classificações</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <strong>Categoria Financeira:</strong> Define a conta contábil para lançamentos automáticos</li>
          <li>• <strong>Centro de Custo:</strong> Permite análise de rentabilidade por setor/projeto</li>
          <li>• Essas informações serão aplicadas automaticamente nas parcelas geradas</li>
        </ul>
      </div>
    </Card>
  );
}