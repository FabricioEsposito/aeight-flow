import { useState, useEffect } from 'react';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { supabase } from '@/integrations/supabase/client';

interface Vendedor {
  id: string;
  nome: string;
  centro_custo?: string | null;
}

interface VendedorSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /**
   * When provided, restricts the list to vendedores linked to this centro de custo.
   * Helps avoid selecting homonyms across different cost centers.
   */
  centroCustoId?: string;
}

export function VendedorSelect({ value, onChange, disabled, centroCustoId }: VendedorSelectProps) {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [centrosCusto, setCentrosCusto] = useState<Array<{ id: string; codigo: string; descricao: string }>>([]);

  useEffect(() => {
    fetchVendedores();
  }, [centroCustoId]);

  const fetchVendedores = async () => {
    try {
      const [vendedoresRes, centrosRes] = await Promise.all([
        (() => {
          let q = supabase
            .from('vendedores')
            .select('id, nome, centro_custo')
            .eq('status', 'ativo')
            .order('nome');

          if (centroCustoId) {
            q = q.eq('centro_custo', centroCustoId);
          }

          return q;
        })(),
        supabase
          .from('centros_custo')
          .select('id, codigo, descricao')
          .eq('status', 'ativo')
          .order('codigo'),
      ]);

      if (vendedoresRes.error) throw vendedoresRes.error;
      if (centrosRes.error) throw centrosRes.error;

      setVendedores(vendedoresRes.data || []);
      setCentrosCusto(centrosRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    } finally {
      setLoading(false);
    }
  };

  const centrosMap = new Map(centrosCusto.map((cc) => [cc.id, `${cc.codigo} - ${cc.descricao}`] as const));

  const options: SearchableSelectOption[] = vendedores.map((vendedor) => {
    const ccLabel = vendedor.centro_custo ? centrosMap.get(vendedor.centro_custo) : null;
    return {
      value: vendedor.id,
      label: ccLabel ? `${vendedor.nome} — ${ccLabel}` : `${vendedor.nome} — Sem centro de custo`,
    };
  });

  return (
    <SearchableSelect
      value={value}
      onValueChange={onChange}
      options={options}
      placeholder={loading ? "Carregando..." : "Selecione um vendedor"}
      searchPlaceholder="Buscar vendedor..."
      emptyMessage="Nenhum vendedor encontrado."
      disabled={disabled || loading}
    />
  );
}
