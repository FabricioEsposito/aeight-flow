import { useState, useEffect } from 'react';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { supabase } from '@/integrations/supabase/client';

interface Vendedor {
  id: string;
  nome: string;
  centro_custo?: string | null; // legado
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
      const sb: any = supabase;

      const centrosRes = await sb
        .from('centros_custo')
        .select('id, codigo, descricao')
        .eq('status', 'ativo')
        .order('codigo');

      if (centrosRes.error) throw centrosRes.error;

      // Novo modelo: vendedores_centros_custo define os vendedores permitidos por centro.
      // Fallback legado: se não houver centroCustoId, lista todos os vendedores ativos.
      let vendedoresRes: { data: Vendedor[] | null; error: any };

      if (centroCustoId) {
        const linksRes = await sb
          .from('vendedores_centros_custo')
          .select('vendedor_id')
          .eq('centro_custo_id', centroCustoId);

        if (linksRes.error) throw linksRes.error;
        const ids: string[] = Array.from(
          new Set<string>((linksRes.data || []).map((l: any) => String(l.vendedor_id)))
        ).filter((v) => !!v);

        if (ids.length === 0) {
          vendedoresRes = { data: [], error: null } as any;
        } else {
          vendedoresRes = await sb
            .from('vendedores')
            .select('id, nome, centro_custo')
            .eq('status', 'ativo')
            .eq('is_merged', false)
            .in('id', ids)
            .order('nome');
        }
      } else {
        vendedoresRes = await sb
          .from('vendedores')
          .select('id, nome, centro_custo')
          .eq('status', 'ativo')
          .eq('is_merged', false)
          .order('nome');
      }

      if (vendedoresRes.error) throw vendedoresRes.error;

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
    // Preferimos exibir o centro do contrato (centroCustoId) quando aplicável,
    // pois o vendedor pode atuar em múltiplos centros no novo modelo.
    const ccLabel = centroCustoId
      ? centrosMap.get(centroCustoId)
      : vendedor.centro_custo
        ? centrosMap.get(vendedor.centro_custo)
        : null;
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
