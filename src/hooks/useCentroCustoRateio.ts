import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CentroCustoRateioItem {
  codigo: string;
  descricao: string;
  percentual: number;
  centro_custo_id: string;
}

/**
 * Hook that fetches cost center allocation data for financial entries
 * linked to contracts via parcela_id -> contrato_id -> contratos_centros_custo.
 * Returns a map: parcela_id -> CentroCustoRateioItem[]
 */
export function useCentroCustoRateio(parcelaIds: (string | null | undefined)[]) {
  const [rateioMap, setRateioMap] = useState<Map<string, CentroCustoRateioItem[]>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const validIds = parcelaIds.filter((id): id is string => !!id);
    if (validIds.length === 0) {
      setRateioMap(new Map());
      return;
    }

    const fetchRateio = async () => {
      setLoading(true);
      try {
        // Step 1: Get contrato_id for each parcela_id
        const { data: parcelas } = await supabase
          .from('parcelas_contrato')
          .select('id, contrato_id')
          .in('id', validIds);

        if (!parcelas || parcelas.length === 0) {
          setRateioMap(new Map());
          return;
        }

        // Step 2: Get unique contrato_ids
        const contratoIds = [...new Set(parcelas.map(p => p.contrato_id).filter(Boolean))] as string[];
        
        if (contratoIds.length === 0) {
          setRateioMap(new Map());
          return;
        }

        // Step 3: Fetch contratos_centros_custo with centro_custo details
        const { data: rateios } = await supabase
          .from('contratos_centros_custo')
          .select('contrato_id, centro_custo_id, percentual, centros_custo:centro_custo_id(id, codigo, descricao)')
          .in('contrato_id', contratoIds);

        if (!rateios || rateios.length === 0) {
          setRateioMap(new Map());
          return;
        }

        // Step 4: Build contrato_id -> rateio items map
        const contratoRateioMap = new Map<string, CentroCustoRateioItem[]>();
        for (const r of rateios) {
          const cc = r.centros_custo as any;
          if (!cc) continue;
          
          const item: CentroCustoRateioItem = {
            codigo: cc.codigo,
            descricao: cc.descricao,
            percentual: r.percentual,
            centro_custo_id: r.centro_custo_id,
          };

          const existing = contratoRateioMap.get(r.contrato_id) || [];
          existing.push(item);
          contratoRateioMap.set(r.contrato_id, existing);
        }

        // Step 5: Build parcela_id -> rateio items map
        const result = new Map<string, CentroCustoRateioItem[]>();
        for (const parcela of parcelas) {
          if (parcela.contrato_id && contratoRateioMap.has(parcela.contrato_id)) {
            result.set(parcela.id, contratoRateioMap.get(parcela.contrato_id)!);
          }
        }

        setRateioMap(result);
      } catch (error) {
        console.error('Erro ao buscar rateio de centros de custo:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRateio();
  }, [JSON.stringify(parcelaIds.filter(Boolean).sort())]);

  return { rateioMap, loading };
}
