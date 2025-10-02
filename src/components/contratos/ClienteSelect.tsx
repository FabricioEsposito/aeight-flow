import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || loading}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? "Carregando..." : "Selecione um cliente"} />
      </SelectTrigger>
      <SelectContent>
        {clientes.map((cliente) => (
          <SelectItem key={cliente.id} value={cliente.id}>
            {cliente.razao_social} - {cliente.cnpj_cpf}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
