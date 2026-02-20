import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { PercentageInput } from '@/components/ui/currency-input';
import { supabase } from '@/integrations/supabase/client';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { CompanyTagWithPercent } from '@/components/centro-custos/CompanyBadge';

export interface RateioItem {
  centro_custo_id: string;
  codigo: string;
  descricao: string;
  percentual: number;
}

interface CentroCustoRateioProps {
  value: RateioItem[];
  onChange: (items: RateioItem[]) => void;
  valorTotal?: number;
}

export function CentroCustoRateio({ value, onChange, valorTotal = 0 }: CentroCustoRateioProps) {
  const [centrosCusto, setCentrosCusto] = useState<Array<{ id: string; codigo: string; descricao: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('centros_custo')
        .select('id, codigo, descricao')
        .eq('status', 'ativo')
        .order('codigo');
      setCentrosCusto(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const totalPercentual = value.reduce((acc, item) => acc + item.percentual, 0);
  const isValid = Math.abs(totalPercentual - 100) < 0.01 || value.length === 0;

  const availableCCs = centrosCusto.filter(
    cc => !value.some(v => v.centro_custo_id === cc.id)
  );

  const options: SearchableSelectOption[] = availableCCs.map(cc => ({
    value: cc.id,
    label: `${cc.codigo.split('_')[0]} - ${cc.descricao}`,
  }));

  const handleAdd = (ccId: string) => {
    const cc = centrosCusto.find(c => c.id === ccId);
    if (!cc) return;

    const remaining = 100 - totalPercentual;
    onChange([
      ...value,
      {
        centro_custo_id: cc.id,
        codigo: cc.codigo,
        descricao: cc.descricao,
        percentual: Math.max(0, remaining),
      },
    ]);
  };

  const handleRemove = (index: number) => {
    const newItems = value.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const handlePercentualChange = (index: number, percentual: number) => {
    const newItems = [...value];
    newItems[index] = { ...newItems[index], percentual };
    onChange(newItems);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Centros de Custo</Label>
        {value.length > 0 && (
          <span className={`text-xs font-medium ${isValid ? 'text-emerald-600' : 'text-destructive'}`}>
            Total: {totalPercentual.toFixed(1)}%
          </span>
        )}
      </div>

      {value.length > 0 && (
        <Progress value={Math.min(totalPercentual, 100)} className="h-1.5" />
      )}

      {value.map((item, index) => (
        <div key={item.centro_custo_id} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
          <CompanyTagWithPercent codigo={item.codigo} percentual={item.percentual} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-24">
                <PercentageInput
                  value={item.percentual}
                  onChange={(val) => handlePercentualChange(index, val)}
                />
              </div>
              {valorTotal > 0 && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  = {formatCurrency(valorTotal * item.percentual / 100)}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => handleRemove(index)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      {availableCCs.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchableSelect
              value=""
              onValueChange={handleAdd}
              options={options}
              placeholder={loading ? "Carregando..." : "Adicionar centro de custo..."}
              searchPlaceholder="Buscar..."
              emptyMessage="Nenhum centro de custo disponível."
              disabled={loading}
            />
          </div>
        </div>
      )}

      {value.length > 1 && !isValid && (
        <p className="text-xs text-destructive">
          A soma dos percentuais deve ser 100%. Atual: {totalPercentual.toFixed(1)}%
        </p>
      )}
    </div>
  );
}
