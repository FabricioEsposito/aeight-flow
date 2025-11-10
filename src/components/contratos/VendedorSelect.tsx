import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione um vendedor" />
      </SelectTrigger>
      <SelectContent>
        {vendedores.map((vendedor) => (
          <SelectItem key={vendedor.id} value={vendedor.id}>
            {vendedor.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
