import { useEffect, useState } from 'react';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CentroCustoSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export default function CentroCustoSelect({ value, onValueChange, placeholder = "Selecione o centro de custo" }: CentroCustoSelectProps) {
  const [centrosCusto, setCentrosCusto] = useState<Array<{ id: string; codigo: string; descricao: string }>>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCentrosCusto();
  }, []);

  const fetchCentrosCusto = async () => {
    try {
      const { data, error } = await supabase
        .from('centros_custo')
        .select('id, codigo, descricao')
        .eq('status', 'ativo')
        .order('codigo');

      if (error) throw error;
      setCentrosCusto(data || []);
    } catch (error) {
      console.error('Erro ao buscar centros de custo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os centros de custo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const options: SearchableSelectOption[] = centrosCusto.map((cc) => ({
    value: cc.id,
    label: `${cc.codigo} - ${cc.descricao}`,
  }));

  return (
    <SearchableSelect
      value={value}
      onValueChange={onValueChange}
      options={options}
      placeholder={loading ? "Carregando..." : placeholder}
      searchPlaceholder="Buscar centro de custo..."
      emptyMessage="Nenhum centro de custo encontrado."
      disabled={loading}
    />
  );
}