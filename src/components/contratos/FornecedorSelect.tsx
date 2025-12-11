import { useEffect, useState } from 'react';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { supabase } from '@/integrations/supabase/client';

interface Fornecedor {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj_cpf: string;
}

interface FornecedorSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function FornecedorSelect({ value, onChange, disabled }: FornecedorSelectProps) {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFornecedores();
  }, []);

  const fetchFornecedores = async () => {
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, razao_social, nome_fantasia, cnpj_cpf')
        .eq('status', 'ativo')
        .order('razao_social');

      if (error) throw error;
      setFornecedores(data || []);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
    } finally {
      setLoading(false);
    }
  };

  const options: SearchableSelectOption[] = fornecedores.map((fornecedor) => ({
    value: fornecedor.id,
    label: fornecedor.nome_fantasia 
      ? `${fornecedor.nome_fantasia} - ${fornecedor.cnpj_cpf}`
      : `${fornecedor.razao_social} - ${fornecedor.cnpj_cpf}`,
  }));

  return (
    <SearchableSelect
      value={value}
      onValueChange={onChange}
      options={options}
      placeholder={loading ? "Carregando..." : "Selecione um fornecedor"}
      searchPlaceholder="Buscar fornecedor..."
      emptyMessage="Nenhum fornecedor encontrado."
      disabled={disabled || loading}
    />
  );
}
