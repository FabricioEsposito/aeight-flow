import { useEffect, useState } from 'react';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { supabase } from '@/integrations/supabase/client';

interface ContaBancaria {
  id: string;
  descricao: string;
  banco: string;
}

interface ContaBancariaSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  showAllOption?: boolean;
  showNoneOption?: boolean;
  disabled?: boolean;
}

export function ContaBancariaSelect({ 
  value, 
  onValueChange, 
  placeholder = "Selecione a conta bancária",
  showAllOption = false,
  showNoneOption = false,
  disabled = false
}: ContaBancariaSelectProps) {
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContasBancarias();
  }, []);

  const fetchContasBancarias = async () => {
    try {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('id, descricao, banco')
        .eq('status', 'ativo')
        .order('descricao');

      if (error) throw error;
      setContasBancarias(data || []);
    } catch (error) {
      console.error('Erro ao buscar contas bancárias:', error);
    } finally {
      setLoading(false);
    }
  };

  const options: SearchableSelectOption[] = [
    ...(showAllOption ? [{ value: "todas", label: "Todas as contas" }] : []),
    ...(showNoneOption ? [{ value: "none", label: "Nenhuma" }] : []),
    ...contasBancarias.map((conta) => ({
      value: conta.id,
      label: conta.descricao,
    })),
  ];

  return (
    <SearchableSelect
      value={value}
      onValueChange={onValueChange}
      options={options}
      placeholder={loading ? "Carregando..." : placeholder}
      searchPlaceholder="Buscar conta bancária..."
      emptyMessage="Nenhuma conta bancária encontrada."
      disabled={disabled || loading}
    />
  );
}
