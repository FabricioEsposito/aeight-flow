import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface Fornecedor {
  id: string;
  razao_social: string;
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
        .select('id, razao_social, cnpj_cpf')
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

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || loading}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? "Carregando..." : "Selecione um fornecedor"} />
      </SelectTrigger>
      <SelectContent>
        {fornecedores.map((fornecedor) => (
          <SelectItem key={fornecedor.id} value={fornecedor.id}>
            {fornecedor.razao_social} - {fornecedor.cnpj_cpf}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
