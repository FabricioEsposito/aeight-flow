import { useEffect, useState } from 'react';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FornecedorForm } from '@/components/fornecedores/FornecedorForm';

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
  allowCreate?: boolean;
}

export function FornecedorSelect({ value, onChange, disabled, allowCreate }: FornecedorSelectProps) {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

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

  const handleCreated = async (createdId?: string) => {
    setCreateOpen(false);
    await fetchFornecedores();
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
        placeholder={loading ? "Carregando..." : "Selecione um fornecedor"}
        searchPlaceholder="Buscar fornecedor..."
        emptyMessage="Nenhum fornecedor encontrado."
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
            placeholder={loading ? "Carregando..." : "Selecione um fornecedor"}
            searchPlaceholder="Buscar fornecedor..."
            emptyMessage="Nenhum fornecedor encontrado."
            disabled={disabled || loading}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setCreateOpen(true)}
          disabled={disabled}
          title="Cadastrar novo fornecedor"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden p-0">
          <FornecedorForm
            onClose={() => setCreateOpen(false)}
            onSuccess={handleCreated}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
