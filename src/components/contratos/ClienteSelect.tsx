import { useEffect, useState } from 'react';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ClienteForm } from '@/components/clientes/ClienteForm';

interface Cliente {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj_cpf: string;
}

interface ClienteSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  allowCreate?: boolean;
}

export function ClienteSelect({ value, onChange, disabled, allowCreate }: ClienteSelectProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, razao_social, nome_fantasia, cnpj_cpf')
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
    label: cliente.nome_fantasia 
      ? `${cliente.nome_fantasia} - ${cliente.cnpj_cpf}`
      : `${cliente.razao_social} - ${cliente.cnpj_cpf}`,
  }));

  const handleCreated = async (createdId?: string) => {
    setCreateOpen(false);
    await fetchClientes();
    if (createdId) {
      onChange(createdId);
    }
  };

  if (!allowCreate) {
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

  return (
    <>
      <div className="flex gap-2">
        <div className="flex-1">
          <SearchableSelect
            value={value}
            onValueChange={onChange}
            options={options}
            placeholder={loading ? "Carregando..." : "Selecione um cliente"}
            searchPlaceholder="Buscar cliente..."
            emptyMessage="Nenhum cliente encontrado."
            disabled={disabled || loading}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setCreateOpen(true)}
          disabled={disabled}
          title="Cadastrar novo cliente"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden p-0">
          <ClienteForm
            onClose={() => setCreateOpen(false)}
            onSuccess={handleCreated}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
