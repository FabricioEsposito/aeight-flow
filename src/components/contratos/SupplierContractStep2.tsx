import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface ContractData {
  categoria: string;
  centro_custo: string;
}

interface SupplierContractStep2Props {
  contractData: ContractData;
  updateContractData: (data: Partial<ContractData>) => void;
}

interface PlanoContas {
  id: string;
  codigo: string;
  descricao: string;
}

export default function SupplierContractStep2({ contractData, updateContractData }: SupplierContractStep2Props) {
  const [planoContas, setPlanoContas] = useState<PlanoContas[]>([]);

  useEffect(() => {
    fetchPlanoContas();
  }, []);

  const fetchPlanoContas = async () => {
    const { data, error } = await supabase
      .from('plano_contas')
      .select('id, codigo, descricao')
      .eq('tipo', 'saida')  // Para fornecedores, usamos contas de saída/despesa
      .eq('status', 'ativo')
      .order('codigo');

    if (!error && data) {
      setPlanoContas(data);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Classificações Financeiras</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Categoria Financeira *</Label>
          <Select value={contractData.categoria} onValueChange={(value) => updateContractData({ categoria: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              {planoContas.map((conta) => (
                <SelectItem key={conta.id} value={conta.id}>
                  {conta.codigo} - {conta.descricao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Apenas contas de despesa estão sendo exibidas.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="centro_custo">Centro de Custo</Label>
          <Input
            id="centro_custo"
            value={contractData.centro_custo}
            onChange={(e) => updateContractData({ centro_custo: e.target.value })}
            placeholder="Digite o centro de custo"
          />
          <p className="text-sm text-muted-foreground">
            Centro de custo para classificação e controle dos gastos.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}