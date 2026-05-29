import { useState, useEffect } from 'react';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { supabase } from '@/integrations/supabase/client';

interface Parceiro {
  id: string;
  nome: string;
  percentual_comissao: number | null;
}

interface ParceiroSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ParceiroSelect({ value, onChange, disabled }: ParceiroSelectProps) {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const sb: any = supabase;
        const { data, error } = await sb
          .from('vendedores')
          .select('id, nome, percentual_comissao')
          .eq('status', 'ativo')
          .eq('is_merged', false)
          .eq('tipo', 'parceiro')
          .order('nome');
        if (error) throw error;
        setParceiros(data || []);
      } catch (e) {
        console.error('Erro ao carregar parceiros:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const options: SearchableSelectOption[] = [
    { value: '__none__', label: 'Sem parceiro' },
    ...parceiros.map((p) => ({
      value: p.id,
      label: `${p.nome}${p.percentual_comissao ? ` — ${p.percentual_comissao}%` : ''}`,
    })),
  ];

  return (
    <SearchableSelect
      value={value || '__none__'}
      onValueChange={(v) => onChange(v === '__none__' ? '' : v)}
      options={options}
      placeholder={loading ? 'Carregando...' : 'Selecione um parceiro'}
      searchPlaceholder="Buscar parceiro..."
      emptyMessage="Nenhum parceiro cadastrado."
      disabled={disabled || loading}
    />
  );
}
