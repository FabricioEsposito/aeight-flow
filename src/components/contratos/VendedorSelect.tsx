import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';

interface VendedorSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function VendedorSelect({ value, onChange, disabled }: VendedorSelectProps) {
  // Lista hardcoded de vendedores - pode ser substituída por dados do banco futuramente
  const vendedores = [
    { id: 'vendedor1', nome: 'João Silva' },
    { id: 'vendedor2', nome: 'Maria Santos' },
    { id: 'vendedor3', nome: 'Pedro Oliveira' },
    { id: 'vendedor4', nome: 'Ana Costa' },
  ];

  const options: SearchableSelectOption[] = vendedores.map((vendedor) => ({
    value: vendedor.id,
    label: vendedor.nome,
  }));

  return (
    <SearchableSelect
      value={value}
      onValueChange={onChange}
      options={options}
      placeholder="Selecione um vendedor"
      searchPlaceholder="Buscar vendedor..."
      emptyMessage="Nenhum vendedor encontrado."
      disabled={disabled}
    />
  );
}
