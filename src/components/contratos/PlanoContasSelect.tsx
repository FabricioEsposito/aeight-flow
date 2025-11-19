import { useEffect, useState } from 'react';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { supabase } from '@/integrations/supabase/client';

interface PlanoConta {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string;
}

interface PlanoContasSelectProps {
  value: string;
  onChange: (value: string) => void;
  tipo: 'entrada' | 'saida';
  disabled?: boolean;
}

export function PlanoContasSelect({ value, onChange, tipo, disabled }: PlanoContasSelectProps) {
  const [planos, setPlanos] = useState<PlanoConta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlanos();
  }, [tipo]);

  const fetchPlanos = async () => {
    try {
      const { data, error } = await supabase
        .from('plano_contas')
        .select('id, codigo, descricao, tipo')
        .eq('tipo', tipo)
        .eq('status', 'ativo')
        .eq('nivel', 3)
        .order('codigo');

      if (error) throw error;
      setPlanos(data || []);
    } catch (error) {
      console.error('Erro ao buscar planos de contas:', error);
    } finally {
      setLoading(false);
    }
  };

  const options: SearchableSelectOption[] = planos.map((plano) => ({
    value: plano.id,
    label: `${plano.codigo} - ${plano.descricao}`,
  }));

  return (
    <SearchableSelect
      value={value}
      onValueChange={onChange}
      options={options}
      placeholder={loading ? "Carregando..." : "Selecione um plano de contas"}
      searchPlaceholder="Buscar plano de contas..."
      emptyMessage="Nenhum plano de contas encontrado."
      disabled={disabled || loading}
    />
  );
}
