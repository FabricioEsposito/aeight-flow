import { useEffect, useState } from 'react';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { supabase } from '@/integrations/supabase/client';

interface Cliente {
  id: string;
  razao_social: string;
  cnpj_cpf: string;
}

interface ClienteSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ClienteSelect({ value, onChange, disabled }: ClienteSelectProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, razao_social, cnpj_cpf')
        .eq('status', 'ativo')
        .order('razao_social');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const options: SearchableSelectOption[] = clientes.map((cliente) => ({
    value: cliente.id,
    label: `${cliente.razao_social} - ${cliente.cnpj_cpf}`,
  }));

  return (
    <SearchableSelect
      value={value}
      onValueChange={onChange}
      options={options}
      placeholder={loading ? "Carregando..." : "Selecione um cliente"}
      searchPlaceholder="Buscar cliente..."
      emptyMessage="Nenhum cliente encontrado."
      disabled={disabled || loading}
    />
  );
}
