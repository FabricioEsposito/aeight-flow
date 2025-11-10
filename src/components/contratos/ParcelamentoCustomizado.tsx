import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PercentageInput } from '@/components/ui/currency-input';

export interface ParcelaCustomizada {
  id: string;
  percentual: number;
  tipo: 'normal' | 'go-live';
  descricao?: string;
}

interface ParcelamentoCustomizadoProps {
  parcelas: ParcelaCustomizada[];
  onChange: (parcelas: ParcelaCustomizada[]) => void;
  valorTotal: number;
}

export function ParcelamentoCustomizado({ parcelas, onChange, valorTotal }: ParcelamentoCustomizadoProps) {
  const adicionarParcela = () => {
    const totalUtilizado = parcelas.reduce((acc, p) => acc + p.percentual, 0);
    const percentualRestante = Math.max(0, 100 - totalUtilizado);
    
    const novaParcela: ParcelaCustomizada = {
      id: Math.random().toString(),
      percentual: percentualRestante > 0 ? percentualRestante : 0,
      tipo: 'normal',
      descricao: ''
    };
    
    onChange([...parcelas, novaParcela]);
  };

  const removerParcela = (id: string) => {
    onChange(parcelas.filter(p => p.id !== id));
  };

  const atualizarParcela = (id: string, campo: keyof ParcelaCustomizada, valor: any) => {
    onChange(parcelas.map(p => p.id === id ? { ...p, [campo]: valor } : p));
  };

  const totalPercentual = parcelas.reduce((acc, p) => acc + p.percentual, 0);
  const isValidTotal = Math.abs(totalPercentual - 100) < 0.01;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Configuração de Parcelas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {parcelas.length > 0 && (
          <div className="space-y-3">
            {parcelas.map((parcela, index) => (
              <div key={parcela.id} className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Parcela {index + 1}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removerParcela(parcela.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Percentual (%)</Label>
                    <PercentageInput
                      value={parcela.percentual}
                      onChange={(value) => atualizarParcela(parcela.id, 'percentual', value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Valor</Label>
                    <Input
                      value={new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format((valorTotal * parcela.percentual) / 100)}
                      disabled
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Tipo de Parcela</Label>
                  <Select
                    value={parcela.tipo}
                    onValueChange={(value) => atualizarParcela(parcela.id, 'tipo', value)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="go-live">Go Live (Conclusão)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {parcela.tipo === 'go-live' && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-2">
                    <p className="text-xs text-amber-800">
                      Esta parcela será lançada apenas quando o contrato for marcado como concluído
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs">Descrição (opcional)</Label>
                  <Input
                    value={parcela.descricao || ''}
                    onChange={(e) => atualizarParcela(parcela.id, 'descricao', e.target.value)}
                    placeholder="Ex: Entrada, Final, Go Live..."
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          onClick={adicionarParcela}
          className="w-full"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Parcela
        </Button>

        <div className="flex justify-between items-center pt-3 border-t">
          <span className="text-sm font-medium">Total:</span>
          <span className={`text-sm font-bold ${isValidTotal ? 'text-green-600' : 'text-red-600'}`}>
            {totalPercentual.toFixed(2)}%
          </span>
        </div>

        {!isValidTotal && (
          <div className="bg-red-50 border border-red-200 rounded p-2">
            <p className="text-xs text-red-800">
              O total dos percentuais deve ser igual a 100%
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
