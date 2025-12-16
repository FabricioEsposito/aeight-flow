import { useState, useEffect } from 'react';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { supabase } from '@/integrations/supabase/client';

interface Vendedor {
  id: string;
  nome: string;
}

interface VendedorSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function VendedorSelect({ value, onChange, disabled }: VendedorSelectProps) {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendedores();
  }, []);

  const fetchVendedores = async () => {
    try {
      const { data, error } = await supabase
        .from('vendedores')
        .select('id, nome')
        .eq('status', 'ativo')
        .order('nome');

      if (error) throw error;
      setVendedores(data || []);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    } finally {
      setLoading(false);
    }
  };

  const options: SearchableSelectOption[] = vendedores.map((vendedor) => ({
    value: vendedor.id,
    label: vendedor.nome,
  }));

  return (
    <SearchableSelect
      value={value}
      onValueChange={onChange}
      options={options}
      placeholder={loading ? "Carregando..." : "Selecione um vendedor"}
      searchPlaceholder="Buscar vendedor..."
      emptyMessage="Nenhum vendedor encontrado."
      disabled={disabled || loading}
    />
  );
}
